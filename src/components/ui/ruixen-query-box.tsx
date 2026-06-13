"use client";

import { Mic, SendHorizonal, Upload } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface RuixenQueryBoxProps {
  onSubmit: (query: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function RuixenQueryBox({ onSubmit, disabled, placeholder = "Ask anything..." }: RuixenQueryBoxProps) {
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 56,
    maxHeight: 220,
  });

  const [inputValue, setInputValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSend = () => {
    if (!inputValue.trim() || disabled) return;
    onSubmit(inputValue);
    setInputValue("");
    adjustHeight(true);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    console.log("Uploaded files:", files);
  };

  return (
    <div className="w-full">
      <div
        className="relative w-full mx-auto bg-white rounded-2xl shadow-sm overflow-hidden border border-purple-200 dark:border-purple-900/50"
        style={{
          backgroundImage:
            "url('https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/ruixen_chat_gradient.png')",
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
            className="p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors disabled:opacity-50"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* File Upload Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                className="p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-4">
              <p className="text-sm mb-2">Upload files:</p>
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={(e) => handleFileUpload(e.target.files)}
                className="w-full border border-gray-300 rounded p-1 text-sm"
              />
              <Button
                className="mt-2 w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose Files
              </Button>
            </PopoverContent>
          </Popover>

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
