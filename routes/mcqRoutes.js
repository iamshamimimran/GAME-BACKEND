const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  generateFromPdf,
  generateFromPrompt,
  getAllMcqs,
} = require("../controllers/mcqController");

const upload = multer({ dest: "uploads/" });

router.post("/generate/pdf", upload.single("pdf"), generateFromPdf);
router.post("/generate/prompt", generateFromPrompt);
router.get("/", getAllMcqs);

module.exports = router;
