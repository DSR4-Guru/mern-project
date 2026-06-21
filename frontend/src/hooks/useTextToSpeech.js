import { useCallback, useEffect, useRef, useState } from "react";

const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * Speaks text aloud and reports whether speech is currently playing, so the
 * UI can show a "speaking" state on the orb.
 */
export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voicesRef = useRef([]);

  useEffect(() => {
    if (!isSupported) return;
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback((text, language = "en-US", { onEnd } = {}) => {
    if (!isSupported || !text) {
      onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 1;
    utterance.pitch = 1;

    const matchingVoice = voicesRef.current.find((v) => v.lang === language);
    const fallbackVoice = voicesRef.current.find((v) => v.lang?.startsWith(language.split("-")[0]));
    if (matchingVoice) utterance.voice = matchingVoice;
    else if (fallbackVoice) utterance.voice = fallbackVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      onEnd?.();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const cancel = useCallback(() => {
    if (isSupported) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, cancel, isSpeaking, isSupported };
}
