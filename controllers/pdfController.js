const pdfParse = require("pdf-parse");
const axios = require("axios");
const fs = require("fs");
require("dotenv").config();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let memorizedPdfText = "";

exports.uploadPdf = async (req, res) => {
  try {
    const file = req.file;
    const dataBuffer = fs.readFileSync(file.path);
    const pdfData = await pdfParse(dataBuffer);

    memorizedPdfText = pdfData.text;
    fs.unlinkSync(file.path);

    res.status(200).json({ message: "PDF content memorized." });
  } catch (err) {
    res.status(500).json({ error: "Failed to process PDF." });
  }
};

exports.askQuestion = async (req, res) => {
  try {
    const { question } = req.body;

    if (!memorizedPdfText) {
      return res.status(400).json({ error: "No PDF uploaded yet." });
    }

    const prompt = `You are an assistant. Only answer questions strictly based on the following content. If the question is unrelated, say: "Sorry, that is not related to the uploaded PDF.".

Content:
${memorizedPdfText}

Question: ${question}
Answer:`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
      }
    );

    const answer =
      response.data.candidates[0]?.content?.parts[0]?.text ||
      "Sorry, unable to answer.";
    res.json({ answer });
  } catch (err) {
    res.status(500).json({ error: "Error generating answer." });
  }
};
