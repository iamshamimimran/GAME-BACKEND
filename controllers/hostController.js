// controllers/hostController.js
const Host = require("../models/Host");

exports.createHost = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    // Check if host already exists by email
    let host = await Host.findOne({ email });

    if (host) {
      return res.status(200).json({ message: "Host already exists", host });
    }

    // Create new host
    host = await Host.create({ name, email });

    res.status(201).json({ message: "Host created successfully", host });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
