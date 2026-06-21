const mongoose = require("mongoose");

/**
 * Connects to MongoDB (Atlas or local) using the URI in the environment.
 * Atlas creates the database and collections automatically the first time
 * data is written — there's nothing to provision by hand beyond the
 * connection string itself (cluster + db user + network access).
 *
 * The app is designed to keep running even if Mongo is unreachable — chat
 * history simply won't be persisted — so a voice demo never breaks just
 * because the database isn't configured yet.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn("⚠️  MONGO_URI not set — chat history will not be saved.");
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    const { name, host } = mongoose.connection;
    console.log(`✅ MongoDB connected (db: "${name}", host: ${host})`);
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    if (err.message.includes("bad auth") || err.message.includes("Authentication failed")) {
      console.error(
        "   → Check the username/password in MONGO_URI match an Atlas Database User (Atlas → Database Access)."
      );
    } else if (err.message.includes("ENOTFOUND") || err.message.includes("getaddrinfo")) {
      console.error("   → Check the cluster hostname in MONGO_URI is correct (copy it fresh from Atlas → Connect).");
    } else if (err.message.includes("timed out") || err.message.includes("ETIMEDOUT")) {
      console.error(
        "   → Likely a Network Access issue. In Atlas → Network Access, allow your current IP, or 0.0.0.0/0 for deployment hosts with dynamic IPs."
      );
    }
    console.warn("⚠️  Continuing without persistence until MONGO_URI is fixed and the server is restarted.");
  }
}

module.exports = connectDB;
