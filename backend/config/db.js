```javascript
const mongoose = require("mongoose");

let isConnected = false;

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn("⚠️ MONGO_URI not set — chat history will not be saved.");
    return;
  }

  // Reuse existing connection in Vercel serverless environment
  if (isConnected) {
    return;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    isConnected = conn.connections[0].readyState === 1;

    console.log(
      `✅ MongoDB connected (db: "${conn.connection.name}", host: ${conn.connection.host})`
    );
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);

    if (
      err.message.includes("bad auth") ||
      err.message.includes("Authentication failed")
    ) {
      console.error(
        "→ Check the username/password in MONGO_URI match your Atlas Database User."
      );
    } else if (
      err.message.includes("ENOTFOUND") ||
      err.message.includes("getaddrinfo")
    ) {
      console.error(
        "→ Check the cluster hostname in MONGO_URI."
      );
    } else if (
      err.message.includes("timed out") ||
      err.message.includes("ETIMEDOUT")
    ) {
      console.error(
        "→ Atlas Network Access may be blocking the connection. Allow 0.0.0.0/0 for Vercel."
      );
    }

    console.warn(
      "⚠️ Continuing without persistence until MONGO_URI is fixed."
    );
  }
}

module.exports = connectDB;
```
