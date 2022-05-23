import { useContext, useEffect, useState } from "react";
import { socket } from "../socket";
import AppContext from "./AppContext";
import CoupActionButton from "./CoupActionButton";
import CoupExchangeButton from "./CoupExchangeButton";
import CoupGameContext from "./CoupGameContext";
import TimeLeft from "./TimeLeft";

export default function CoupActionbar() {
  // turn: {
  //   player: String,
  //   action: String,
  //   attacking: String,
  //   actionSuccess: null,
  //   timeRemMS: String,
  //   interval: (),
  //   stage: String, // Turn can be preCallout, callout, postCallout
  //   target: {
  //       target: String,
  //       action: String,
  //       attacking: String
  //   },
  //   roleSwitch: {
  //     losing: {
  //        player: null,
  //        role: null
  //     },
  //     switching: {
  //        player: null,
  //        role: null
  //     }
  //   },
  //   exchangeRoles: [],
  //   deciding: [],
  // },

  const { turn, game } = useContext(CoupGameContext);
  const { userObj } = useContext(AppContext);
  const [maxTimeRem, setMaxTimeRem] = useState(60000);
  const timeRem = turn.timeRemMS;

  useEffect(() => {
    switch (turn.stage) {
      case "block":
      case "callout":
      case "roleSwitch":
        setMaxTimeRem(30000);
        break;
      case "preCallout":
      case "postCallout":
        setMaxTimeRem(60000);
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

  const getStealablePlayers = () => {
    if (game.players) {
      return game.players.filter((player) => {
        const [pStat] = game.pStats.filter((pStat) => pStat.player === player);
        return player !== userObj.username && pStat.coins > 0;
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
    const stealablePlayers = getStealablePlayers();
    const roleNames = ["Ambassador", "Assassin", "Captain", "Contessa", "Duke"];

    const calloutButtonInfos = [
      {
        title: "Pass",
        onClick: action,
        onClickArgs: ["noCallout"],
      },
    ];

    // If there is a target, allow user to call them out
    if (turn.target) {
      // Make Call out button for the target
      const turnTarget = turn.target;
      let title;
      switch (turnTarget.action) {
        case "foreignAid": // Foreign Aid is blocked by Duke, so it is also calling out a Duke
        case "tax":
          title = `Call Out ${turnTarget.target}'s 'Duke'`;
          break;
        case "exchange":
          title = `Call Out ${turnTarget.target}'s Ambassador`;
          break;
        case "steal":
          title = `Call Out ${turnTarget.target}'s Captain`;
          break;
        case "blockSteal":
          title = `Call Out ${turnTarget.target}'s ${turnTarget.blockingRole}`;
          break;
        default:
          break;
      }

      const calloutButtonInfo = {
        title: title,
        onClick: action,
        onClickArgs: ["callout", turnTarget.target],
      };

      // Add new buttonInfo to calloutButtonInfos
      calloutButtonInfos.push(calloutButtonInfo);

      if (
        turnTarget.action === "steal" &&
        turnTarget.attacking === userObj.username
      ) {
        calloutButtonInfos.push({
          title: `Block ${turn.player}'s Steal With:`,
          roles: ["Ambassador", "Captain"],
          onClick: action,
          onClickArgs: ["block", "steal", "role"],
        });
      }
    } else {
      // If the action if foreignAid but no turnTargets, display block capability
      if (turn.action === "foreignAid") {
        const calloutButtonInfo = {
          title: `Block ${turn.player}'s Foreign Aid`,
          onClick: action,
          onClickArgs: ["block", "foreignAid"],
        };

        // Add new buttonInfo to calloutButtonInfos
        calloutButtonInfos.push(calloutButtonInfo);
      }
    }

    const regularButtonInfos = [
      {
        title: "Income",
        onClick: action,
        onClickArgs: ["income"],
      },
      {
        title: "Foreign Aid",
        onClick: action,
        onClickArgs: ["foreignAid"],
      },
      {
        title: "Tax",
        onClick: action,
        onClickArgs: ["tax"],
      },
      {
        title: "Exchange",
        onClick: action,
        onClickArgs: ["exchange"],
      },
      // {
      //   title: "Assassinate~",
      //   selectionArgs: otherPlayers,
      //   onClick: null,
      //   onClickArgs: null,
      // },
    ];

    const stealButtonInfo = {
      title: "Steal (up to 2 coins) From",
      targets: stealablePlayers,
      onClick: action,
      onClickArgs: ["steal", "target"],
    };

    const coupButtonInfo = {
      title: "Coup ",
      secondText: "For ",
      targets: otherPlayers,
      roles: roleNames,
      onClick: action,
      onClickArgs: ["coupAction", "target", "role"],
    };

    let losingRoleButtonInfos = [];
    if (game.pStats) {
      const pStat = game.pStats.find((pStat) => {
        return pStat.player === userObj.username;
      });
      if (pStat) {
        for (const role of pStat.roles) {
          losingRoleButtonInfos.push({
            title: `Lose ${role}`,
            onClick: action,
            onClickArgs: ["loseRole", role],
          });
        }
      }
    }

    let exchangeButtonInfo;
    if (turn.exchangeRoles) {
      if (game.pStats) {
        const pStat = game.pStats.find((pStat) => {
          return pStat.player === userObj.username;
        });
        if (pStat) {
          const numRoles = pStat.roles.length;

          const playerRolesText = numRoles === 1 ? "Your Role" : "Your Roles";

          exchangeButtonInfo = {
            exchangeButton: true,
            playerRolesText: playerRolesText,
            playerRoles: pStat.roles,
            newRolesText: "New Roles",
            newRoles: turn.exchangeRoles,
            onClick: action,
            onClickArgs: ["exchangeRoles"],
          };
        }
      }
    }

    let buttonInfos = [];

    switch (turn.stage) {
      case "block":
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
        // Get the player's pStat
        const pStat = game.pStats.find(
          (pStat) => pStat.player === userObj.username
        );
        // If the player has roles, check them to see if they need to chose a role to lose
        if (pStat && pStat.roles) {
          const roleSwitch = turn.roleSwitch;
          const playerRoles = pStat.roles;
          if (
            roleSwitch.losing &&
            roleSwitch.losing.player === userObj.username &&
            roleSwitch.losing.numRoles < playerRoles.length
            // && playerRoles.length === 2 &&
            // playerRoles[0] !== playerRoles[1]
          ) {
            // If the same role, don't automatically lose anymore, but just show one button
            if (playerRoles.length === 2 && playerRoles[0] === playerRoles[1]) {
              buttonInfos.push(losingRoleButtonInfos[0]);
            } else {
              buttonInfos = losingRoleButtonInfos;
            }
          }
        }

        break;
      case "preCallout":
        // If  preCallout period, check if active player is this user
        if (turn.player === userObj.username) {
          if (game.pStats) {
            const pStat = game.pStats.find((pStat) => {
              return pStat.player === userObj.username;
            });
            if (stealablePlayers && stealablePlayers.length > 0) {
              regularButtonInfos.push(stealButtonInfo);
            }
            if (pStat.coins < 10) {
              buttonInfos = regularButtonInfos;
            }
            if (pStat.coins >= 7) {
              buttonInfos.push(coupButtonInfo);
            }
          }
        } else {
          return;
        }
        break;
      case "postCallout":
        if (turn.player === userObj.username && exchangeButtonInfo) {
          buttonInfos = [exchangeButtonInfo];
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
    if (buttonInfo.exchangeButton) {
      return (
        <CoupExchangeButton
          playerRolesText={buttonInfo.playerRolesText}
          playerRoles={buttonInfo.playerRoles}
          newRolesText={buttonInfo.newRolesText}
          newRoles={buttonInfo.newRoles}
          onClick={buttonInfo.onClick}
          onClickArgs={buttonInfo.onClickArgs}
        />
      );
    } else {
      return (
        <CoupActionButton
          title={buttonInfo.title}
          secondText={buttonInfo.secondText}
          targets={buttonInfo.targets}
          roles={buttonInfo.roles}
          onClick={buttonInfo.onClick}
          onClickArgs={buttonInfo.onClickArgs}
        />
      );
    }
  };

  const displayUnavailRoles = () => {
    const unavailRoles = game.unavailRoles;

    let roleHasBeenLost = false;
    if (unavailRoles) {
      // Key is the role name, value is the number of them
      for (const [key, value] of Object.entries(unavailRoles)) {
        if (value > 0) {
          roleHasBeenLost = true;
          break;
        }
      }
    }

    if (roleHasBeenLost) {
      let unavailRoleStrings = [];

      // Key is the role name, value is the number of them
      for (const [key, value] of Object.entries(unavailRoles)) {
        if (value === 1) {
          unavailRoleStrings.push(key);
        } else if (value > 1) {
          unavailRoleStrings.push(`${key} (${value})`);
        }
      }

      return (
        <div
          style={{ backgroundColor: "white", padding: 10, textAlign: "center" }}
        >
          <h5>Roles Out of Play</h5>
          <p>{unavailRoleStrings.join(", ")}</p>
        </div>
      );
    } else {
      // Return empty div to take the grid space
      return <div></div>;
    }
  };

  const displayTurnTitle = () => {
    let textToDisplay;

    switch (turn.stage) {
      case "preCallout":
        if (turn.player === userObj.username) {
          textToDisplay = "Make Your Move";
        } else {
          textToDisplay = `${turn.player} is Making their Move...`;
        }
        break;
      case "postCallout":
        if (turn.player === userObj.username) {
          if (turn.exchangeRoles) {
            textToDisplay = "Make Your Move";
          } else {
            textToDisplay = "Committing Exchange...";
          }
        } else {
          textToDisplay = `${turn.player} is Exchanging...`;
        }
        break;
      case "block":
      case "callout":
        let stageString;
        if (turn.action === "foreignAid" && !turn.target) {
          stageString = "Block";
        } else {
          stageString = "Callout";
        }
        if (turn.deciding.includes(userObj.username)) {
          textToDisplay = `Pass or ${stageString}`;
        } else {
          if (!turn.deciding || (turn.deciding && turn.deciding.length === 0)) {
            textToDisplay = `Finishing up ${stageString}...`;
          } else {
            const deciding = turn.deciding.join(", ");
            textToDisplay = `Waiting for ${deciding} to ${stageString}...`;
          }
        }
        break;
      case "roleSwitch":
        const roleSwitch = turn.roleSwitch;
        if (
          roleSwitch.losing &&
          roleSwitch.losing.player === userObj.username
        ) {
          textToDisplay = "Losing a Role";
        } else if (
          roleSwitch.switching &&
          roleSwitch.switching.player === userObj.username
        ) {
          textToDisplay = "Switching a Role";
        } else {
          if (roleSwitch.losing && roleSwitch.switching) {
            textToDisplay = `Waiting for ${roleSwitch.losing.player} to Lose their Role and ${roleSwitch.switching.player} to Switch their Role`;
          } else if (roleSwitch.losing) {
            textToDisplay = `Waiting for ${roleSwitch.losing.player} to Lose their Role`;
          } else if (roleSwitch.switching) {
            textToDisplay = `Waiting for ${roleSwitch.switching.player} to Switch their Role`;
          } else {
            textToDisplay = "Finishing up Role Losing/Switching...";
          }
        }
        break;
      default:
        break;
    }

    return <h4 style={{ textAlign: "center" }}>{textToDisplay}</h4>;
  };

  const displayIsSpectator = () => {
    if (game && game.outPlayers && game.outPlayers.includes(userObj.username)) {
      return (
        <div
          style={{ backgroundColor: "white", padding: 10, textAlign: "center" }}
        >
          <h5>You Are Spectating</h5>
        </div>
      );
    }
  };

  if (game.winner) {
    let name;
    if (userObj.username === game.winner) {
      name = "You";
    } else {
      name = game.winner;
    }

    return (
      <div
        style={{
          minHeight: 100,
          width: "100%",
          backgroundColor: "#c4c4c4",
          padding: 10,
          display: "grid",
          gridTemplateColumns: "1fr 2fr 1fr",
        }}
      >
        <div></div>
        <h4 style={{ textAlign: "center" }}>{`${name} Won!`}</h4>
      </div>
    );
  } else {
    return (
      <div
        style={{
          minHeight: 100,
          width: "100%",
          backgroundColor: "#c4c4c4",
          padding: 10,
          display: "grid",
          gridTemplateColumns: "1fr 2fr 1fr",
        }}
      >
        {displayUnavailRoles()}
        <div style={{ marginLeft: 20, marginRight: 20 }}>
          {displayTurnTitle()}
          <div style={{ height: 10 }}></div>
          {displayButtons()}
          <div style={{ height: 10 }}></div>
          {turn !== {} && (
            <TimeLeft timeLeft={timeRem} maxTimeLeft={maxTimeRem} />
          )}
        </div>
        {displayIsSpectator()}
      </div>
    );
  }
}
