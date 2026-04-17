import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import TopBar from "@/components/TopBar";
import { Plus, ArrowRight, TrendingUp, MessageSquare, Target, X } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("beginner");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/dashboard");
      setData(data);
    } catch (e) {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const { data: topic } = await api.post("/topics", { title, description, level });
      toast.success("Topic created.");
      setShowCreate(false);
      setTitle(""); setDescription(""); setLevel("beginner");
      navigate(`/topic/${topic.topic_id}`);
    } catch {
      toast.error("Could not create topic");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar
        right={
          <button
            onClick={() => setShowCreate(true)}
            className="brut-btn brut-btn-primary text-sm"
            data-testid="new-topic-btn"
          >
            <Plus className="w-4 h-4" /> New Topic
          </button>
        }
      />

      <main className="max-w-[1600px] mx-auto px-6 py-10 md:py-14">
        {/* Header */}
        <div className="grid grid-cols-12 gap-6 mb-10">
          <div className="col-span-12 lg:col-span-8">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">§ dashboard</span>
            <h1 className="font-display font-black text-4xl md:text-6xl tracking-tighter mt-3" data-testid="dashboard-title">
              Your learning map.
            </h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-foreground mb-10" data-testid="stats-row">
          <div className="p-6 md:p-8 bg-card md:border-r border-foreground">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">§ 01 topics</span>
              <Target className="w-4 h-4" strokeWidth={2} />
            </div>
            <div className="font-display font-black text-5xl md:text-6xl tracking-tighter" data-testid="stat-total-topics">
              {loading ? "—" : data?.total_topics ?? 0}
            </div>
            <div className="font-sans text-sm text-muted-foreground mt-1">active study areas</div>
          </div>
          <div className="p-6 md:p-8 bg-card md:border-r border-foreground border-t md:border-t-0 border-foreground">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">§ 02 messages</span>
              <MessageSquare className="w-4 h-4" strokeWidth={2} />
            </div>
            <div className="font-display font-black text-5xl md:text-6xl tracking-tighter" data-testid="stat-total-messages">
              {loading ? "—" : data?.total_messages ?? 0}
            </div>
            <div className="font-sans text-sm text-muted-foreground mt-1">tutor exchanges</div>
          </div>
          <div className="p-6 md:p-8 bg-foreground text-background border-t md:border-t-0 border-foreground">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">§ 03 avg mastery</span>
              <TrendingUp className="w-4 h-4" strokeWidth={2} />
            </div>
            <div className="font-display font-black text-5xl md:text-6xl tracking-tighter" data-testid="stat-avg-mastery">
              {loading ? "—" : `${data?.avg_mastery ?? 0}`}
              <span className="text-2xl font-medium opacity-60">/100</span>
            </div>
            <div className="font-sans text-sm opacity-75 mt-1">across all topics</div>
          </div>
        </div>

        {/* Topics Grid */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-display font-black text-2xl tracking-tight">Topics</h2>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {data?.topics?.length || 0} item{(data?.topics?.length || 0) === 1 ? "" : "s"}
              </span>
            </div>

            {loading ? (
              <div className="border border-foreground bg-card p-8 font-mono text-sm" data-testid="loading-topics">Loading…</div>
            ) : (data?.topics?.length ?? 0) === 0 ? (
              <div className="border border-foreground bg-card p-10 text-center" data-testid="empty-topics">
                <h3 className="font-display font-black text-2xl mb-2">No topics yet.</h3>
                <p className="font-sans text-sm text-muted-foreground mb-6">Create your first study area to start building memory.</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="brut-btn brut-btn-primary"
                  data-testid="empty-create-topic-btn"
                >
                  <Plus className="w-4 h-4" /> Create topic
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="topics-grid">
                {data.topics.map((t) => (
                  <button
                    key={t.topic_id}
                    onClick={() => navigate(`/topic/${t.topic_id}`)}
                    className="brut-card brut-card-hover p-6 text-left"
                    data-testid={`topic-card-${t.topic_id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {t.level}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                    <h3 className="font-display font-black text-xl tracking-tight mb-2 line-clamp-2">{t.title}</h3>
                    {t.description && (
                      <p className="font-sans text-sm text-muted-foreground mb-4 line-clamp-2">{t.description}</p>
                    )}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">mastery</span>
                        <span className="font-mono text-xs font-medium">{t.mastery?.toFixed?.(0) ?? 0}/100</span>
                      </div>
                      <div className="mastery-bar">
                        <span style={{ width: `${Math.max(2, t.mastery || 0)}%` }} />
                      </div>
                    </div>
                    <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {t.message_count || 0} msgs
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <aside className="col-span-12 lg:col-span-4">
            <div className="border border-foreground bg-card p-6 sticky top-6" data-testid="weak-spots-panel">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-black text-xl tracking-tight">Weak spots</h3>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">§ intel</span>
              </div>
              {loading ? (
                <div className="font-mono text-sm">…</div>
              ) : (data?.weak_spots?.length ?? 0) === 0 ? (
                <p className="font-sans text-sm text-muted-foreground">No weak spots yet. Start a chat to build memory.</p>
              ) : (
                <div className="space-y-3">
                  {data.weak_spots.map((w) => (
                    <div key={w.name} className="border-l-2 border-destructive pl-3 py-1">
                      <div className="font-sans text-sm font-medium line-clamp-1">{w.name}</div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        mastery {w.mastery}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Create Topic Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-foreground/60 flex items-center justify-center p-4 z-50"
          onClick={() => setShowCreate(false)}
          data-testid="create-topic-modal"
        >
          <div
            className="bg-card border border-foreground w-full max-w-lg p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCreate(false)}
              className="absolute top-4 right-4 p-1"
              aria-label="Close"
              data-testid="close-create-modal-btn"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">§ new topic</span>
            <h2 className="font-display font-black text-3xl tracking-tighter mt-2 mb-6">Start a new study area.</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest mb-2 block">Title</label>
                <input
                  className="brut-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Calculus · Derivatives"
                  required
                  data-testid="create-topic-title-input"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest mb-2 block">
                  Description <span className="text-muted-foreground normal-case">(optional)</span>
                </label>
                <textarea
                  className="brut-input"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Focus on chain rule and applications."
                  data-testid="create-topic-desc-input"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest mb-2 block">Level</label>
                <div className="grid grid-cols-3 gap-0 border border-foreground">
                  {["beginner", "intermediate", "advanced"].map((lvl, i) => (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => setLevel(lvl)}
                      className={`py-2.5 font-mono text-xs uppercase tracking-widest transition-colors ${i < 2 ? "border-r border-foreground" : ""} ${level === lvl ? "bg-foreground text-background" : "bg-card hover:bg-accent"}`}
                      data-testid={`level-${lvl}-btn`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="brut-btn brut-btn-ghost"
                  data-testid="cancel-create-topic-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="brut-btn brut-btn-primary"
                  data-testid="submit-create-topic-btn"
                >
                  {creating ? "Creating…" : <>Create <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
