import mongoose from "mongoose";
import passportLocalMongoose from "passport-local-mongoose";

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  gameTitle: {
    type: String,
    default: "",
  },
  gameID: {
    type: String,
    default: "",
  },
  gameStatus: {
    type: String,
    default: "",
  },
  pStat: {
    player: String,
    coins: Number,
    roles: [String],
  },
});

const coupGameSchema = new mongoose.Schema({
  gameTitle: String,
  gameID: String,
  founder: String,
  status: String, // 'forming', 'in progress', 'completed'
  privacy: String, // 'public', 'private'
  maxPlayers: Number,
  players: [String],
  pStats: [
    {
      player: String,
      coins: Number,
      roles: [String],
    },
  ], // { player: "", coins: 2, roles: ["",""] }
  callout: {
    status: String, // "active, inactive"
    targets: [
      {
        target: String,
        claimedRole: String,
      },
    ],
  },
  availRoles: [],
  winner: String,
});

userSchema.plugin(passportLocalMongoose);
const User = new mongoose.model("User", userSchema);
const CoupGame = new mongoose.model("CoupGame", coupGameSchema, "games");

export { User, CoupGame };
