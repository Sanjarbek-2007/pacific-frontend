import React, { useEffect, useState, useRef } from "react";
import { X, Send } from "lucide-react";
import { UserProfile } from "../types";

// Setup Speech Recognition types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceModeOverlayProps {
  profile: UserProfile;
  setShowVoiceMode: (show: boolean) => void;
  voiceMessages: string[];
  voiceTranscript: string;
  setVoiceTranscript: (t: string) => void;
  voiceState: "idle" | "listening" | "thinking" | "speaking";
  setVoiceState: (s: "idle" | "listening" | "thinking" | "speaking") => void;
  submitVoiceCommandSimulated: (text: string) => void;
}

export function VoiceModeOverlay({
  profile,
  setShowVoiceMode,
  voiceMessages,
  voiceTranscript,
  setVoiceTranscript,
  voiceState,
  setVoiceState,
  submitVoiceCommandSimulated,
}: VoiceModeOverlayProps) {
  const recognitionRef = useRef<any>(null);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  const [fallbackInput, setFallbackInput] = useState("");

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setHasSpeechSupport(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceTranscript(transcript);
        submitVoiceCommandSimulated(transcript);
      };

      recognition.onerror = (event: any) => {
        if (event.error === "aborted") {
          return; // Expected when recognition is stopped programmatically
        }
        console.error("Speech recognition error", event.error);
        if (event.error !== "no-speech") {
          setVoiceState("idle");
        }
      };

      recognition.onend = () => {
        // If it was told to listen but ended without result, we can wait or set to idle
      };

      recognitionRef.current = recognition;
    }
  }, [setVoiceTranscript, setVoiceState, submitVoiceCommandSimulated]);

  useEffect(() => {
    if (voiceState === "listening" && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // already started
      }
    } else if (recognitionRef.current && voiceState !== "listening") {
        try {
            recognitionRef.current.stop();
        } catch(e){}
    }
  }, [voiceState]);

  const handleFallbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fallbackInput.trim()) return;
    submitVoiceCommandSimulated(fallbackInput);
    setFallbackInput("");
  };

  return (
    <div 
      className="fixed inset-0 bg-neutral-950 text-white z-50 flex flex-col justify-between p-6 lg:p-12 animate-fade-in font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-modal-title"
    >
      
      <div className="flex items-center justify-between border-b border-white/10 pb-4 max-w-4xl mx-auto w-full">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2.5 h-2.5 bg-brand-accent rounded-full animate-pulse"></span>
          <h2 id="voice-modal-title" className="text-xs uppercase tracking-widest font-mono text-neutral-400">
            Pacific Voice Active
          </h2>
        </div>
        <button
          id="voice-mode-close-btn"
          onClick={() => {
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
              window.speechSynthesis.cancel();
            }
            if (recognitionRef.current) recognitionRef.current.stop();
            setShowVoiceMode(false);
          }}
          className="p-1.5 hover:bg-white/10 rounded-xl focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:outline-none"
          aria-label="Close voice mode"
        >
          <X className="w-6 h-6 text-white/70 hover:text-white" />
        </button>
      </div>

      {/* Conversation Speaking Transcripts list */}
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-center">
        {voiceMessages.length > 0 && (
          <div className="max-h-32 lg:max-h-48 overflow-y-auto space-y-2 border border-white/10 bg-white/5 p-4 rounded-xl scrollbar-none font-light mb-8 max-w-2xl mx-auto w-full">
            {voiceMessages.map((entry, vidx) => (
              <p key={vidx} className="text-sm lg:text-base text-zinc-300 leading-relaxed">
                {entry}
              </p>
            ))}
          </div>
        )}

        {/* Simulated Live Orb Widget area */}
        <div className="flex flex-col items-center justify-center space-y-8">
          <button
            id="voice-orb-avatar"
            aria-label={voiceState === "listening" ? "Stop listening" : "Start listening"}
            className={`w-36 h-36 lg:w-48 lg:h-48 rounded-full bg-brand-accent/10 border-2 border-brand-accent/50 flex items-center justify-center relative cursor-pointer focus-visible:ring-4 focus-visible:ring-brand-accent focus-visible:outline-none ${voiceState !== "idle" ? "orb-pulse" : "hover:scale-105 transition-transform"}`}
            onClick={() => {
              if (voiceState === "listening") {
                setVoiceState("idle");
                setVoiceTranscript("Pacific paused. Tap the orb to start listening.");
              } else {
                setVoiceState("listening");
                setVoiceTranscript("Listening...");
              }
            }}
          >
            {/* Visual Speaking wave line pulses inside Orb */}
            {voiceState === "speaking" && (
              <div className="absolute inset-0 flex items-center justify-center space-x-2 opacity-80" aria-label="Speaking">
                <div className="w-1.5 h-6 lg:h-8 bg-white rounded-full animate-pulse"></div>
                <div className="w-1.5 h-10 lg:h-14 bg-white rounded-full animate-pulse delay-75"></div>
                <div className="w-1.5 h-4 lg:h-6 bg-white rounded-full animate-pulse delay-150"></div>
                <div className="w-1.5 h-8 lg:h-12 bg-white rounded-full animate-pulse delay-200"></div>
              </div>
            )}
            {voiceState === "thinking" && (
              <div className="absolute inset-0 flex items-center justify-center space-x-2" aria-label="Thinking">
                <span className="w-3 h-3 bg-white rounded-full typing-dot"></span>
                <span className="w-3 h-3 bg-white rounded-full typing-dot"></span>
                <span className="w-3 h-3 bg-white rounded-full typing-dot"></span>
              </div>
            )}
          </button>

          <p className="text-body-strong font-light text-center text-zinc-300 max-w-md w-full min-h-[40px] px-4" aria-live="polite">
            {voiceTranscript}
          </p>
        </div>
      </div>

      <div className="pt-6 border-t border-white/10 space-y-4 max-w-4xl mx-auto w-full pb-safe">
        {!hasSpeechSupport && voiceState === "listening" && (
          <form onSubmit={handleFallbackSubmit} className="flex space-x-2 max-w-md mx-auto w-full">
            <input 
              type="text" 
              placeholder="Type your command..." 
              value={fallbackInput}
              onChange={(e) => setFallbackInput(e.target.value)}
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent text-white"
              aria-label="Text command input"
            />
            <button type="submit" className="bg-brand-accent px-4 rounded-xl focus-visible:ring-2 focus-visible:ring-white" aria-label="Send text command">
              <Send className="w-5 h-5 text-white"/>
            </button>
          </form>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          {["List missions", "Read latest intelligence", "Analyze my goal"].map((cmd, idx) => (
            <button
              key={idx}
              onClick={() => submitVoiceCommandSimulated(cmd)}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-zinc-300 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-brand-accent"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
