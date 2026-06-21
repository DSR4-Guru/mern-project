import React from "react";
import { Volume2 } from "lucide-react";

export default function MessageBubble({ role, text, isInterim, isSpeaking, onReplay }) {
  const isUser = role === "user";

  return (
    <div className={`bubble-row ${isUser ? "bubble-row--user" : "bubble-row--assistant"}`}>
      <div
        className={`bubble ${isUser ? "bubble--user" : "bubble--assistant"} ${
          isInterim ? "bubble--interim" : ""
        }`}
      >
        <p>{text}</p>
        {!isUser && !isInterim && onReplay && (
          <button
            type="button"
            className="bubble-replay"
            onClick={onReplay}
            aria-label="Play this response aloud"
          >
            <Volume2 size={14} strokeWidth={1.75} className={isSpeaking ? "pulse" : ""} />
          </button>
        )}
      </div>
    </div>
  );
}
