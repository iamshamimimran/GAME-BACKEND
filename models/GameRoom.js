const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  socketId: String,
  name: String,
  score: {
    type: Number,
    default: 0,
  },
  answered: {
    type: Boolean,
    default: false,
  },
});

const gameRoomSchema = new mongoose.Schema({
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Host",
    required: true,
  },
  mcqSetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Mcq",
  },
  roomCode: String,
  maxPlayers: Number,
  players: [playerSchema],
  isGameStarted: {
    type: Boolean,
    default: false,
  },
  currentQuestionIndex: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("GameRoom", gameRoomSchema);
