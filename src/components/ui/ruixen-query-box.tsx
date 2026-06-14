"use client";

import { Mic, SendHorizonal, User, Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RuixenQueryBoxProps {
  onSubmit: (query: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isPersonalized: boolean;
  onTogglePersonalized: () => void;
}

export default function RuixenQueryBox({ onSubmit, disabled, placeholder = "Ask anything...", isPersonalized, onTogglePersonalized }: RuixenQueryBoxProps) {
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 56,
    maxHeight: 220,
  });

  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const prevTextRef = useRef("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => setIsRecording(true);
        recognition.onend = () => setIsRecording(false);
        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          const separator = prevTextRef.current && currentTranscript ? " " : "";
          setInputValue(prevTextRef.current + separator + currentTranscript);
          adjustHeight();
        };
        recognitionRef.current = recognition;
      }
    }
  }, [adjustHeight]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      prevTextRef.current = inputValue;
      recognitionRef.current.start();
    }
  };

  const handleSend = () => {
    if (!inputValue.trim() || disabled) return;
    onSubmit(inputValue);
    setInputValue("");
    adjustHeight(true);
  };

  return (
    <div className="w-full">
      <div
        className="relative w-full mx-auto bg-white rounded-2xl shadow-sm overflow-hidden border border-purple-200 dark:border-purple-900/50"
        style={{
          backgroundImage:
            "url('/grads/EdClarity-chat-gradient.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <Textarea
          id="ai-textarea"
          ref={textareaRef}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full resize-none border-none bg-transparent overflow-y-auto",
            "text-base text-white placeholder:text-purple-100/70",
            "px-5 py-4 pr-36 rounded-2xl leading-[1.4]",
            "transition-all focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-80"
          )}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            adjustHeight();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        {/* Icon Buttons */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={toggleRecording}
            className={cn(
              "p-2 rounded-full transition-colors disabled:opacity-50",
              isRecording 
                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" 
                : "bg-black/10 hover:bg-black/20 text-white"
            )}
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Personalized Toggle Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={onTogglePersonalized}
                  className={cn(
                    "p-2 rounded-full transition-colors disabled:opacity-50 flex items-center gap-1.5 px-3 text-sm font-medium",
                    isPersonalized 
                      ? "bg-purple-600 hover:bg-purple-700 text-white" 
                      : "bg-black/10 hover:bg-black/20 text-white"
                  )}
                >
                  {isPersonalized ? <User className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isPersonalized ? "Personalized" : "Global"}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs space-y-1 text-sm">
                {isPersonalized ? (
                  <>
                    <p>Using your uploaded study materials and learning profile.</p>
                    <p className="text-xs text-[#F6E3E7]">Click to switch to Global search.</p>
                  </>
                ) : (
                  <>
                    <p>Search across all available knowledge.</p>
                    <p className="text-xs text-[#F6E3E7]">Click to switch to Personalized mode and use your study materials.</p>
                  </>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <button
            type="button"
            onClick={handleSend}
            disabled={!inputValue.trim() || disabled}
            className={cn(
              "p-2 rounded-full transition-colors",
              inputValue.trim() && !disabled
                ? "bg-purple-950 text-white hover:bg-purple-900 shadow-md"
                : "bg-black/10 text-white/50 cursor-not-allowed"
            )}
          >
            <SendHorizonal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
