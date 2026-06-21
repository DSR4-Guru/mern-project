import React, { useCallback, useEffect, useState } from "react";
import TopBar from "./components/TopBar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import MicButton from "./components/MicButton.jsx";
import WaveAnimation from "./components/WaveAnimation.jsx";
import ChatWindow from "./components/ChatWindow.jsx";
import Toast from "./components/Toast.jsx";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition.js";
import { useTextToSpeech } from "./hooks/useTextToSpeech.js";
import { useAudioLevel } from "./hooks/useAudioLevel.js";
import { sendMessage, fetchHistory, fetchSessions, clearHistory } from "./api/chatApi.js";
import { createSessionId, getStoredSessionId, setStoredSessionId } from "./utils/session.js";
import { DEFAULT_LANGUAGE } from "./constants/languages.js";

let idCounter = 0;
const nextId = () => `m-${Date.now()}-${idCounter++}`;

export default function App() {
  const [sessionId, setSessionId] = useState(() => getStoredSessionId() || createSessionId());
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsPersisted, setSessionsPersisted] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 860);

  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState("");
  const [voiceMuted, setVoiceMuted] = useState(false);

  const tts = useTextToSpeech();

  const refreshSessions = useCallback(async () => {
    const { sessions: list, persisted } = await fetchSessions();
    setSessions(list);
    setSessionsPersisted(persisted);
    setSessionsLoading(false);
  }, []);

  // Load the sidebar's chat list once on mount.
  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  // Whenever the active thread changes, load its messages from MongoDB.
  useEffect(() => {
    let cancelled = false;
    setStoredSessionId(sessionId);

    (async () => {
      const { history } = await fetchHistory(sessionId);
      if (cancelled) return;

      if (history?.length) {
        const restored = [];
        history.forEach((doc, i) => {
          restored.push({ id: `h-${doc._id}-q`, role: "user", text: doc.query, language: doc.language });
          restored.push({
            id: `h-${doc._id}-r`,
            role: "assistant",
            text: doc.response,
            language: doc.language,
            isLatestAssistant: i === history.length - 1,
          });
        });
        setMessages(restored);
      } else {
        setMessages([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const handleFinalResult = useCallback(
    async (finalText) => {
      const userMessage = { id: nextId(), role: "user", text: finalText, language };
      setMessages((prev) => clearLatestFlag(prev).concat(userMessage));
      setIsThinking(true);
      setError("");

      try {
        const data = await sendMessage({ text: finalText, language, sessionId });
        const assistantMessage = {
          id: nextId(),
          role: "assistant",
          text: data.response,
          language,
          isLatestAssistant: true,
        };
        setMessages((prev) => clearLatestFlag(prev).concat(assistantMessage));
        refreshSessions();

        if (!voiceMuted) {
          tts.speak(data.response, language);
        }
      } catch (err) {
        setError(err.message || "Something went wrong talking to the assistant.");
      } finally {
        setIsThinking(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language, sessionId, voiceMuted, refreshSessions]
  );

  const speech = useSpeechRecognition({
    language,
    onFinalResult: handleFinalResult,
    onError: (code) => setError(describeSpeechError(code)),
  });

  const level = useAudioLevel(speech.isListening);

  const status = !speech.isSupported
    ? "unsupported"
    : isThinking
    ? "thinking"
    : speech.isListening
    ? "listening"
    : tts.isSpeaking
    ? "speaking"
    : "idle";

  const handleOrbClick = () => {
    if (status === "listening") {
      speech.stop();
      return;
    }
    if (status === "speaking") {
      tts.cancel();
    }
    if (status === "idle" || status === "speaking") {
      setError("");
      speech.start();
    }
  };

  const handleReplay = (text, lang) => tts.speak(text, lang || language);

  const handleNewChat = () => {
    tts.cancel();
    if (speech.isListening) speech.stop();
    setMessages([]);
    setError("");
    setSessionId(createSessionId());
    if (window.innerWidth <= 860) setSidebarOpen(false);
  };

  const handleSelectSession = (id) => {
    if (id === sessionId) return;
    tts.cancel();
    if (speech.isListening) speech.stop();
    setError("");
    setSessionId(id);
    if (window.innerWidth <= 860) setSidebarOpen(false);
  };

  const handleDeleteSession = async (id) => {
    await clearHistory(id);
    setSessions((prev) => prev.filter((s) => s.sessionId !== id));
    if (id === sessionId) {
      handleNewChat();
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        sessions={sessions}
        currentSessionId={sessionId}
        onSelect={handleSelectSession}
        onNewChat={handleNewChat}
        onDelete={handleDeleteSession}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        isLoading={sessionsLoading}
        persisted={sessionsPersisted}
      />

      <div className={`content-column ${!sidebarOpen ? "content-column--sidebar-closed" : ""}`}>
        <TopBar
          language={language}
          onLanguageChange={setLanguage}
          disabled={speech.isListening}
          voiceMuted={voiceMuted}
          onToggleVoice={() => {
            setVoiceMuted((m) => !m);
            if (!voiceMuted) tts.cancel();
          }}
        />

        <main className="app-main">
          <ChatWindow
            messages={messages}
            interimText={speech.interimText}
            isListening={speech.isListening}
            isSpeaking={tts.isSpeaking}
            onReplay={handleReplay}
          />

          <div className="orb-section">
            <WaveAnimation level={level} active={speech.isListening} />
            <MicButton status={status} level={level} onClick={handleOrbClick} disabled={isThinking} />
          </div>
        </main>
      </div>

      <Toast message={error} onDismiss={() => setError("")} />
    </div>
  );
}

function clearLatestFlag(prev) {
  return prev.map((m) => (m.isLatestAssistant ? { ...m, isLatestAssistant: false } : m));
}

function describeSpeechError(code) {
  switch (code) {
    case "not-allowed":
    case "permission-denied":
      return "Microphone access was blocked. Allow mic permission in your browser settings to talk to Aura.";
    case "network":
      return "Speech recognition needs a network connection.";
    case "audio-capture":
      return "No microphone was found. Connect a mic and try again.";
    default:
      return `Speech recognition error: ${code}`;
  }
}
