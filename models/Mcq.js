const mongoose = require("mongoose");

const mcqSchema = new mongoose.Schema({
  sourceType: String,
  sourceContent: String,
  difficulty: String,
  numberOfQuestions: Number,

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
