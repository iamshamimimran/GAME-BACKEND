const mongoose = require("mongoose");

const pdfSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const fileSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  pdfs: [pdfSchema], // Array of PDF documents
  createdAt: { type: Date, default: Date.now },
});

const File = mongoose.model("File", fileSchema);

module.exports = File;
