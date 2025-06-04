// routes/hostRoutes.js
const express = require("express");
const router = express.Router();
const { createHost } = require("../controllers/hostController");

router.post("/create", createHost);

module.exports = router;
