import axios from "axios";

// ✅ Create axios instance
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// (optional) export if needed elsewhere
export default client;

/**
 * Sends transcribed speech to the backend
 */
export async function sendMessage({ text, language, sessionId }) {
  try {
    const { data } = await client.post("/chat", {
      text,
      language,
      sessionId,
    });
    return data;
  } catch (err) {
    const message =
      err.response?.data?.error ||
      err.message ||
      "Failed to reach the assistant.";
    throw new Error(message);
  }
}

export async function fetchHistory(sessionId) {
  try {
    const { data } = await client.get(`/chat/history/${sessionId}`);
    return data;
  } catch (err) {
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
