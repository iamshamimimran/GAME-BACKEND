const GameRoom = require("../models/GameRoom");
const Mcq = require("../models/Mcq");

exports.createGameRoom = async (req, res) => {
  try {
    const { hostId, mcqSetId, maxPlayers } = req.body;

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase(); // e.g. "A1B2C3"

    const mcqSet = await Mcq.findById(mcqSetId);
    if (!mcqSet) {
      return res.status(404).json({ error: "MCQ set not found" });
    }

    const gameRoom = await GameRoom.create({
      hostId,
      mcqSetId,
      maxPlayers,
      roomCode,
      players: [],
    });

    res.status(201).json({ message: "Game room created", room: gameRoom });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.joinGameRoom = async (req, res) => {
  try {
    const { name, roomCode } = req.body;

    if (!name || !roomCode) {
      return res.status(400).json({ error: "Name and room code are required" });
    }

    const room = await GameRoom.findOne({ roomCode });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (room.isGameStarted) {
      return res.status(403).json({ error: "Game already started" });
    }

    if (room.players.length >= room.maxPlayers) {
      return res.status(403).json({ error: "Room is full" });
    }

    const existingPlayer = room.players.find((p) => p.name === name);
    if (!existingPlayer) {
      room.players.push({
        name,
        socketId: null,
        score: 0,
        answered: false,
      });
      await room.save();
    }

    res.status(200).json({
      message: "Joined room successfully",
      roomCode: room.roomCode,
      hostId: room.hostId,
      roomId: room._id,
      players: room.players,
      maxPlayers: room.maxPlayers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
