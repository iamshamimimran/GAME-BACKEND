const GameRoom = require("../models/GameRoom");

module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log(`New connection: ${socket.id}`);

    // Player joins room
    socket.on("join-room", async ({ name, roomCode }) => {
      try {
        const room = await GameRoom.findOne({ roomCode }).populate("mcqSetId");
        if (!room) return socket.emit("error", "Room not found");

        // Check if game has already started
        if (room.isGameStarted) {
          return socket.emit("error", "Game has already started");
        }

        // Clean up stale players
        room.players = room.players.filter(
          (p) => p.socketId && io.sockets.sockets.has(p.socketId)
        );

        // Check if room is full after cleaning up stale players
        if (room.players.length >= room.maxPlayers) {
          return socket.emit("error", "Room is full");
        }

        const player = {
          name,
          socketId: socket.id,
          score: 0,
          answered: false,
        };

        room.players.push(player);
        await room.save();

        socket.join(roomCode);
        io.to(roomCode).emit("players-update", room.players);
      } catch (err) {
        console.error("Join room error:", err);
        socket.emit("error", "Server error");
      }
    });

    // Host joins room
    socket.on("host-join-room", async ({ roomCode }) => {
      try {
        const room = await GameRoom.findOne({ roomCode });
        if (!room) return socket.emit("error", "Room not found");

        socket.join(roomCode);
        console.log(`Host joined room ${roomCode}`);

        // Send room state to host including game status
        io.to(roomCode).emit("players-update", room.players);
        socket.emit("room-state", {
          isGameStarted: room.isGameStarted,
          currentQuestionIndex: room.currentQuestionIndex || 0,
        });
      } catch (err) {
        console.error("Host join error:", err);
      }
    });

    // Manual game start by host
    socket.on("start-game", async ({ roomCode }) => {
      try {
        const room = await GameRoom.findOne({ roomCode }).populate("mcqSetId");
        if (!room) return socket.emit("error", "Room not found");

        // Check if game is already started
        if (room.isGameStarted) {
          return socket.emit("error", "Game has already started");
        }

        if (
          !room.mcqSetId ||
          !room.mcqSetId.questions ||
          room.mcqSetId.questions.length === 0
        ) {
          return socket.emit("error", "No questions available");
        }

        room.isGameStarted = true;
        room.currentQuestionIndex = 0;
        room.players.forEach((p) => (p.answered = false));
        await room.save();

        io.to(roomCode).emit("game-started");
        sendQuestion(io, roomCode, room.mcqSetId.questions, 0);
      } catch (err) {
        console.error("Start game error:", err);
      }
    });

    // Player submits answer
    socket.on("submit-answer", async ({ roomCode, name, answer }) => {
      try {
        const room = await GameRoom.findOne({ roomCode }).populate("mcqSetId");
        if (!room || !room.isGameStarted) return;

        const player = room.players.find((p) => p.name === name);
        const currentQuestion =
          room.mcqSetId.questions[room.currentQuestionIndex];

        if (player && !player.answered) {
          player.answered = true;
          if (answer === currentQuestion.correctAnswer) {
            player.score += 1;
          }

          // Save player data to database
          await room.save();

          // Update leaderboard but don't reveal answer yet
          io.to(roomCode).emit("update-leaderboard", room.players);

          // Send feedback to player that answer was submitted
          socket.emit("answer-submitted", { answer });
        }

        // Don't reveal answer immediately - let the timer handle it
        // The timer will handle answer reveal and next question flow
      } catch (err) {
        console.error("Submit answer error:", err);
      }
    });

    // Disconnect
    socket.on("disconnect", async () => {
      console.log(`Disconnected: ${socket.id}`);
      try {
        const rooms = await GameRoom.find({ "players.socketId": socket.id });
        for (const room of rooms) {
          room.players = room.players.filter((p) => p.socketId !== socket.id);
          await room.save();
          io.to(room.roomCode).emit("players-update", room.players);
        }
      } catch (err) {
        console.error("Disconnect cleanup error:", err);
      }
    });
  });
};

function sendQuestion(io, roomCode, questions, index) {
  const question = questions[index];
  if (!question) {
    io.to(roomCode).emit("game-over");
    return;
  }

  const timeLimit = 20;
  const startTime = Date.now();

  // Send question with server timestamp
  io.to(roomCode).emit("new-question", {
    index,
    question: question.question,
    options: question.options,
    timeLimit,
    totalQuestions: questions.length,
    startTime,
  });

  // Send timer updates every second for better sync
  const timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const timeLeft = Math.max(0, timeLimit - elapsed);

    io.to(roomCode).emit("timer-update", { timeLeft });

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
    }
  }, 1000);

  // Handle question timeout - always wait full 20 seconds
  setTimeout(async () => {
    try {
      clearInterval(timerInterval);

      const room = await GameRoom.findOne({ roomCode });
      if (!room || !room.isGameStarted) return;

      // Mark unanswered players as answered (so they don't get points)
      let roomUpdated = false;
      room.players.forEach((p) => {
        if (!p.answered) {
          p.answered = true;
          roomUpdated = true;
        }
      });

      // Save if there were any updates
      if (roomUpdated) {
        await room.save();
      }

      // Show answer after full timer
      io.to(roomCode).emit("show-answer", {
        correctAnswer: question.correctAnswer,
        players: room.players,
      });

      // Wait 5 seconds to show answer, then move to next question
      setTimeout(async () => {
        const updatedRoom = await GameRoom.findOne({ roomCode });
        if (!updatedRoom || !updatedRoom.isGameStarted) return;

        updatedRoom.currentQuestionIndex++;
        updatedRoom.players.forEach((p) => (p.answered = false));

        // Save the updated question index and reset answered status
        await updatedRoom.save();

        if (updatedRoom.currentQuestionIndex < questions.length) {
          sendQuestion(
            io,
            roomCode,
            questions,
            updatedRoom.currentQuestionIndex
          );
        } else {
          // Game over - fetch final room state and save
          const finalRoom = await GameRoom.findOne({ roomCode });
          io.to(roomCode).emit("game-over", {
            leaderboard: finalRoom.players.sort((a, b) => b.score - a.score),
          });
        }
      }, 5000);
    } catch (err) {
      console.error("Question timeout error:", err);
    }
  }, timeLimit * 1000); // Always wait full 20 seconds
}
