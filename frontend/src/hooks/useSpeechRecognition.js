import { useCallback, useEffect, useRef, useState } from "react";

const SpeechRecognitionAPI =
  typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

/**
 * Wraps the browser's SpeechRecognition API.
 *
 * - Starts recording on demand (start()) and stops automatically once the
 *   browser detects the user has stopped talking (continuous = false means
 *   the engine fires `onend` shortly after speech ends, with no extra timers
 *   needed on our side).
 * - Streams interim (in-progress) text so the UI can show words appearing
 *   live, then hands back the final transcript through onFinalResult.
 *
 * @param {object} options
 * @param {string} options.language - BCP-47 language code, e.g. "ta-IN".
 * @param {(finalText: string) => void} options.onFinalResult
 * @param {(interimText: string) => void} [options.onInterimResult]
 * @param {(message: string) => void} [options.onError]
 */
export function useSpeechRecognition({ language, onFinalResult, onInterimResult, onError }) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef(null);
  const finalBufferRef = useRef("");
  const isSupported = Boolean(SpeechRecognitionAPI);

  // Keep the latest callbacks in refs so the recognition instance (created once)
  // always calls the freshest version without needing to be rebuilt.
  const callbacksRef = useRef({ onFinalResult, onInterimResult, onError });
  useEffect(() => {
    callbacksRef.current = { onFinalResult, onInterimResult, onError };
  }, [onFinalResult, onInterimResult, onError]);

  useEffect(() => {
    if (!isSupported) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      finalBufferRef.current = "";
      setInterimText("");
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalBufferRef.current += transcript;
        } else {
          interim += transcript;
        }
      }
      setInterimText(interim);
      callbacksRef.current.onInterimResult?.(interim);
    };

    recognition.onerror = (event) => {
      // "no-speech" and "aborted" are expected when the user stays silent or
      // we stop manually — don't surface those as scary errors.
      if (event.error !== "no-speech" && event.error !== "aborted") {
        callbacksRef.current.onError?.(event.error);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
      const finalText = finalBufferRef.current.trim();
      finalBufferRef.current = "";
      if (finalText) {
        callbacksRef.current.onFinalResult?.(finalText);
      }
    };

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
    };
  }, [isSupported, language]);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language;
    }
  }, [language]);

  const start = useCallback(() => {
    if (!isSupported || isListening) return;
    try {
      recognitionRef.current.lang = language;
      recognitionRef.current.start();
    } catch {
      // start() throws if called while already running — safe to ignore.
    }
  }, [isSupported, isListening, language]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { isListening, interimText, isSupported, start, stop };
}
