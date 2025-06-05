const fs = require("fs");
const pdfParse = require("pdf-parse");

async function extractTextFromPDF(path) {
  const dataBuffer = fs.readFileSync(path);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

module.exports = { extractTextFromPDF };
