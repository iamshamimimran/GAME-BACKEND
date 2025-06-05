const File = require("../models/File");
const path = require("path");
const fs = require("fs");
const { extractTextFromPDF } = require("../utils/pdfHelper.js");
const { askGemini } = require("../utils/geminiHelp.js");

// Create new file record
const createFile = async (req, res) => {
  try {
    const { title, description } = req.body;

    // req.files will contain uploaded PDFs from multer
    const pdfs = req.files.map((file) => ({
      filename: file.originalname,
      url: `/uploads/${file.filename}`, // adjust if using cloud storage
    }));

    const newFile = new File({
      title,
      description,
      pdfs,
    });

    await newFile.save();

    res.status(201).json({
      message: "File created successfully",
      data: newFile,
    });
  } catch (error) {
    console.error("Error creating file:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const analyzeFileWithGemini = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { question } = req.body;

    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ error: "File not found" });

    let combinedText = "";

    for (const pdf of file.pdfs) {
      const pdfPath = path.join(__dirname, "..", pdf.url);
      if (!fs.existsSync(pdfPath)) {
        console.warn(`File not found at path: ${pdfPath}`);
        continue;
      }
      const text = await extractTextFromPDF(pdfPath);
      combinedText += `\n\n--- ${pdf.filename} ---\n\n` + text;
    }

    if (!combinedText.trim()) {
      return res
        .status(400)
        .json({ error: "No readable content found in PDFs" });
    }

    const prompt = `${question}\n\n\nHere is the full content from the file:\n${combinedText}`;
    const answer = await askGemini(prompt);

    res.json({ answer });
  } catch (error) {
    console.error("Error analyzing file:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllFiles = async (req, res) => {
  try {
    const files = await File.find().sort({ createdAt: -1 });
    res.json(files);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ error: "Failed to fetch files" });
  }
};

module.exports = {
  createFile,
  analyzeFileWithGemini,
  getAllFiles,
};
