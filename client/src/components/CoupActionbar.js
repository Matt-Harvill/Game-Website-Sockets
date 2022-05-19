import { useContext, useEffect, useState } from "react";
import { socket } from "../socket";
import AppContext from "./AppContext";
import CoupActionButton from "./CoupActionButton";
import CoupGameContext from "./CoupGameContext";
import TimeLeft from "./TimeLeft";

export default function CoupActionbar() {
  // turn: {
  //   player: String,
  //   action: String,
  //   timeRemMS: String,
  //   interval: (),
  //   stage: String, // Turn can be preCallout, callout, postCallout
  //   targets: [
  //     {
  //       target: String,
  //       action: String,
  //       attacking: String
  //     },
  //   ],
<<<<<<< HEAD
  //   losingRole: String,
=======
  //   roleSwitch: {
  //     losing: null,
  //     switching: null
  //   }
>>>>>>> noCallout
  //   deciding: [],
  // },

  const { turn, game } = useContext(CoupGameContext);
  const { userObj } = useContext(AppContext);
  const [maxTimeRem, setMaxTimeRem] = useState(30000);
  const timeRem = turn.timeRemMS;

  useEffect(() => {
    switch (turn.stage) {
      case "callout":
      case "roleSwitch":
        setMaxTimeRem(15000);
        break;
      case "preCallout":
      case "postCallout":
        setMaxTimeRem(30000);
        break;
      default:
        break;
    }
  }, [turn.stage]);

  const getOtherPlayers = () => {
    if (game.players) {
      return game.players.filter((player) => {
        return player !== userObj.username;
      });
    } else {
      return null;
    }
  };

  const action = (args) => {
    socket.emit("coup", ...args);
  };

  const displayButtons = () => {
    const otherPlayers = getOtherPlayers();

    const calloutButtonInfos = [
      {
        title: "Pass",
        selectionArgs: null,
        onClick: action,
        onClickArgs: ["noCallout"],
      },
    ];

    if (turn.targets) {
      // Loop through targets to make Call out buttons for each target (or block depending on action)
      for (const turnTarget of turn.targets) {
        let title, onClickArgs;

        switch (turnTarget.action) {
          case "foreignAid":
            title = `Block ${turnTarget.target}'s Foreign Aid`;
            onClickArgs = ["block"];
            break;
          case "tax":
            title = `Call Out ${turnTarget.target}'s 'Duke'`;
            onClickArgs = ["callout", turnTarget.target];
            break;
          default:
            break;
        }

        const calloutButtonInfo = {
          title: title,
          selectionArgs: null,
          onClick: action,
          onClickArgs: onClickArgs,
        };

        // Add new buttonInfo to calloutButtonInfos
        calloutButtonInfos.push(calloutButtonInfo);
      }
    }

    const regularButtonInfos = [
      {
        title: "Income",
        selectionArgs: null,
        onClick: action,
        onClickArgs: ["income"],
      },
      {
        title: "Foreign Aid",
        selectionArgs: null,
        onClick: action,
        onClickArgs: ["foreignAid"],
      },
      {
        title: "Tax",
        selectionArgs: null,
        onClick: action,
        onClickArgs: ["tax"],
      },
      // {
      //   title: "Assassinate~",
      //   selectionArgs: otherPlayers,
      //   onClick: null,
      //   onClickArgs: null,
      // },
      // {
      //   title: "Exchange~",
      //   selectionArgs: null,
      //   onClick: null,
      //   onClickArgs: null,
      // },
      // {
      //   title: "Steal~",
      //   selectionArgs: otherPlayers,
      //   onClick: null,
      //   onClickArgs: null,
      // },
      // {
      //   title: "Coup~",
      //   selectionArgs: otherPlayers,
      //   onClick: null,
      //   onClickArgs: null,
      // },
    ];

    let losingRoleButtonInfos = [];
    if (game.pStats) {
      const pStat = game.pStats.find((pStat) => {
        return pStat.player === userObj.username;
      });
      for (const role of pStat.roles) {
        losingRoleButtonInfos.push({
          title: `*Lose ${role}*`,
          selectionArgs: null,
          onClick: null,
          onClickArgs: ["loseRole"],
        });
      }
    }

    const switchingRoleButtonInfos = [
      {
        title: "*Switch Role*",
        selectionArgs: null,
        onClick: null,
        onClickArgs: ["switchRole"],
      },
    ];

    let buttonInfos;

    switch (turn.stage) {
      case "callout":
        // Don't display callout buttons if user has decided (or is being accused)
        if (!turn.deciding.includes(userObj.username)) {
          return;
        }
        // If user is not being called out, let them call out or pass
        else {
          buttonInfos = calloutButtonInfos;
        }
        break;
      case "roleSwitch":
        const roleSwitch = turn.roleSwitch;
        if (roleSwitch) {
          if (roleSwitch.losing === userObj.username) {
            buttonInfos = losingRoleButtonInfos;
          } else if (roleSwitch.switching === userObj.username) {
            buttonInfos = switchingRoleButtonInfos;
          }
        }
        break;
      case "preCallout":
      case "postCallout":
        // If not pre/postCallout period, check if active player is this user
        if (turn.player === userObj.username) {
          buttonInfos = regularButtonInfos;
        } else {
          return;
        }
        break;
      default:
        break;
    }

    return (
      <div
        style={{
          display: "grid",
          gridGap: 20,
          gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
        }}
      >
        {buttonInfos && buttonInfos.map(makeButton)}
      </div>
    );
  };

  const makeButton = (buttonInfo) => {
    return (
      <CoupActionButton
        title={buttonInfo.title}
        selectionArgs={buttonInfo.selectionArgs}
        onClick={buttonInfo.onClick}
        onClickArgs={buttonInfo.onClickArgs}
      />
    );
  };

  const displayTurnTitle = () => {
    let textToDisplay;

    switch (turn.stage) {
      case "preCallout":
      case "postCallout":
        if (turn.player === userObj.username) {
          textToDisplay = "Make Your Move";
        } else {
          textToDisplay = `${turn.player} is Making their Move...`;
        }
        break;
      case "callout":
        if (turn.deciding.includes(userObj.username)) {
          textToDisplay = "Pass or Callout";
        } else {
          textToDisplay = "Waiting for Others to Callout...";
        }
        break;
      case "roleSwitch":
        const roleSwitch = turn.roleSwitch;
        if (roleSwitch) {
          if (roleSwitch.losing === userObj.username) {
            textToDisplay = "Losing a Role";
          } else if (roleSwitch.switching === userObj.username) {
            textToDisplay = "Switching a Role";
          } else {
            textToDisplay = "Waiting for Others to Lose/Switch Roles...";
          }
        }
        break;
      default:
        break;
    }

    return <h4 style={{ textAlign: "center" }}>{textToDisplay}</h4>;
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
        <div style={{ height: 10 }}></div>
        {displayButtons()}
        <div style={{ height: 10 }}></div>
        {turn !== {} && (
          <TimeLeft timeLeft={timeRem} maxTimeLeft={maxTimeRem} />
        )}
      </div>
    </div>
  );
}
