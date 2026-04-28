const mongoose = require("mongoose");

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn("MONGODB_URI not set. Database features will fail until configured.");
    return;
  }

  await mongoose.connect(uri);
  console.log("MongoDB connected");
}

module.exports = { connectDatabase };
