'use client';

import { useEffect, useState } from 'react';
import { useWebSpeech } from '@/hooks/useWebSpeech';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  language?: string;
  placeholder?: string;
}

export function VoiceInput({
  onTranscript,
  disabled = false,
  language = 'ml-IN',
  placeholder = 'Click to record...',
}: VoiceInputProps) {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const { isSupported, isListening, transcript, error, startListening, stopListening, resetTranscript } = useWebSpeech({
    language,
    onTranscript: (finalTranscript) => {
      onTranscript(finalTranscript);
      setTimerActive(false);
      setTimeElapsed(0);
    },
    onError: (err) => {
      console.error('Speech recognition error:', err);
      setTimerActive(false);
    },
  });

  // Timer effect
  useEffect(() => {
    if (!timerActive) return;
    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive]);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
      setTimerActive(false);
    } else {
      resetTranscript();
      startListening();
      setTimerActive(true);
      setTimeElapsed(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isSupported) {
    return (
      <div className="text-xs text-muted-foreground">
        Voice input not supported in your browser
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleMicClick}
          disabled={disabled}
          className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title={isListening ? 'Stop recording' : 'Start recording'}
        >
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
            <path
              fillRule="evenodd"
              d="M12 2a1 1 0 011 1v1.503A7.002 7.002 0 0119.497 9H21a1 1 0 110 2h-1.503a7.002 7.002 0 01-6.497 6.497V21a1 1 0 11-2 0v-1.503A7.002 7.002 0 014.503 15H3a1 1 0 110-2h1.503A7.002 7.002 0 0111 4.503V3a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <div className="flex-1">
          {isListening && (
            <div className="text-sm font-medium text-red-500">
              Recording... {formatTime(timeElapsed)}
            </div>
          )}
          {!isListening && transcript && (
            <div className="text-sm text-green-600 dark:text-green-400">
              ✓ {transcript.substring(0, 50)}{transcript.length > 50 ? '...' : ''}
            </div>
          )}
          {!isListening && !transcript && (
            <div className="text-xs text-muted-foreground">
              {placeholder}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {isListening && (
        <div className="flex items-center gap-2">
          <div className="animate-pulse flex gap-1">
            <div className="w-1 h-3 bg-red-500 rounded-full"></div>
            <div className="w-1 h-3 bg-red-500 rounded-full"></div>
            <div className="w-1 h-3 bg-red-500 rounded-full"></div>
          </div>
          <span className="text-xs text-muted-foreground">Listening...</span>
        </div>
      )}
    </div>
  );
}
