import React from "react";
import { Mic, Loader2, Volume2, MicOff } from "lucide-react";

const ICONS = {
  idle: Mic,
  listening: Mic,
  thinking: Loader2,
  speaking: Volume2,
  unsupported: MicOff,
};

const STATUS_LABEL = {
  idle: "Tap to speak",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
  unsupported: "Speech recognition isn't supported in this browser",
};

/**
 * The app's signature element: a layered gradient orb that breathes at rest,
 * sends out ripples while listening, spins while waiting on Gemini, and
 * pulses gently while speaking. `level` (0–1, live mic volume) nudges the
 * core's scale so it visibly reacts to the user's voice rather than looping
 * on its own.
 */
export default function MicButton({ status = "idle", level = 0, onClick, disabled }) {
  const Icon = ICONS[status] || Mic;
  const scale = status === "listening" ? 1 + level * 0.12 : 1;

  return (
    <div className="orb-wrap">
      <button
        type="button"
        className={`orb orb--${status}`}
        onClick={onClick}
        disabled={disabled || status === "unsupported"}
        aria-pressed={status === "listening"}
        aria-label={STATUS_LABEL[status]}
      >
        <span className="orb-ring orb-ring--1" />
        <span className="orb-ring orb-ring--2" />
        <span className="orb-ring orb-ring--3" />
        <span className="orb-core" style={{ transform: `scale(${scale})` }}>
          <Icon size={30} strokeWidth={1.75} className={status === "thinking" ? "spin" : ""} />
        </span>
      </button>
      <p className="orb-status" role="status">
        {STATUS_LABEL[status]}
      </p>
    </div>
  );
}
