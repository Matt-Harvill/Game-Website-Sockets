import { useContext, useState } from "react";
import AppContext from "./AppContext";
import "../styles/Navbar.css";
import { socket } from "../socket";

const defaultColor = "#14FFEC";
const hoverColor = "white";

export default function Navbar() {
  const { setNewPage, auth, userObj } = useContext(AppContext);
  const [gamesLinkColor, setGamesLinkColor] = useState(defaultColor);
  const [coupLinkColor, setCoupLinkColor] = useState(defaultColor);
  const [splendorLinkColor, setSplendorLinkColor] = useState(defaultColor);

  const logout = async () => {
    const response = await fetch("/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (response.status !== 200) {
      alert("Failed to logout");
    }
  };

  const leaveGame = () => {
    socket.emit(userObj.gameTitle, "leaveGame");
  };

  return (
    <div className="appNavbar">
      {auth === "no auth" && <span>Matthew's Game Website</span>}

      {auth === "auth" && (
        <span
          style={{ cursor: "pointer", color: gamesLinkColor }}
          onClick={() => {
            setNewPage("games");
          }}
          onMouseEnter={() => setGamesLinkColor(hoverColor)}
          onMouseLeave={() => setGamesLinkColor(defaultColor)}
        >
          Games
        </span>
      )}

      <div style={{ flex: 1 }}></div>

      {/* {auth === "auth" && (
        <span
          style={{ cursor: "pointer", color: coupLinkColor }}
          onClick={() => {
            setNewPage("coup");
          }}
          onMouseEnter={() => setCoupLinkColor(hoverColor)}
          onMouseLeave={() => setCoupLinkColor(defaultColor)}
        >
          Coup
        </span>
      )}

      {auth === "auth" && (
        <span
          style={{ cursor: "pointer", color: splendorLinkColor }}
          onClick={() => {
            setNewPage("splendor");
          }}
          onMouseEnter={() => setSplendorLinkColor(hoverColor)}
          onMouseLeave={() => setSplendorLinkColor(defaultColor)}
        >
          Splendor
        </span>
      )} */}

      {userObj.gameStatus === "in progress" && (
        <button onClick={leaveGame} style={{ backgroundColor: defaultColor }}>
          Leave Game
        </button>
      )}

      {auth === "auth" && <button onClick={logout}>Logout</button>}
    </div>
  );
}
