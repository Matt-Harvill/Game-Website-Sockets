import { io } from "./index.js";
import { CoupGame } from "./schemas.js";
import * as dbUtils from "./dbUtils.js";
import crypto from "crypto";
import { socketIDMap } from "./index.js";
import * as socketUtils from "./socketUtils.js";

// Set of coup players in lobby
const players = new Set();
// Set of coup games forming in lobby
const formingGames = new Set();

const getFormingGames = async () => {
  const dbGames = await CoupGame.find({ status: "forming" }).exec();

  if (dbGames) {
    dbGames.forEach((game) => {
      formingGames.add(game);
    });
  }
};

getFormingGames();

const addPlayer = (user) => {
  players.add(user);
};

const removePlayer = (user) => {
  players.delete(user);
};

const createGame = async (userObj, privacy, maxPlayers) => {
  // Prevent user from creating multiple games
  const currGameStatus = userObj.gameStatus;
  if (currGameStatus !== "completed" && currGameStatus !== "") {
    // Only create a new game if user's currGame is complete or empty
    return;
  }

  const user = userObj.username;
  const gameTitle = "coup";
  const gameID = crypto.randomBytes(6).toString("hex");
  const pStat = { coins: 2, roles: ["", ""] };

  const pStats = new Map();
  pStats.set(user, pStat);

  const game = new CoupGame({
    gameTitle: gameTitle,
    gameID: gameID,
    founder: user,
    status: "forming", // 'forming', 'in progress', 'complete'
    privacy: privacy, // 'public', 'private'
    maxPlayers: maxPlayers,
    players: [user],
    pStats: pStats,
    availRoles: [
      "AM",
      "AM",
      "AM",
      "AS",
      "AS",
      "AS",
      "CA",
      "CA",
      "CA",
      "CO",
      "CO",
      "CO",
      "D",
      "D",
      "D",
    ],
  });

  const committed = await dbUtils.updateUserAndGame(user, game, "createGame");
  if (committed) {
    // Add game to memory
    formingGames.add(game);
  }
};

const deleteGame = async (userObj) => {
  // Get the game
  const game = await CoupGame.findOne({
    gameID: userObj.gameID,
  }).exec();

  const committed = await dbUtils.updateUserAndGame(
    userObj.username,
    game,
    "deleteGame"
  );
  if (committed) {
    // Delete game from memory
    formingGames.forEach((gameInSet) => {
      if (gameInSet.gameID === game.gameID) {
        formingGames.delete(gameInSet);
      }
    });
  }
};

const joinGame = async (userObj, gameID) => {
  // Get the game
  const game = await CoupGame.findOne({
    gameID: gameID,
  }).exec();

  // If space for a joining player
  if (game.maxPlayers > game.players.length) {
    const user = userObj.username;
    const pStat = { coins: 2, roles: ["", ""] };

    let gameFull = false;
    // If this fills the game, set its status to in progress
    if (game.players.length + 1 === game.maxPlayers) {
      gameFull = true;
    }
    // Update players
    game.players.push(user);
    // Update pStats
    game.pStats.set(user, pStat);
    // Update status
    game.status = gameFull ? "in progress" : game.status;

    const committed = await dbUtils.updateUserAndGame(user, game, "joinGame");
    if (committed) {
      // Update game in memory
      let gameToDelete;
      formingGames.forEach((gameInSet) => {
        if (gameInSet.gameID === game.gameID) {
          gameToDelete = gameInSet;
        }
      });
      if (gameToDelete) {
        formingGames.delete(gameToDelete);
        // Only add game back to list if game is still forming
        if (game.status === "forming") {
          formingGames.add(game);
        }
      }

      if (gameFull) {
        return game;
      }
    }
  }

  return undefined;
};

const leaveGame = async (userObj) => {
  // Get the game
  const game = await CoupGame.findOne({
    gameID: userObj.gameID,
  }).exec();

  const user = userObj.username;

  // If game is empty now, delete the game
  let gameDeleted;
  let committed;
  if (game.players.length === 0) {
    committed = await dbUtils.updateUserAndGame(user, game, "deleteGame");
    gameDeleted = true;
  } else {
    // Otherwise just indicate a player left the game

    // Update players
    game.players = game.players.filter((player) => player !== user);
    // Update pStats
    game.pStats.delete(user);

    committed = await dbUtils.updateUserAndGame(user, game, "leaveGame");
    gameDeleted = false;
  }

  if (committed) {
    // Update game in memory
    let gameToDelete;
    formingGames.forEach((gameInSet) => {
      if (gameInSet.gameID === game.gameID) {
        gameToDelete = gameInSet;
      }
    });
    if (gameToDelete) {
      formingGames.delete(gameToDelete);
      // If game still exists, add the updated version
      if (!gameDeleted) {
        formingGames.add(game);
      }
    }
  }
};

const sendFormingGames = () => {
  io.emit("coup", "formingGames", Array.from(formingGames));
};

const sendOnline = () => {
  io.emit("coup", "online", Array.from(players));
};

const leaveGameHandler = async (socket) => {
  await leaveGame(socket.request.user);
  await socketUtils.updateUserSocketAndClient(socket);
  sendFormingGames();
};

const createGameHandler = async (socket, privacy, maxPlayers) => {
  await createGame(socket.request.user, privacy, maxPlayers);
  await socketUtils.updateUserSocketAndClient(socket);
  sendFormingGames();
};

const deleteGameHandler = async (socket) => {
  await deleteGame(socket.request.user);
  await socketUtils.updateUserSocketAndClient(socket);
  sendFormingGames();
};

const joinGameHandler = async (socket, gameID) => {
  const game = await joinGame(socket.request.user, gameID); // joinGame returns game if it filled
  // If game is filled now:
  if (game !== undefined) {
    // Loop through sockets of players in this game if it filled to update them -> status changed to "in progress"
    const players = game.players;
    for (let i = 0; i < players.length; i++) {
      const userSocketID = socketIDMap[players[i]];
      // If userSocketID is defined (will be undefined if user isn't currently connected)
      if (userSocketID !== undefined) {
        const userSocket = io.sockets.sockets.get(userSocketID);
        await socketUtils.updateUserSocketAndClient(userSocket); // Alert players of updates
      }
    }
  } else {
    // Just update the single player if it didn't fill the game
    await socketUtils.updateUserSocketAndClient(socket);
  }
  sendFormingGames();
};

const chatHandler = (socket, message) => {
  io.emit("coup", "chat", socket.request.user.username, message);
};

const playerOnlineHandler = (socket) => {
  addPlayer(socket.request.user.username);
  sendOnline();
};

const playerOfflineHandler = (socket) => {
  removePlayer(socket.request.user.username);
  sendOnline();
};

export const eventSwitch = async (event, socket, ...args) => {
  switch (event) {
    case "leaveGame":
      leaveGameHandler(socket);
      break;
    case "createGame":
      const privacy = args[0];
      const maxPlayers = args[1];
      createGameHandler(socket, privacy, maxPlayers);
      break;
    case "deleteGame":
      deleteGameHandler(socket);
      break;
    case "joinGame":
      const gameID = args[0];
      joinGameHandler(socket, gameID);
      break;
    case "chat":
      const message = args[0];
      chatHandler(socket, message);
      break;
    case "formingGames":
      sendFormingGames();
      break;
    case "playerOnline":
      playerOnlineHandler(socket);
      break;
    case "playerOffline":
      playerOfflineHandler(socket);
      break;
    default:
      throw "Not a valid 'coup' event";
  }
};