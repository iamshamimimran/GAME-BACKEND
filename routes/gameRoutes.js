const express = require("express");
const router = express.Router();
const {
  createGameRoom,
  joinGameRoom,
} = require("../controllers/gameController");

router.post("/create", createGameRoom);
router.post("/join", joinGameRoom);
module.exports = router;
