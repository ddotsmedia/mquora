'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface UseWebSpeechOptions {
  language?: string;
  onTranscript?: (transcript: string) => void;
  onError?: (error: string) => void;
}

interface UseWebSpeechReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useWebSpeech({
  language = 'ml-IN',
  onTranscript,
  onError,
}: UseWebSpeechOptions = {}): UseWebSpeechReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const interimTranscriptRef = useRef('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        interimTranscriptRef.current = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptSegment = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setTranscript((prev) => prev + transcriptSegment + ' ');
          } else {
            interimTranscriptRef.current += transcriptSegment;
          }
        }
      };

      recognition.onerror = (event: any) => {
        const errorMessage = event.error === 'no-speech'
          ? 'No speech detected. Please try again.'
          : `Speech recognition error: ${event.error}`;
        setError(errorMessage);
        onError?.(errorMessage);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [language, onError]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    interimTranscriptRef.current = '';
    recognitionRef.current.start();
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    if (interimTranscriptRef.current) {
      setTranscript((prev) => prev + interimTranscriptRef.current + ' ');
    }
    const finalTranscript = transcript + interimTranscriptRef.current;
    onTranscript?.(finalTranscript.trim());
  }, [transcript, onTranscript]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    interimTranscriptRef.current = '';
    setError(null);
  }, []);

  return {
    isSupported,
    isListening,
    transcript: transcript + interimTranscriptRef.current,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
