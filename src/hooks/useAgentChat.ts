import { useState, useEffect, useRef, useCallback } from 'react';

interface Message {
  role: 'user' | 'agent';
  text: string;
}

export const useAgentChat = (meetingId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const shouldKeepListeningRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthesisRef.current = window.speechSynthesis;
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onspeechstart = () => {
          // Interrupt agent if user starts speaking
          if (synthesisRef.current && synthesisRef.current.speaking) {
            synthesisRef.current.cancel();
            setIsAgentSpeaking(false);
          }
        };

        recognition.onresult = async (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const transcript = event.results[i][0].transcript.trim();
              if (transcript && !isProcessingRef.current) {
                isProcessingRef.current = true;
                await handleUserTranscript(transcript);
                isProcessingRef.current = false;
              }
            }
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            console.error("Speech recognition error", event.error);
          }
        };

        recognition.onend = () => {
          // Auto-restart if we should keep listening and agent is not speaking
          if (shouldKeepListeningRef.current) {
            setTimeout(() => {
              try {
                if (shouldKeepListeningRef.current && recognitionRef.current) {
                  recognitionRef.current.start();
                  setIsListening(true);
                }
              } catch (e) {
                // Ignore invalid state
              }
            }, 300);
          } else {
            setIsListening(false);
          }
        };

        recognitionRef.current = recognition;
      } else {
        setError("Speech Recognition API is not supported in this browser. Please use Chrome, Edge, or Brave.");
      }
    }
  }, []);

  const handleUserTranscript = async (transcript: string) => {
    if (!transcript.trim() || isFetchingRef.current) return;
    isFetchingRef.current = true;

    const userMessage: Message = { role: 'user', text: transcript };
    let currentMsgs: Message[] = [];

    setMessages(prev => {
      currentMsgs = [...prev, userMessage];
      return currentMsgs;
    });

    await fetchAgentReply(currentMsgs);
  };

  const fetchAgentReply = async (currentMessages: Message[]) => {
    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId, messages: currentMessages })
      });

      if (!response.ok) throw new Error("Failed to get agent response");

      const data = await response.json();
      const agentReply: string = data.reply || "";

      // Set full response text immediately (no streaming delay sensation)
      setMessages(prev => [...prev, { role: 'agent', text: agentReply }]);
      speakText(agentReply);
    } catch (err: any) {
      setError(err.message);
    } finally {
      isFetchingRef.current = false;
    }
  };

  const speakText = (text: string) => {
    if (!synthesisRef.current) return;
    
    // Temporarily pause recognition while agent speaks to prevent echo loop
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    
    synthesisRef.current.cancel();
    
    // Clean text for speech output (strip markdown formatting)
    const cleanText = text.replace(/[*#_~`>]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    const voices = synthesisRef.current.getVoices();
    const preferredVoice = voices.find(v => 
      (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha") || v.name.includes("Daniel")) && 
      v.lang.startsWith("en")
    ) || voices.find(v => v.lang.startsWith("en"));
    
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsAgentSpeaking(true);
    utterance.onend = () => {
      setIsAgentSpeaking(false);
      // Resume listening after agent finishes speaking
      if (shouldKeepListeningRef.current && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
            setIsListening(true);
          } catch (e) {}
        }, 300);
      }
    };
    utterance.onerror = () => setIsAgentSpeaking(false);

    synthesisRef.current.speak(utterance);
  };

  const startListening = useCallback(() => {
    shouldKeepListeningRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setError(null);
      } catch (err: any) {
        if (err.name === 'InvalidStateError') {
          setIsListening(true);
        } else {
          console.error("Failed to start listening", err);
        }
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldKeepListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    }
  }, []);

  const finishMeeting = async () => {
    stopListening();
    if (synthesisRef.current) synthesisRef.current.cancel();

    try {
      await fetch('/api/meetings/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId, transcript: messages })
      });
    } catch (err) {
      console.error("Failed to finish meeting", err);
    }
  };

  return {
    messages,
    isListening,
    isAgentSpeaking,
    error,
    startListening,
    stopListening,
    finishMeeting
  };
};
