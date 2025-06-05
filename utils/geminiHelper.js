const axios = require("axios");
require("dotenv").config();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const generateMcqs = async (text) => {
  const prompt = `
${text}
`;

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
    }
  );

  const raw = response.data.candidates[0]?.content?.parts[0]?.text || "";
  const mcqs = parseMcqs(raw);
  return mcqs;
};

const parseMcqs = (text) => {
  const questions = [];

  const blocks = text.trim().split(/\n{2,}/);

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim());

    const questionLine = lines.find((l) =>
      l.toLowerCase().startsWith("question:")
    );
    const optionA = lines.find((l) => l.toLowerCase().startsWith("a)"));
    const optionB = lines.find((l) => l.toLowerCase().startsWith("b)"));
    const optionC = lines.find((l) => l.toLowerCase().startsWith("c)"));
    const optionD = lines.find((l) => l.toLowerCase().startsWith("d)"));
    const answerLine = lines.find((l) => l.toLowerCase().startsWith("answer:"));

    if (
      questionLine &&
      optionA &&
      optionB &&
      optionC &&
      optionD &&
      answerLine
    ) {
      const correct = answerLine.split(":")[1]?.trim();

      questions.push({
        question: questionLine.replace(/^Question:\s*/i, ""),
        options: [optionA, optionB, optionC, optionD].map((opt) =>
          opt.slice(3).trim()
        ),
        correctAnswer: correct,
      });
    }
  }

  return questions;
};

module.exports = { generateMcqs };
