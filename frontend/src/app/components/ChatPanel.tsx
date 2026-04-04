"use client";

import { useState, useRef, useEffect } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [useVoice, setUseVoice] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    fetch("/api/voice/status")
      .then((r) => r.json())
      .then((data) => setVoiceAvailable(data.voice_available))
      .catch(() => setVoiceAvailable(false));
  }, []);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      if (useVoice && voiceAvailable) {
        const res = await fetch("/api/chat/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });

        const contentType = res.headers.get("content-type") || "";
        let responseText = "";

        if (contentType.includes("audio")) {
          responseText = res.headers.get("X-Text-Response") || "Voice response";
          const audioBlob = await res.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.play();
        } else {
          const data = await res.json();
          responseText = data.text;
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: responseText,
            timestamp: new Date(),
            isVoice: contentType.includes("audio"),
          },
        ]);
      } else {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
        const data = await res.json();

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.text,
            timestamp: new Date(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Failed to reach the orchestrator. Is the server running?",
          timestamp: new Date(),
        },
      ]);
    }

    setIsLoading(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (voiceAvailable) {
          setInput("[Voice input — type your message instead]");
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      console.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="neo-card flex flex-col h-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "2px solid var(--line)" }}>
        <p className="text-sm font-bold mono">CHAT</p>
        {voiceAvailable && (
          <button
            onClick={() => setUseVoice(!useVoice)}
            className="neo-pill text-xs font-bold"
            style={{ background: useVoice ? "var(--accent)" : "var(--panel)" }}
          >
            {useVoice ? "🔊 Voice" : "🔇 Text"}
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm font-bold">Ask the orchestrator</p>
            <p className="text-xs mono mt-1" style={{ color: "var(--muted)" }}>What agents are available?</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="neo-pill max-w-xs text-xs p-2">
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] mono" style={{ color: "var(--muted)" }}>
                  {msg.timestamp.toLocaleTimeString()}
                </span>
                {msg.isVoice && <span className="text-[10px]">🔊</span>}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="neo-pill text-xs p-2">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4" style={{ borderTop: "2px solid var(--line)" }}>
        <div className="flex gap-2">
          {voiceAvailable && useVoice && (
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              className="neo-btn px-3 py-2 font-bold"
              style={{ background: isRecording ? "var(--danger)" : "var(--brand)" }}
            >
              {isRecording ? "🔴" : "🎤"}
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Type your message..."
            className="flex-1 neo-pill px-3 py-2 text-sm"
            style={{ background: "var(--bg)", color: "var(--ink)" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="neo-btn px-6 py-2 font-bold mono"
            style={{ background: "var(--accent)", color: "var(--ink)" }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
