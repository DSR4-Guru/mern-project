const rateLimit = require("express-rate-limit");

/**
 * Applies to every /api request. Generous — this just stops obvious abuse
 * (scripted hammering, scanners) without affecting normal use.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down and try again shortly." },
});

/**
 * Applies only to POST /api/chat — the endpoint that costs you money (Gemini
 * API calls) and database writes. Tighter limit: ~1 message every 3 seconds
 * sustained, which is far beyond what a real voice conversation needs but
 * blocks scripted abuse of your Gemini quota.
 */
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You're sending messages too quickly. Please wait a moment." },
});

module.exports = { generalLimiter, chatLimiter };
