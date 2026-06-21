import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const client = axios.create({
  baseURL: API_URL,
  timeout: 25000,
});

/**
 * Sends transcribed speech to the backend, which forwards it to Gemini.
 * @param {{ text: string, language: string, sessionId: string }} params
 */
export async function sendMessage({ text, language, sessionId }) {
  try {
    const { data } = await client.post("/chat", { text, language, sessionId });
    return data;
  } catch (err) {
    const message = err.response?.data?.error || err.message || "Failed to reach the assistant.";
    throw new Error(message);
  }
}

export async function fetchHistory(sessionId) {
  try {
    const { data } = await client.get(`/chat/history/${sessionId}`);
    return data;
  } catch (err) {
    // History is a nice-to-have; fail quietly so the app still works.
    console.warn("Could not load history:", err.message);
    return { history: [], persisted: false };
  }
}

export async function fetchSessions() {
  try {
    const { data } = await client.get("/chat/sessions");
    return data;
  } catch (err) {
    console.warn("Could not load chat sessions:", err.message);
    return { sessions: [], persisted: false };
  }
}

export async function clearHistory(sessionId) {
  try {
    const { data } = await client.delete(`/chat/history/${sessionId}`);
    return data;
  } catch (err) {
    console.warn("Could not clear history:", err.message);
    return { cleared: false };
  }
}
