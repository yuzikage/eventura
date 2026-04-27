import { useState, useEffect, useRef } from "react";
import { chatApi } from "../services/api";
import { useFonts } from "../hooks/useFonts";

const QUICK_QUESTIONS = [
  "What venues do you have?",
  "How does booking work?",
  "Show me packages",
  "What's the pricing?",
  "Photography options?",
];

// Renders bot reply 
// It supports bold and line breaks
function FormattedMessage({ text }) {
  const lines = text.split("\n");
  return (
    <div>
      {lines.map((line, i) => {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} style={{ margin: i === 0 ? 0 : "0.3rem 0 0", lineHeight: 1.6 }}>
            {parts.map((part, j) =>
              j % 2 === 1
                ? <strong key={j} style={{ fontWeight: 500 }}>{part}</strong>
                : part
            )}
          </p>
        );
      })}
    </div>
  );
}

// Main chat widget component
export default function ChatWidget() {
  useFonts();
  const [open,     setOpen]     = useState(false);
  const [input,    setInput]    = useState("");
  const [typing,   setTyping]   = useState(false);
  const [unread,   setUnread]   = useState(0);
  const bottomRef               = useRef(null);
  const inputRef                = useRef(null);

  // UI messages (what gets rendered in the chat window)
  const [messages, setMessages] = useState([
    {
      id: 1, from: "bot",
      text: "Hi there! 👋 I'm your Eventura assistant. Ask me anything about our venues, themes, packages, or how to book your event!",
      time: new Date(),
    },
  ]);

  // API conversation history (sent to the backend on every message)
  // This is kept separate from UI messages because the UI messages include
  // metadata (id, from, time) that the API doesn't need. The API only wants
  // { role: "user" | "assistant", content: string }.
  const [history, setHistory] = useState([]);

  // Scroll to bottom on new message or when opening the chat
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || typing) return;
    setInput("");

    // 1. Add user message to the UI immediately
    const userMsg = { id: Date.now(), from: "user", text: userText, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setTyping(true);

    // 2. Build the new history including this message
    const newHistory = [...history, { role: "user", content: userText }];
    setHistory(newHistory);

    try {
      // 3. Send the full conversation history to POST /api/v1/chat
      //    The backend injects live venue/theme/package data into the system
      //    prompt on every request, so the AI always has current information.
      const res = await chatApi.send(newHistory);
      const replyText = res.reply || "Sorry, I couldn't get a response. Please try again.";

      // 4. Append assistant reply to history for next turn
      setHistory(prev => [...prev, { role: "assistant", content: replyText }]);

      // 5. Add bot message to UI
      setTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        from: "bot",
        text: replyText,
        time: new Date(),
      }]);

      if (!open) setUnread(n => n + 1);

    } catch (err) {
      setTyping(false);

      // Show a user-friendly error in chat rather than crashing
      let errorText = "Sorry, I'm having trouble connecting right now. Please try again in a moment.";
      if (err.status === 429) {
        errorText = "I'm getting a lot of questions right now — please give me a moment and try again!";
      } else if (err.status === 503) {
        errorText = "The AI assistant isn't configured on this server yet. Please contact us directly.";
      }

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        from: "bot",
        text: errorText,
        time: new Date(),
      }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date) =>
    date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      {/* ── Chat window ── */}
      {open && (
        <div style={{
          position: "fixed", bottom: "90px", right: "24px",
          width: "clamp(300px, 90vw, 380px)",
          height: "520px",
          background: "#fff",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(28,10,0,0.2), 0 4px 16px rgba(28,10,0,0.1)",
          display: "flex", flexDirection: "column",
          overflow: "hidden", zIndex: 999,
          animation: "chatSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
          fontFamily: "'DM Sans', sans-serif",
          border: "1px solid rgba(217,119,6,0.15)",
        }}>

          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #1C0A00, #3D1A00)",
            padding: "1rem 1.2rem",
            display: "flex", alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "50%",
                background: "linear-gradient(135deg, #F59E0B, #D97706)",
                display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "1.1rem",
                flexShrink: 0,
              }}>✦</div>
              <div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "1rem", fontWeight: 700, color: "#FFFBEB",
                }}>Eventura Assistant</div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981" }} />
                  <span style={{ fontSize: "0.7rem", color: "rgba(255,251,235,0.5)" }}>
                    {typing ? "Typing..." : "Online"}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: "rgba(255,251,235,0.08)",
              border: "none", borderRadius: "8px",
              color: "rgba(255,251,235,0.6)",
              width: "30px", height: "30px",
              display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer",
              fontSize: "1rem", transition: "all 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,251,235,0.15)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,251,235,0.08)"}
            >✕</button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto",
            padding: "1rem",
            display: "flex", flexDirection: "column", gap: "0.75rem",
            background: "#FFFBF5",
          }}>
            {messages.map(msg => (
              <div key={msg.id} style={{
                display: "flex",
                flexDirection: msg.from === "user" ? "row-reverse" : "row",
                alignItems: "flex-end", gap: "0.4rem",
              }}>
                {/* Bot avatar */}
                {msg.from === "bot" && (
                  <div style={{
                    width: "26px", height: "26px", borderRadius: "50%",
                    background: "linear-gradient(135deg, #F59E0B, #D97706)",
                    display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: "0.7rem",
                    flexShrink: 0, marginBottom: "16px",
                  }}>✦</div>
                )}

                <div style={{
                  maxWidth: "78%", display: "flex",
                  flexDirection: "column", gap: "2px",
                  alignItems: msg.from === "user" ? "flex-end" : "flex-start",
                }}>
                  <div style={{
                    padding: "0.65rem 0.9rem",
                    borderRadius: msg.from === "user"
                      ? "16px 16px 4px 16px"
                      : "16px 16px 16px 4px",
                    background: msg.from === "user"
                      ? "linear-gradient(135deg, #F59E0B, #D97706)"
                      : "#fff",
                    color: msg.from === "user" ? "#1C1917" : "#1C0A00",
                    fontSize: "0.83rem", lineHeight: 1.5,
                    boxShadow: msg.from === "user"
                      ? "0 2px 8px rgba(245,158,11,0.25)"
                      : "0 2px 8px rgba(28,10,0,0.06)",
                    border: msg.from === "bot" ? "1px solid rgba(217,119,6,0.1)" : "none",
                  }}>
                    {msg.from === "bot"
                      ? <FormattedMessage text={msg.text} />
                      : msg.text
                    }
                  </div>
                  <div style={{
                    fontSize: "0.62rem",
                    color: "rgba(120,53,15,0.4)",
                    padding: "0 4px",
                  }}>{formatTime(msg.time)}</div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: "0.4rem" }}>
                <div style={{
                  width: "26px", height: "26px", borderRadius: "50%",
                  background: "linear-gradient(135deg, #F59E0B, #D97706)",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "0.7rem", flexShrink: 0,
                }}>✦</div>
                <div style={{
                  padding: "0.65rem 0.9rem",
                  borderRadius: "16px 16px 16px 4px",
                  background: "#fff",
                  border: "1px solid rgba(217,119,6,0.1)",
                  boxShadow: "0 2px 8px rgba(28,10,0,0.06)",
                  display: "flex", gap: "4px", alignItems: "center",
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: "6px", height: "6px", borderRadius: "50%",
                      background: "#D97706", opacity: 0.5,
                      animation: `typingDot 1.2s ${i * 0.2}s ease-in-out infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick questions — shown only at the start of a fresh conversation */}
          {messages.length <= 2 && (
            <div style={{
              padding: "0.6rem 0.8rem 0",
              background: "#FFFBF5",
              display: "flex", gap: "0.4rem",
              flexWrap: "wrap",
              flexShrink: 0,
            }}>
              {QUICK_QUESTIONS.map(q => (
                <button key={q} onClick={() => sendMessage(q)} style={{
                  padding: "0.3rem 0.7rem",
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(217,119,6,0.2)",
                  borderRadius: "100px", fontSize: "0.72rem",
                  color: "#D97706", cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.15s", fontWeight: 400,
                  whiteSpace: "nowrap",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,158,11,0.15)"; e.currentTarget.style.borderColor = "rgba(217,119,6,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(245,158,11,0.08)"; e.currentTarget.style.borderColor = "rgba(217,119,6,0.2)"; }}
                >{q}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: "0.75rem",
            borderTop: "1px solid rgba(217,119,6,0.1)",
            background: "#fff",
            display: "flex", gap: "0.5rem",
            alignItems: "flex-end",
            flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              rows={1}
              style={{
                flex: 1, padding: "0.6rem 0.8rem",
                border: "1.5px solid rgba(217,119,6,0.2)",
                borderRadius: "12px", resize: "none",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.85rem", color: "#1C0A00",
                outline: "none", lineHeight: 1.5,
                background: "#FFFBF5",
                transition: "border 0.2s",
                maxHeight: "80px", overflowY: "auto",
              }}
              onFocus={e => e.target.style.border = "1.5px solid #F59E0B"}
              onBlur={e => e.target.style.border = "1.5px solid rgba(217,119,6,0.2)"}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || typing}
              style={{
                width: "38px", height: "38px", borderRadius: "12px",
                background: input.trim() && !typing
                  ? "linear-gradient(135deg, #F59E0B, #D97706)"
                  : "rgba(217,119,6,0.15)",
                border: "none", cursor: input.trim() && !typing ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "1rem",
                flexShrink: 0, transition: "all 0.2s",
                boxShadow: input.trim() && !typing ? "0 2px 8px rgba(245,158,11,0.3)" : "none",
              }}
            >→</button>
          </div>
        </div>
      )}

      {/* FAB toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed", bottom: "24px", right: "24px",
          width: "56px", height: "56px", borderRadius: "50%",
          background: open
            ? "linear-gradient(135deg, #3D1A00, #1C0A00)"
            : "linear-gradient(135deg, #F59E0B, #D97706)",
          border: "none", cursor: "pointer", zIndex: 1000,
          display: "flex", alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(245,158,11,0.4)",
          transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      >
        <span style={{
          fontSize: open ? "1.1rem" : "1.3rem",
          color: open ? "#FCD34D" : "#1C1917",
          transition: "all 0.2s", lineHeight: 1,
        }}>
          {open ? "✕" : "✦"}
        </span>

        {/* Unread badge */}
        {!open && unread > 0 && (
          <div style={{
            position: "absolute", top: "-2px", right: "-2px",
            width: "18px", height: "18px", borderRadius: "50%",
            background: "#EF4444", color: "#fff",
            fontSize: "0.65rem", fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #fff",
            animation: "badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
          }}>{unread}</div>
        )}
      </button>

      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes badgePop {
          from { transform: scale(0); }
          to   { transform: scale(1); }
        }
      `}</style>
    </>
  );
}
