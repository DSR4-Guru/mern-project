const Conversation = require("../models/Conversation");
const { getGeminiResponse } = require("../utils/geminiService");

const isDbConnected = () => require("mongoose").connection.readyState === 1;

const MAX_TEXT_LENGTH = 2000; // generous for a spoken sentence/paragraph, caps Gemini cost per request
const SESSION_ID_PATTERN = /^[a-zA-Z0-9-]{1,64}$/;
const LANGUAGE_PATTERN = /^[a-zA-Z]{2,8}(-[a-zA-Z0-9]{2,8})?$/;

/**
 * Validates the chat request body before it ever reaches Gemini or MongoDB.
 * Returns an error string if invalid, or null if the input is safe to use.
 */
function validateChatInput({ text, language, sessionId }) {
  if (typeof text !== "string" || !text.trim()) {
    return "No speech text provided.";
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return `Message is too long (max ${MAX_TEXT_LENGTH} characters).`;
  }
  if (language !== undefined && (typeof language !== "string" || !LANGUAGE_PATTERN.test(language))) {
    return "Invalid language code.";
  }
  if (sessionId !== undefined && (typeof sessionId !== "string" || !SESSION_ID_PATTERN.test(sessionId))) {
    return "Invalid session id.";
  }
  return null;
}

/**
 * POST /api/chat
 * Body: { text: string, language?: string, sessionId?: string }
 * Sends the transcribed text to Gemini, saves the exchange (if DB is up),
 * and returns the AI's reply.
 */
async function handleChat(req, res) {
  try {
    const { text, language = "en-US", sessionId = "default" } = req.body || {};

    const validationError = validateChatInput({ text, language, sessionId });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const cleanText = text.trim();
    const reply = await getGeminiResponse(cleanText, language);

    let saved = null;
    if (isDbConnected()) {
      try {
        saved = await Conversation.create({
          sessionId,
          query: cleanText,
          response: reply,
          language,
        });
      } catch (dbErr) {
        console.error("Failed to save conversation:", dbErr.message);
        // Don't fail the request just because persistence failed.
      }
    }

    return res.json({
      query: cleanText,
      response: reply,
      language,
      id: saved?._id || null,
      createdAt: saved?.createdAt || new Date().toISOString(),
    });
  } catch (err) {
    console.error("Chat handler error:", err);
    // In production, don't leak internal error details (library messages,
    // upstream API response shapes, etc.) to the client.
    const safeMessage =
      process.env.NODE_ENV === "production"
        ? "Something went wrong while talking to the assistant. Please try again."
        : err.message;
    return res.status(500).json({ error: safeMessage });
  }
}

/**
 * GET /api/chat/history/:sessionId
 * Returns the most recent exchanges for a session, oldest first.
 */
async function getHistory(req, res) {
  if (!isDbConnected()) {
    return res.json({ history: [], persisted: false });
  }

  const { sessionId } = req.params;
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    return res.status(400).json({ error: "Invalid session id." });
  }

  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const docs = await Conversation.find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ history: docs.reverse(), persisted: true });
  } catch (err) {
    console.error("History fetch error:", err.message);
    return res.status(500).json({ error: "Could not fetch history." });
  }
}

/**
 * DELETE /api/chat/history/:sessionId
 * Clears stored history for a session.
 */
async function clearHistory(req, res) {
  if (!isDbConnected()) {
    return res.json({ cleared: false, persisted: false });
  }

  const { sessionId } = req.params;
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    return res.status(400).json({ error: "Invalid session id." });
  }

  try {
    await Conversation.deleteMany({ sessionId });
    return res.json({ cleared: true, persisted: true });
  } catch (err) {
    console.error("History clear error:", err.message);
    return res.status(500).json({ error: "Could not clear history." });
  }
}

/**
 * GET /api/chat/sessions
 * Returns one entry per distinct chat thread (sessionId) — title (from the
 * first message), how many messages it has, and when it was last active —
 * sorted by most recent activity first. Powers the chat history sidebar.
 */
async function getSessions(req, res) {
  if (!isDbConnected()) {
    return res.json({ sessions: [], persisted: false });
  }

  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 300);

    const sessions = await Conversation.aggregate([
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: "$sessionId",
          title: { $first: "$query" },
          language: { $first: "$language" },
          messageCount: { $sum: 1 },
          updatedAt: { $max: "$createdAt" },
          createdAt: { $min: "$createdAt" },
        },
      },
      { $sort: { updatedAt: -1 } },
      { $limit: limit },
    ]);

    const formatted = sessions.map((s) => ({
      sessionId: s._id,
      title: truncateTitle(s.title),
      language: s.language,
      messageCount: s.messageCount,
      updatedAt: s.updatedAt,
      createdAt: s.createdAt,
    }));

    return res.json({ sessions: formatted, persisted: true });
  } catch (err) {
    console.error("Sessions fetch error:", err.message);
    return res.status(500).json({ error: "Could not fetch chat history." });
  }
}

function truncateTitle(text, max = 48) {
  if (!text) return "New conversation";
  const clean = text.trim();
  return clean.length > max ? `${clean.slice(0, max).trim()}…` : clean;
}

module.exports = { handleChat, getHistory, clearHistory, getSessions };
