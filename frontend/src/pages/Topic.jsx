import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import TopBar from "@/components/TopBar";
import { Send, ArrowLeft, ListChecks, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";

function MemoryPanel({ memory }) {
  if (!memory) return null;
  const concepts = memory.concepts || [];
  const mistakes = memory.mistakes || [];
  const strengths = memory.strengths || [];
  return (
    <div className="space-y-6" data-testid="memory-panel">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-black text-lg tracking-tight">Concepts</h3>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">§ hindsight</span>
        </div>
        {concepts.length === 0 ? (
          <p className="font-sans text-sm text-muted-foreground">No concepts tracked yet. Start chatting.</p>
        ) : (
          <div className="space-y-3" data-testid="concepts-list">
            {concepts
              .slice()
              .sort((a, b) => (a.mastery || 0) - (b.mastery || 0))
              .slice(0, 10)
              .map((c) => (
                <div key={c.name} className="border-l-2 border-primary pl-3 py-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-sans text-sm font-medium line-clamp-1">{c.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{c.mastery}/100</span>
                  </div>
                  <div className="mastery-bar mt-1.5">
                    <span style={{ width: `${Math.max(2, c.mastery)}%` }} />
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {mistakes.filter((m) => !m.resolved).length > 0 && (
        <div>
          <h3 className="font-display font-black text-lg tracking-tight mb-3">Mistakes to revisit</h3>
          <div className="space-y-2" data-testid="mistakes-list">
            {mistakes
              .filter((m) => !m.resolved)
              .slice(-4)
              .reverse()
              .map((m, i) => (
                <div key={i} className="border-l-2 border-destructive pl-3 py-0.5">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {m.concept}
                  </div>
                  <div className="font-sans text-xs mt-0.5 line-clamp-2">{m.description}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {strengths.length > 0 && (
        <div>
          <h3 className="font-display font-black text-lg tracking-tight mb-3">Strengths</h3>
          <div className="flex flex-wrap gap-2" data-testid="strengths-list">
            {strengths.slice(-8).map((s, i) => (
              <span key={i} className="border border-foreground bg-accent text-accent-foreground px-2 py-0.5 font-mono text-[11px]">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {memory.summary && (
        <div>
          <h3 className="font-display font-black text-lg tracking-tight mb-2">Session summary</h3>
          <p className="font-sans text-sm text-muted-foreground leading-relaxed" data-testid="memory-summary">
            {memory.summary}
          </p>
        </div>
      )}
    </div>
  );
}

export default function TopicPage() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [messages, setMessages] = useState([]);
  const [memory, setMemory] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const [t, m, mem] = await Promise.all([
        api.get(`/topics/${topicId}`),
        api.get(`/topics/${topicId}/messages`),
        api.get(`/topics/${topicId}/memory`),
      ]);
      setTopic(t.data);
      setMessages(m.data);
      setMemory(mem.data);
    } catch {
      toast.error("Failed to load topic");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [topicId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  const handleSend = async (e) => {
    e?.preventDefault?.();
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    // optimistic user message
    const optimistic = {
      message_id: `tmp-${Date.now()}`,
      topic_id: topicId,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);
    try {
      const { data } = await api.post(`/topics/${topicId}/chat`, { message: text });
      setMessages((prev) => {
        // replace optimistic with real
        const filtered = prev.filter((m) => m.message_id !== optimistic.message_id);
        return [...filtered, data.user_message, data.assistant_message];
      });
      setMemory(data.memory);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Tutor error");
      setMessages((prev) => prev.filter((m) => m.message_id !== optimistic.message_id));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this topic and all its memory?")) return;
    try {
      await api.delete(`/topics/${topicId}`);
      toast.success("Topic deleted.");
      navigate("/dashboard");
    } catch {
      toast.error("Could not delete");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <TopBar />

      <div className="border-b border-foreground bg-card">
        <div className="max-w-[1600px] mx-auto px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <Link to="/dashboard" className="brut-btn brut-btn-ghost shrink-0" data-testid="back-to-dashboard-btn">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  § {topic?.level || "topic"}
                </span>
                {topic && (
                  <span className="font-mono text-[10px] uppercase tracking-widest">
                    mastery <strong className="text-foreground">{topic.mastery?.toFixed?.(0) ?? 0}</strong>
                  </span>
                )}
              </div>
              <h1 className="font-display font-black text-2xl md:text-3xl tracking-tighter line-clamp-1" data-testid="topic-title">
                {topic?.title || "Loading…"}
              </h1>
              {topic?.description && (
                <p className="font-sans text-sm text-muted-foreground mt-1 line-clamp-1">{topic.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/quiz/${topicId}`)}
              className="brut-btn brut-btn-accent text-sm"
              data-testid="start-quiz-btn"
            >
              <ListChecks className="w-4 h-4" /> Quiz me
            </button>
            <button
              onClick={handleDelete}
              className="brut-btn brut-btn-ghost text-sm"
              title="Delete topic"
              data-testid="delete-topic-btn"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-6 grid grid-cols-12 gap-6 min-h-0">
        <section className="col-span-12 lg:col-span-8 flex flex-col min-h-0 border border-foreground bg-card">
          <div className="flex-1 overflow-y-auto p-6 space-y-4" data-testid="chat-messages">
            {loading ? (
              <div className="font-mono text-sm">Loading…</div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-start h-full justify-center text-left max-w-xl">
                <BookOpen className="w-6 h-6 mb-4" strokeWidth={2} />
                <h3 className="font-display font-black text-3xl tracking-tighter mb-2">
                  First interaction.
                </h3>
                <p className="font-sans text-sm text-muted-foreground mb-6">
                  Ask anything about <em>{topic?.title}</em>. The tutor will start tracking your concepts, mistakes, and strengths from your very first message.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    `Explain the basics of ${topic?.title}.`,
                    `Give me a short quiz to gauge where I am.`,
                    `What's a common misconception in ${topic?.title}?`,
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="brut-btn brut-btn-ghost text-xs bg-background"
                      data-testid="suggestion-btn"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.message_id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-slide-up`}
                  data-testid={`msg-${m.role}`}
                >
                  <div
                    className={`max-w-[85%] p-4 border border-foreground ${
                      m.role === "user"
                        ? "bg-foreground text-background"
                        : "bg-background"
                    }`}
                  >
                    <div className="font-mono text-[9px] uppercase tracking-widest opacity-60 mb-1">
                      {m.role === "user" ? "you" : "tutor"}
                    </div>
                    <div className="font-sans text-sm whitespace-pre-wrap leading-relaxed">
                      {m.content}
                    </div>
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex justify-start" data-testid="tutor-thinking">
                <div className="max-w-[85%] p-4 border border-foreground bg-background">
                  <div className="font-mono text-[9px] uppercase tracking-widest opacity-60 mb-1">tutor</div>
                  <div className="font-mono text-sm">thinking<span className="animate-blink">▊</span></div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={handleSend} className="border-t border-foreground p-3 flex gap-2 bg-background" data-testid="chat-form">
            <input
              className="brut-input flex-1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask about ${topic?.title || "this topic"}…`}
              disabled={sending}
              data-testid="chat-input"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="brut-btn brut-btn-primary"
              data-testid="chat-send-btn"
            >
              <Send className="w-4 h-4" /> Send
            </button>
          </form>
        </section>

        <aside className="col-span-12 lg:col-span-4 border border-foreground bg-card p-6 overflow-y-auto" data-testid="memory-sidebar">
          <MemoryPanel memory={memory} />
        </aside>
      </main>
    </div>
  );
}
