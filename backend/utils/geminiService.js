const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Friendly names so the model replies in the same language it was spoken to,
// instead of defaulting to English.
const LANGUAGE_NAMES = {
  "en-US": "English",
  "en-GB": "English",
  "en-IN": "English",
  "ta-IN": "Tamil",
  "hi-IN": "Hindi",
  "te-IN": "Telugu",
  "kn-IN": "Kannada",
  "ml-IN": "Malayalam",
  "mr-IN": "Marathi",
  "bn-IN": "Bengali",
  "gu-IN": "Gujarati",
  "pa-IN": "Punjabi",
  "ur-IN": "Urdu",
  "fr-FR": "French",
  "es-ES": "Spanish",
  "de-DE": "German",
  "ja-JP": "Japanese",
  "zh-CN": "Mandarin Chinese",
  "ar-SA": "Arabic",
};

const SYSTEM_PROMPT = `You are a warm, helpful voice assistant similar in spirit to Siri or Google Assistant.
Rules for every reply:
- Speak naturally, the way a person would talk out loud, not the way someone writes an essay.
- Keep answers concise (1-4 sentences) unless the user clearly asks for detail or a list.
- Never use markdown formatting (no asterisks, headers, or bullet symbols) because the reply may be read aloud by text-to-speech.
- Reply in the same language the user spoke in.
- If you don't know something or the request is ambiguous, say so briefly and ask a short clarifying question.`;

/**
 * Sends the user's transcribed speech to Gemini and returns a natural,
 * voice-assistant-style reply.
 *
 * @param {string} text - The recognized speech, transcribed to text.
 * @param {string} languageCode - BCP-47 code from the Web Speech API (e.g. "ta-IN").
 * @returns {Promise<string>} the assistant's reply text.
 */
async function getGeminiResponse(text, languageCode = "en-US") {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is missing on the server. Add it to backend/.env and restart the server."
    );
  }

  const languageName = LANGUAGE_NAMES[languageCode] || languageCode;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text }],
      },
    ],
    systemInstruction: {
      parts: [
        {
          text: `${SYSTEM_PROMPT}\nThe user is speaking in ${languageName} (locale ${languageCode}). Reply in ${languageName}.`,
        },
      ],
    },
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 256,
    },
  };

  try {
    const { data } = await axios.post(GEMINI_URL, payload, {
      params: { key: GEMINI_API_KEY },
      headers: { "Content-Type": "application/json" },
      timeout: 20000,
    });

    const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join(" ").trim();

    if (!reply) {
      const blockReason = data?.promptFeedback?.blockReason;
      if (blockReason) {
        throw new Error(`Gemini blocked the response (${blockReason}).`);
      }
      throw new Error("Gemini returned an empty response.");
    }

    return reply;
  } catch (err) {
    if (err.response) {
      // Gemini returned a non-2xx response
      const apiMessage = err.response.data?.error?.message || JSON.stringify(err.response.data);
      throw new Error(`Gemini API error (${err.response.status}): ${apiMessage}`);
    }
    if (err.request && err.code === "ECONNABORTED") {
      throw new Error("Gemini API request timed out. Please try again.");
    }
    throw err;
  }
}

module.exports = { getGeminiResponse };
