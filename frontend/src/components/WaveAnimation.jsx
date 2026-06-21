import React from "react";

const BAR_COUNT = 5;
// Relative weights so the bars don't all move in lockstep with raw level.
const WEIGHTS = [0.5, 0.85, 1, 0.85, 0.5];

export default function WaveAnimation({ level = 0, active = false }) {
  return (
    <div className={`wave ${active ? "wave--active" : ""}`} aria-hidden="true">
      {WEIGHTS.map((w, i) => (
        <span
          key={i}
          className="wave-bar"
          style={{
            transform: `scaleY(${active ? Math.max(0.18, level * w) : 0.12})`,
          }}
        />
      ))}
    </div>
  );
}
