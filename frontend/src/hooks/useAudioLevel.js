import { useEffect, useRef, useState } from "react";

/**
 * Reports a smoothed 0–1 microphone volume level while `active` is true.
 * Drives the wave bars / orb glow so the UI visibly reacts to the user's
 * voice instead of playing a generic looping animation.
 */
export function useAudioLevel(active) {
  const [level, setLevel] = useState(0);
  const frameRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setLevel(0);
      return;
    }

    let cancelled = false;

    async function startMeter() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
          setLevel(Math.min(1, avg / 110));
          frameRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // Mic access denied or unavailable — wave animation simply stays flat.
        setLevel(0);
      }
    }

    startMeter();

    return () => {
      cancelled = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
      setLevel(0);
    };
  }, [active]);

  return level;
}
