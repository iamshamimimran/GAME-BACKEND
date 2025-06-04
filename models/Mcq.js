const mongoose = require("mongoose");

const mcqSchema = new mongoose.Schema({
  sourceType: String, // 'pdf' or 'prompt'
  sourceContent: String, // prompt text or filename
  questions: [
    {
      question: String,
      options: [String],
      correctAnswer: String,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Mcq", mcqSchema);
