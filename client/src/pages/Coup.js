import { useState, useEffect } from "react";
import CoupCreateGame from "../components/CoupCreateGame";
import { socket } from "../socket";
import unlock from "../images/unlock.png";
import "../styles/Coup.css";
import CoupCreateGameContext from "../components/CoupCreateGameContext";

export default function Coup() {
  const [newChat, setNewChat] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [chats, setChats] = useState([]);

  // Create Game State Details
  const [games, setGames] = useState([]);
  const [privacy, setPrivacy] = useState(unlock);
  const [numPlayers, setNumPlayers] = useState("2");
  const createGameState = {
    games,
    setGames,
    privacy,
    setPrivacy,
    numPlayers,
    setNumPlayers,
  };

  useEffect(() => {
    socket.on("coup online", (users) => {
      setOnlineUsers(users);
    });

    socket.on("coup games", (games) => {
      setGames(games);
    });

    socket.on("coup chat", (user, message) => {
      setChats((oldChats) => [...oldChats, [user, message]]);
    });

    socket.emit("coup addPlayer");
    socket.emit("coup games");

    return () => {
      socket.off("coup online"); // remove coup online listener
      socket.off("coup chat"); // remove chat listener
      socket.off("coup games"); // remove games listener
      socket.emit("coup removePlayer");
    };
  }, []);

  const sendChat = () => {
    socket.emit("coup chat", newChat);
    setNewChat("");
  };

  const displayChats = (chat) => {
    return (
      <p style={{ wordBreak: "break-word" }}>
        <strong>{`${chat[0]}: `}</strong>
        {chat[1]}
      </p>
    );
  };

  const displayPlayers = (player) => {
    return (
      <p
        style={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        <strong>{player}</strong>
      </p>
    );
  };

  const displayGames = (game) => {
    return (
      <p style={{ wordBreak: "break-word" }}>
        <strong>{`${game.founder}'s game, privacy: ${game.privacy}`}</strong>
      </p>
    );
  };

  const handleChange = (e) => {
    setNewChat(e.target.value);
  };

  return (
    <div className="page">
      <CoupCreateGameContext.Provider value={createGameState}>
        <div className="coupGrid">
          <div className="coupTile">
            <h3>Chats</h3>
            <div readOnly={true} className="coupText">
              {chats.map(displayChats)}
            </div>
            <textarea
              placeholder="Chat..."
              value={newChat}
              onChange={handleChange}
              style={{ width: "100%" }}
            ></textarea>
            <button style={{ width: "100%" }} onClick={sendChat}>
              Submit
            </button>
          </div>

          <div className="coupTile">
            <h3>Online Players</h3>
            <div
              readOnly={true}
              className="coupText"
              style={{
                textAlign: "center",
              }}
            >
              {onlineUsers.map(displayPlayers)}
            </div>
          </div>

          <div className="coupTile">
            <h3>Games</h3>
            <div
              readOnly={true}
              className="coupText"
              style={{
                textAlign: "center",
              }}
            >
              {games.map(displayGames)}
            </div>

            <CoupCreateGame />
          </div>
        </div>
      </CoupCreateGameContext.Provider>
    </div>
  );
}
