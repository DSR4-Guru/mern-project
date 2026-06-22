import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL + "/api",
});

// Send message
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

// Fetch history
export async function fetchHistory(sessionId) {
  try {
    const { data } = await client.get(`/chat/history/${sessionId}`);
    return data;
  } catch (err) {
    console.warn("Could not load history:", err.message);
    return { history: [], persisted: false };
  }
}

// Fetch sessions
export async function fetchSessions() {
  try {
    const { data } = await client.get("/chat/sessions");
    return data;
  } catch (err) {
    console.warn("Could not load chat sessions:", err.message);
    return { sessions: [], persisted: false };
  }
}

// Clear history
export async function clearHistory(sessionId) {
  try {
    const { data } = await client.delete(`/chat/history/${sessionId}`);
    return data;
  } catch (err) {
    console.warn("Could not clear history:", err.message);
    return { cleared: false };
  }
}
