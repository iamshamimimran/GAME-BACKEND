const pdfParse = require("pdf-parse");
const axios = require("axios");
const fs = require("fs");
require("dotenv").config();
const Mcq = require("../models/Mcq");
const { generateMcqs } = require("../utils/geminiHelper");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let memorizedPdfText = "";

exports.uploadPdf = async (req, res) => {
  try {
    const file = req.file;

    if (!file || file.size === 0) {
      return res
        .status(400)
        .json({ error: "No file uploaded or file is empty." });
    }

    const dataBuffer = fs.readFileSync(file.path);

    const pdfData = await pdfParse(dataBuffer);
    memorizedPdfText = pdfData.text;

    fs.unlinkSync(file.path); // Clean up

    if (!memorizedPdfText || memorizedPdfText.trim() === "") {
      return res.status(400).json({ error: "PDF has no extractable text." });
    }

    res
      .status(200)
      .json({ memorizedPdfText, message: "PDF content memorized." });
  } catch (err) {
    console.error("PDF parsing error:", err);
    res.status(500).json({ error: "Failed to process PDF." });
  }
};

exports.askQuestion = async (req, res) => {
  try {
    const { question, options } = req.body;

    const useAddons =
      options?.storyMode ||
      options?.realLifeExample ||
      options?.practicalActivity;

    // Base prompt that strictly uses PDF content
    let basePrompt = `You are an expert assistant. Provide a concise answer to the question strictly based on the following content. If the question is unrelated, politely explain that it's not covered in the document.

Document Content:
${memorizedPdfText}

Question: ${question}
Answer:`;

    // Enhanced prompt when addons are selected
    if (useAddons) {
      let enhancementInstructions = "";

      if (options.storyMode) {
        enhancementInstructions +=
          "\n- Include a relevant, brief story (1-2 paragraphs) to illustrate the concept. You may search for appropriate examples if needed.";
      }
      if (options.realLifeExample) {
        enhancementInstructions +=
          "\n- Provide a concrete real-world application (industry use case, historical example, or current implementation).";
      }
      if (options.practicalActivity) {
        enhancementInstructions +=
          "\n- Suggest a hands-on activity (experiment, exercise, or project) to reinforce understanding.";
      }

      basePrompt = `You are an expert educator. Answer the question using the document content as the foundation, then enhance with requested elements. 

Document Content:
${memorizedPdfText}

Question: ${question}

Response Requirements:
1. First provide a direct answer from the document (1-2 paragraphs)
2. Then add the requested enhancements:${enhancementInstructions}

Structure your response with clear headings for each section. For external examples, ensure they are relevant and accurate.`;
    }

    // Configure the API request
    const requestBody = {
      contents: [
        {
          parts: [{ text: basePrompt }],
        },
      ],
    };

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      requestBody
    );

    const answer =
      response.data.candidates[0]?.content?.parts[0]?.text ||
      "I couldn't generate a response. Please try again with a different question.";

    res.json({ answer });
  } catch (err) {
    console.error("Error in askQuestion:", err.response?.data || err.message);
    res.status(500).json({
      error: "Our systems are currently busy. Please try again shortly.",
      details: err.message,
    });
  }
};

exports.generateFromMemory = async (req, res) => {
  try {
    const { difficulty = "medium", numQuestions = 5 } = req.body;

    if (!memorizedPdfText || memorizedPdfText.trim() === "") {
      return res.status(400).json({ error: "No memorized PDF content found" });
    }

    const craftedPrompt = `Generate exactly ${numQuestions} multiple-choice questions at a ${difficulty} difficulty level with 4 options (a, b, c, d). Only include the correct answer text, not the option label.
Format:
Question: ...
a) ...
b) ...
c) ...
d) ...
Answer: ...

Content:
${memorizedPdfText}`;

    const questions = await generateMcqs(craftedPrompt);

    const saved = await Mcq.create({
      sourceType: "memorized_pdf",
      sourceContent: "Uploaded PDF (memorized)",
      difficulty,
      numQuestions,
      questions,
    });

    res.status(200).json(saved);
  } catch (error) {
    console.error("Error in generateFromMemory:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.generateSummary = async (req, res) => {
  try {
    if (!memorizedPdfText || memorizedPdfText.trim() === "") {
      return res
        .status(400)
        .json({ error: "No PDF text memorized. Please upload a PDF first." });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Please generate a concise summary of the following text. 
      Focus on the main ideas, key points, and important details.
      Keep the summary to about 200-300 words.
      
      Text:
      ${memorizedPdfText}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();

    res.status(200).json({ summary });
  } catch (err) {
    console.error("Summary generation error:", err);
    res.status(500).json({ error: "Failed to generate summary." });
  }
};
