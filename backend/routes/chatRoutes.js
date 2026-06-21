const express = require("express");
const { handleChat, getHistory, clearHistory, getSessions } = require("../controllers/chatController");
const { chatLimiter } = require("../middleware/rateLimiters");

const router = express.Router();

// Stricter limiter only on the endpoint that calls Gemini and writes to the DB.
router.post("/", chatLimiter, handleChat);
router.get("/sessions", getSessions);
router.get("/history/:sessionId", getHistory);
router.delete("/history/:sessionId", clearHistory);

module.exports = router;
