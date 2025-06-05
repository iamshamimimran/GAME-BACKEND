const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  createFile,
  analyzeFileWithGemini,
  getAllFiles,
} = require("../controllers/fileController");

// Analyze file with Gemini
router.post("/files/:fileId/analyze", analyzeFileWithGemini);

// Configure multer to store files locally
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

router.post("/files", upload.array("pdfs", 10), createFile); // Accepts up to 10 PDFs
router.post("/files/:fileId/analyze", analyzeFileWithGemini);

router.get("/files", getAllFiles);

module.exports = router;
