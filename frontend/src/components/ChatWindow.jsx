import React, { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble.jsx";

export default function ChatWindow({ messages, interimText, isListening, isSpeaking, onReplay }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, interimText]);

  const isEmpty = messages.length === 0 && !interimText;

  return (
    <div className="chat-window">
      {isEmpty ? (
        <div className="chat-empty">
          <p>Say something to get started.</p>
          <span>Tap the orb, ask a question in any supported language, and listen for the reply.</span>
        </div>
      ) : (
        <div className="chat-list">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              text={m.text}
              isSpeaking={isSpeaking && m.isLatestAssistant}
              onReplay={m.role === "assistant" ? () => onReplay(m.text, m.language) : null}
            />
          ))}
          {isListening && interimText && (
            <MessageBubble role="user" text={interimText} isInterim />
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
