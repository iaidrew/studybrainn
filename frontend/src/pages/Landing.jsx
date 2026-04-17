import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Brain, ArrowRight, Zap, BookOpen, Target, History } from "lucide-react";

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <nav className="border-b border-foreground bg-background" data-testid="landing-nav">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="brand-link">
            <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center">
              <Brain className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <span className="font-display font-black text-xl tracking-tighter">StudyBrain</span>
            <span className="hidden md:inline font-mono text-[10px] uppercase tracking-widest ml-2 text-muted-foreground">v.01 / hindsight engine</span>
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <button className="brut-btn brut-btn-primary" onClick={() => navigate("/dashboard")} data-testid="nav-dashboard-btn">
                Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <Link to="/login" className="brut-btn brut-btn-ghost" data-testid="nav-login-btn">Log in</Link>
                <Link to="/signup" className="brut-btn brut-btn-primary" data-testid="nav-signup-btn">
                  Start free <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative border-b border-foreground overflow-hidden">
        <div className="absolute inset-0 grid-pattern pointer-events-none" />
        <div className="relative max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-32 grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8">
            <div className="inline-flex items-center gap-2 border border-foreground px-3 py-1 mb-8 bg-card" data-testid="hero-pill">
              <span className="w-2 h-2 bg-primary" />
              <span className="font-mono text-xs uppercase tracking-widest">Hindsight Memory · Active</span>
            </div>
            <h1 className="font-display font-black text-5xl md:text-7xl lg:text-[96px] leading-[0.9] tracking-tighter mb-8" data-testid="hero-title">
              An AI tutor that<br />
              <span className="brut-mark">actually remembers</span><br />
              what you know.
            </h1>
            <p className="font-sans text-lg md:text-xl max-w-2xl text-muted-foreground mb-10 leading-relaxed" data-testid="hero-subtitle">
              StudyBrain is not a chatbot. It's a learning lifecycle engine — it tracks your concepts, revisits your mistakes, and adapts every answer to the shape of your mind.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate(user ? "/dashboard" : "/signup")}
                className="brut-btn brut-btn-primary text-base px-6 py-3"
                data-testid="hero-cta-primary"
              >
                {user ? "Open dashboard" : "Start learning free"} <ArrowRight className="w-5 h-5" />
              </button>
              <a href="#how" className="brut-btn brut-btn-ghost text-base px-6 py-3" data-testid="hero-cta-secondary">
                How it remembers
              </a>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-4 hidden lg:block">
            <div className="border border-foreground bg-card p-6 relative" data-testid="hero-memory-card">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs uppercase tracking-widest">memory.log</span>
                <span className="font-mono text-[10px] text-muted-foreground">live</span>
              </div>
              <div className="space-y-3 font-mono text-xs">
                <div className="border-l-2 border-primary pl-3">
                  <div className="text-[10px] uppercase text-muted-foreground">concept</div>
                  <div className="font-medium">Derivatives · mastery 72</div>
                </div>
                <div className="border-l-2 border-destructive pl-3">
                  <div className="text-[10px] uppercase text-muted-foreground">mistake</div>
                  <div className="font-medium">confused chain rule w/ product rule</div>
                </div>
                <div className="border-l-2 border-accent pl-3">
                  <div className="text-[10px] uppercase text-muted-foreground">strength</div>
                  <div className="font-medium">limits, basic integration</div>
                </div>
                <div className="pt-3 border-t border-foreground">
                  <div className="text-[10px] uppercase text-muted-foreground">next session plan</div>
                  <div className="font-medium mt-1">Revisit chain rule w/ worked examples.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-b border-foreground">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28">
          <div className="grid grid-cols-12 gap-6 mb-16">
            <div className="col-span-12 lg:col-span-5">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">§ 01 — architecture</span>
              <h2 className="font-display font-black text-4xl md:text-6xl tracking-tighter mt-4 mb-6">
                Four layers,<br />one continuous memory.
              </h2>
            </div>
            <div className="col-span-12 lg:col-span-7 lg:col-start-6">
              <p className="font-sans text-lg text-muted-foreground leading-relaxed">
                Every interaction flows through a pipeline designed to convert noise into knowledge about <em>you</em>. The tutor doesn't just reply — it writes back to your learner model.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-foreground" data-testid="pipeline-grid">
            {[
              { n: "01", t: "Chat Interface", d: "You ask. You push back. You explore.", icon: BookOpen },
              { n: "02", t: "AI Tutor Engine", d: "Claude Sonnet 4.5 answers — with your memory injected into every prompt.", icon: Zap },
              { n: "03", t: "Hindsight Memory", d: "Concepts, mistakes, strengths, summaries — extracted after every turn.", icon: History },
              { n: "04", t: "Adaptive Response", d: "Difficulty, examples, and pacing bend toward your weak spots.", icon: Target },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.n} className={`p-8 bg-card ${i < 3 ? "md:border-r border-foreground" : ""} ${i < 2 ? "border-b md:border-b-0 lg:border-b-0 border-foreground" : ""} lg:border-b-0`}>
                  <div className="flex items-start justify-between mb-6">
                    <span className="font-mono text-xs text-muted-foreground">{s.n}</span>
                    <Icon className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <h3 className="font-display font-black text-xl tracking-tight mb-2">{s.t}</h3>
                  <p className="font-sans text-sm text-muted-foreground leading-relaxed">{s.d}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FEATURES BLOCK */}
      <section className="border-b border-foreground bg-foreground text-background">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28 grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-6">
            <span className="font-mono text-xs uppercase tracking-widest opacity-60">§ 02 — what it does</span>
            <h2 className="font-display font-black text-4xl md:text-6xl tracking-tighter mt-4 mb-8">
              Designed for<br />the way you<br />actually learn.
            </h2>
            <p className="font-sans text-base opacity-80 leading-relaxed max-w-lg">
              Forget losing context every new chat. StudyBrain builds a dense, structured model of your understanding — and teaches from it.
            </p>
          </div>
          <div className="col-span-12 lg:col-span-6 space-y-4">
            {[
              ["Per-topic memory", "Each subject gets its own hindsight stream — math doesn't bleed into history."],
              ["Mistake tracking", "Wrong answers become flashcards the tutor circles back to days later."],
              ["Adaptive quizzes", "Weak concepts get harder questions. Strong ones earn less airtime."],
              ["Mastery metrics", "Live mastery 0–100 per concept, aggregated per topic."],
            ].map(([t, d]) => (
              <div key={t} className="border-l-2 border-accent pl-5 py-2">
                <div className="font-display font-black text-xl tracking-tight">{t}</div>
                <div className="font-sans text-sm opacity-75 mt-1">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-foreground">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28 grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 lg:col-span-8">
            <h2 className="font-display font-black text-5xl md:text-7xl tracking-tighter mb-8">
              Ready to have a tutor<br />that <span className="brut-mark">grows with you?</span>
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
            <button
              onClick={() => navigate(user ? "/dashboard" : "/signup")}
              className="brut-btn brut-btn-primary text-base px-6 py-4 w-full"
              data-testid="footer-cta-signup"
            >
              {user ? "Open dashboard" : "Create free account"} <ArrowRight className="w-5 h-5" />
            </button>
            {!user && (
              <Link to="/login" className="brut-btn brut-btn-ghost text-base px-6 py-4 w-full" data-testid="footer-cta-login">
                I already have an account
              </Link>
            )}
          </div>
        </div>
      </section>

      <footer className="py-10 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            StudyBrain · hindsight engine · 2026
          </div>
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            a learning lifecycle · not a chatbot
          </div>
        </div>
      </footer>
    </div>
  );
}
