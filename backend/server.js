require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./config/db");
const chatRoutes = require("./routes/chatRoutes");
const { generalLimiter } = require("./middleware/rateLimiters");

const app = express();
const PORT = process.env.PORT || 5000;

// Render/Railway/Heroku sit behind a reverse proxy — needed for correct
// protocol/IP detection (rate limiting, secure cookies, etc. if added later).
app.set("trust proxy", 1);

connectDB();

// CLIENT_ORIGIN can be a single URL or a comma-separated list, e.g.
// "https://aura.vercel.app,https://aura-git-main.vercel.app". Requests with
// no Origin header (curl, server-to-server, mobile apps) are always allowed.
const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`CORS blocked request from origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json({ limit: "100kb" }));

// Security headers (hides X-Powered-By, sets sane defaults for CSP-adjacent
// headers, etc.). This is an API, not a page, so we disable the
// content-security-policy directives meant for serving HTML.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.use("/api", generalLimiter);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    dbConnected: require("mongoose").connection.readyState === 1,
  });
});

app.use("/api/chat", chatRoutes);

// Fallback 404 for unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Centralized error handler (catches anything thrown synchronously in routes)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "Origin not allowed." });
  }
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`🚀 Speech Assistant API running on port ${PORT}`);
  if (allowedOrigins.length) {
    console.log(`   Allowed origins: ${allowedOrigins.join(", ")}`);
  } else {
    console.log("   ⚠️  CLIENT_ORIGIN not set — allowing all origins (fine for local dev only).");
  }
});
