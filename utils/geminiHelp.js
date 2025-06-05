const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI("AIzaSyDkhXL5OWLd0NKMnnBavIRGOuohKCWnUWk");

async function askGemini(promptText) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent(promptText);
  const response = result.response;
  return response.text();
}

module.exports = { askGemini };
