const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  uploadPdf,
  askQuestion,
  generateFromMemory,
} = require("../controllers/pdfController");

const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("file"), uploadPdf);
router.post("/ask", askQuestion);
router.post("/mcq-from-chat", generateFromMemory);

module.exports = router;
