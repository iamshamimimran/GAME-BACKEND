const fs = require("fs");
const pdfParse = require("pdf-parse");
const Mcq = require("../models/Mcq");
const { generateMcqs } = require("../utils/geminiHelper");

exports.generateFromPdf = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const dataBuffer = fs.readFileSync(file.path);
    const pdfData = await pdfParse(dataBuffer);

    if (!pdfData.text || pdfData.text.trim() === "") {
      return res
        .status(400)
        .json({ error: "Could not extract text from the PDF" });
    }

    // Optional: log first 300 characters of extracted text
    console.log("Extracted PDF text:", pdfData.text.slice(0, 300));

    const questions = await generateMcqs(pdfData.text);

    const saved = await Mcq.create({
      sourceType: "pdf",
      sourceContent: file.originalname,
      questions,
    });

    res.status(200).json(saved);
  } catch (error) {
    console.error("Error in generateFromPdf:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.generateFromPrompt = async (req, res) => {
  try {
    const { prompt } = req.body;
    const questions = await generateMcqs(prompt);

    const saved = await Mcq.create({
      sourceType: "prompt",
      sourceContent: prompt,
      questions,
    });

    res.status(200).json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllMcqs = async (req, res) => {
  const mcqs = await Mcq.find().sort({ createdAt: -1 });
  res.status(200).json(mcqs);
};
