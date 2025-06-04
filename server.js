const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const mcqRoutes = require("./routes/mcqRoutes");
const gameRoutes = require("./routes/gameRoutes");
const { Server } = require("socket.io");
const gameSocket = require("./sockets/gameSocket");
const hostRoutes = require("./routes/hostRoutes");
const pdfRoutes = require("./routes/pdfRoutes");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Replace * with your frontend URL in production
    methods: ["GET", "POST"],
  },
});
global.io = io;
app.use(cors());
app.use(express.json());
app.use("/api/mcqs", mcqRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/hosts", hostRoutes);
app.use("/api/pdf", pdfRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

gameSocket(io);
