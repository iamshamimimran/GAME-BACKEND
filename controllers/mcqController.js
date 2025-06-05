const fs = require("fs");
const pdfParse = require("pdf-parse");
const Mcq = require("../models/Mcq");
const { generateMcqs } = require("../utils/geminiHelper");

exports.generateFromPdf = async (req, res) => {
  try {
    const file = req.file;
    const { difficulty = "medium", numQuestions = 5 } = req.body;

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

    const craftedPrompt = `Generate exactly ${numQuestions} multiple-choice questions at a ${difficulty} difficulty level with 4 options (a, b, c, d) Only include the correct answer text, not the option label.
Format:
Question: ...
a) ...
b) ...
c) ...
d) ...
Answer: ...

Content:
${pdfData.text}`;

    const questions = await generateMcqs(craftedPrompt);

    const saved = await Mcq.create({
      sourceType: "pdf",
      sourceContent: file.originalname,
      difficulty,
      numQuestions,
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
    const { prompt, difficulty = "medium", numQuestions = 5 } = req.body;

    if (!prompt || prompt.length < 10) {
      return res
        .status(400)
        .json({ error: "Prompt must be at least 10 characters." });
    }

    const num = parseInt(numQuestions, 10);
    if (!num || num < 1 || num > 20) {
      return res
        .status(400)
        .json({ error: "Number of questions must be between 1 and 20." });
    }

    const fullPrompt = `
Generate exactly ${num} multiple-choice questions on the topic "${prompt}".
Difficulty level: ${difficulty}
Each question should have 4 options (a, b, c, d).
Only include the correct answer text, not the option label.
Format:
Question: ...
a) ...
b) ...
c) ...
d) ...
Answer: ...

Only follow this format. Do not add explanations.
`;

    const questions = await generateMcqs(fullPrompt);

    const saved = await Mcq.create({
      sourceType: "prompt",
      sourceContent: prompt,
      difficulty,
      numberOfQuestions: num,
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
