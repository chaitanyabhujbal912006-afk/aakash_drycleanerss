import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SESSION = "client-support";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get(`/ai/history/${SESSION}`).then(({ data }) => setMessages(data));
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);

  const send = async () => {
    if (!input.trim() || busy) return;
    const msg = input.trim();
    setInput(""); setBusy(true); setStreaming("");
    setMessages((m) => [...m, { role: "user", content: msg, id: `u-${Date.now()}` }]);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/ai/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("wf_token")}`,
          },
          body: JSON.stringify({ session_id: SESSION, message: msg }),
        }
      );
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value);
        setStreaming(acc);
      }
      setMessages((m) => [...m, { role: "assistant", content: acc, id: `a-${Date.now()}` }]);
      setStreaming("");
    } catch (e) {
      setStreaming(`error: ${e.message}`);
    } finally { setBusy(false); }
  };

  const suggestions = ["Where are my clothes?", "When will I get my order?", "How do you handle silk sarees?"];

  return (
    <div className="flex flex-col h-[calc(100vh-160px)]" data-testid="client-chat">
      <div>
        <div className="overline flex items-center gap-2"><Sparkles className="w-3 h-3" /> AI concierge</div>
        <h1 className="font-display text-3xl font-extrabold mt-1">How can we help?</h1>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 && !streaming && (
          <div className="wf-card p-4 text-sm text-muted2">
            Ask about your order status, care advice or pricing. Try:
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => setInput(s)}
                        data-testid={`chat-suggestion-${s.slice(0, 10)}`}
                        className="px-2.5 py-1 rounded-full text-xs border border-line hover:border-brand hover:text-brand">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
              m.role === "user"
                ? "bg-brand text-white rounded-br-md"
                : "bg-white border border-line rounded-bl-md"
            }`}>
              <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
            </div>
          </div>
        ))}
        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-4 py-2.5 rounded-2xl bg-white border border-line rounded-bl-md text-sm">
              <div className="whitespace-pre-wrap leading-relaxed">{streaming}<span className="inline-block w-1.5 h-4 bg-brand ml-0.5 animate-pulse-dot"></span></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="pb-2 pt-3 border-t border-line -mx-5 px-5 bg-bg sticky bottom-16">
        <div className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)}
                 onKeyDown={(e) => e.key === "Enter" && send()}
                 placeholder="Where are my clothes?"
                 data-testid="chat-input"
                 disabled={busy} className="h-11 flex-1" />
          <Button onClick={send} disabled={busy}
                  data-testid="chat-send"
                  className="h-11 bg-brand hover:bg-brand-600 text-white">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
