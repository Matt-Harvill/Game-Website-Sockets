import { useContext, useEffect } from "react";
import { socket } from "../socket";
import AppContext from "./AppContext";

export default function UserObjUpdater() {
  const { setUserObj } = useContext(AppContext);

  // When auth/page changes, update pages (if authed for them)
  useEffect(() => {
    socket.on("updateUserObj", (fullUserObj) => {
      // Only take properties that are necessary
      const userObj = {
        username: fullUserObj.username,
        gameTitle: fullUserObj.gameTitle,
        gameID: fullUserObj.gameID,
        gameStatus: fullUserObj.gameStatus,
        pStat: fullUserObj.pStat,
      };
      setUserObj(userObj);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
