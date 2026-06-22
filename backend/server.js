```javascript
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const chatRoutes = require("./routes/chatRoutes");
const { generalLimiter } = require("./middleware/rateLimiters");

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (Vercel, Render, Railway, etc.)
app.set("trust proxy", 1);

// Connect MongoDB
connectDB().catch(err =>
  console.error("MongoDB init failed:", err.message)
);

// Allowed frontend origins
const allowedOrigins = [
  "http://localhost:5173",
  "https://mern-project-jade-mu.vercel.app/",
];

// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without Origin header
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "100kb" }));

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

// Rate limiting
app.use("/api", generalLimiter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    dbConnected: mongoose.connection.readyState === 1,
  });
});

// API routes
app.use("/api/chat", chatRoutes);

// 404 handler
app.use("/api", (req, res) => {
  res.status(404).json({
    error: "Not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      error: "Origin not allowed.",
    });
  }

  res.status(500).json({
    error: "Internal server error",
  });
});

// Start server only in local development
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 Speech Assistant API running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  });
}

// Export app for Vercel Serverless Functions
module.exports = app;
```
