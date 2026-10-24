'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceAskProps {
  onTranscript: (text: string) => void;
  /** BCP-47 locale for recognition, default 'ml-IN' */
  lang?: string;
  disabled?: boolean;
}

type RecognitionState = 'idle' | 'listening' | 'processing' | 'error';

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

/** Microphone button that captures speech and returns a transcript. */
export function VoiceAsk({ onTranscript, lang = 'ml-IN', disabled = false }: VoiceAskProps) {
  const [state, setState] = useState<RecognitionState>('idle');
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const interimRef = useRef('');

  useEffect(() => {
    setSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  const start = useCallback(() => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;

    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    interimRef.current = '';

    rec.onresult = (ev) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      interimRef.current = final || interim;
    };

    rec.onerror = (ev) => {
      console.warn('Speech recognition error:', ev.error);
      setState(ev.error === 'no-speech' ? 'idle' : 'error');
    };

    rec.onend = () => {
      const text = interimRef.current.trim();
      setState('idle');
      if (text) onTranscript(text);
    };

    recognitionRef.current = rec;
    rec.start();
    setState('listening');
  }, [lang, onTranscript]);

  const stop = useCallback(() => {
    setState('processing');
    recognitionRef.current?.stop();
  }, []);

  if (!supported) return null;

  const isListening = state === 'listening';
  const isProcessing = state === 'processing';

  return (
    <button
      type="button"
      onClick={isListening ? stop : start}
      disabled={disabled || isProcessing}
      title={isListening ? 'Stop recording' : `Speak your question in Malayalam (${lang})`}
      aria-label={isListening ? 'Stop voice input' : 'Start voice input in Malayalam'}
      aria-pressed={isListening}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-all ${
        isListening
          ? 'bg-red-500/15 text-red-500 ring-2 ring-red-500 animate-pulse hover:bg-red-500/25'
          : isProcessing
          ? 'bg-[var(--surface-2)] text-[var(--text-muted)] cursor-wait'
          : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]'
      }`}
    >
      {isProcessing ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : isListening ? (
        <MicOff className="h-5 w-5" />
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </button>
  );
}
