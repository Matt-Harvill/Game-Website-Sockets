import * as dbUtils from "./dbUtils.js";
import { io } from "../index.js";
import gameSwitch from "../gameSwitch.js";

export const socketIDMap = {}; // Keep track of socket ids so they can be deleted
export const allOnlinePlayers = new Map(); // Keep track of all online players

export const getSocket = (username) => {
  const socketID = socketIDMap[username];
  const socket = io.sockets.sockets.get(socketID);
  return socket;
};

// Sends updates to a single client
export const sendUpdatesSingle = async (username, game = undefined) => {
  const socketID = socketIDMap[username];
  // If socketID is defined (will be undefined if user isn't currently connected)
  if (socketID !== undefined) {
    const socket = io.sockets.sockets.get(socketID);
    // If socket doesn't exist, return
    if (!socket) {
      return;
    }
    const userObj = await dbUtils.getUserObj(username);
    socket.request.user = userObj; // Update the socket's user object
    socket.emit("updateUserObj", userObj); // Inform client of update to their userObj
    // If the game to send is passed in, update client with game
    if (game !== undefined && game !== null) {
      const publicGame = await gameSwitch(game.gameTitle).getPublicGame(
        game,
        username
      );
      socket.emit(
        publicGame.gameTitle,
        "updateGame",
        publicGame.gameID,
        publicGame
      );
    }
  }
};
