import { useContext, useEffect, useState } from "react";
import { socket } from "../socket";
import AppContext from "./AppContext";
import CoupGameContext from "./CoupGameContext";
import TimeLeft from "./TimeLeft";

export default function CoupActionbar() {
  const { turnInfo } = useContext(CoupGameContext);
  const { userObj } = useContext(AppContext);
  const [maxTimeLeft, setMaxTimeLeft] = useState(60);
  const timeLeft = turnInfo.timeLeft;

  useEffect(() => {
    if (turnInfo.inCalloutPeriod) {
      setMaxTimeLeft(30);
    } else {
      setMaxTimeLeft(60);
    }
  }, [turnInfo]);

  const displayButtons = () => {
    if (turnInfo.inCalloutPeriod) {
      // Don't display callout buttons if user is the one being tested
      if (turnInfo.activePlayer === userObj.username) {
        return;
      }
      // If user is not being called out, let them call out or pass
      else {
        return (
          <div
            style={{
              display: "grid",
              gridGap: 20,
              gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
            }}
          >
            <button>Pass</button>
            <button>Call Out</button>
          </div>
        );
      }
    }
    // If not callout period, check if active player is this user
    else if (turnInfo.activePlayer === userObj.username) {
      return (
        <div
          style={{
            display: "grid",
            gridGap: 20,
            gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
          }}
        >
          <button onClick={endTurn}>End Turn</button>
          <button onClick={action}>Action</button>
        </div>
      );
    }
  };

  const endTurn = () => {
    socket.emit("coup", "endTurn");
  };

  const action = () => {
    socket.emit("coup", "action", "defaultAction", "defaultTarget");
  };

  const displayTurnTitle = () => {
    let nameToDisplay;
    if (turnInfo.activePlayer === userObj.username) {
      nameToDisplay = "Your";
    } else {
      nameToDisplay = `${turnInfo.activePlayer}'s`;
    }

    return <h4 style={{ textAlign: "center" }}>{`${nameToDisplay} turn`}</h4>;
  };

  return (
    <div
      style={{
        minHeight: 100,
        width: "100%",
        backgroundColor: "#c4c4c4",
        padding: 10,
      }}
    >
      <div style={{ margin: "auto", width: "50%" }}>
        {displayTurnTitle()}
        <TimeLeft timeLeft={timeLeft} maxTimeLeft={maxTimeLeft} />
        <div style={{ height: 10 }}></div>
        {displayButtons()}
      </div>
    </div>
  );
}
