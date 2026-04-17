import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Brain, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function Signup() {
  const { registerWithPassword } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await registerWithPassword(email, password, name);
      toast.success("Welcome to StudyBrain.");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 order-2 lg:order-1">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link to="/" className="flex items-center gap-2" data-testid="brand-link-signup-mobile">
              <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center">
                <Brain className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <span className="font-display font-black text-xl tracking-tighter">StudyBrain</span>
            </Link>
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">§ 01 · create account</span>
          <h1 className="font-display font-black text-4xl md:text-5xl tracking-tighter mt-3 mb-8">Start your memory.</h1>

          <button
            onClick={handleGoogle}
            type="button"
            className="brut-btn brut-btn-ghost w-full mb-4 py-3 bg-card"
            data-testid="google-signup-btn"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-foreground" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">or with email</span>
            <div className="flex-1 h-px bg-foreground" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="signup-form">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest mb-2 block">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="brut-input"
                placeholder="Ada Lovelace"
                data-testid="signup-name-input"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest mb-2 block">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="brut-input"
                placeholder="you@studybrain.app"
                data-testid="signup-email-input"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest mb-2 block">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="brut-input"
                placeholder="min. 6 characters"
                data-testid="signup-password-input"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="brut-btn brut-btn-primary w-full py-3"
              data-testid="signup-submit-btn"
            >
              {submitting ? "Creating…" : <>Create account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
          <p className="font-sans text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="underline underline-offset-4 font-medium text-foreground" data-testid="link-to-login">
              Log in
            </Link>
          </p>
        </div>
      </div>
      <div className="hidden lg:flex lg:w-1/2 border-l border-foreground relative bg-accent text-accent-foreground overflow-hidden order-1 lg:order-2">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="relative p-12 flex flex-col justify-between w-full">
          <div />
          <div>
            <span className="font-mono text-xs uppercase tracking-widest opacity-70">what gets built</span>
            <h2 className="font-display font-black text-5xl tracking-tighter mt-4 max-w-md">
              A learner model, shaped only by you.
            </h2>
            <ul className="font-mono text-xs mt-8 space-y-2 uppercase tracking-wide">
              <li>→ concept mastery 0–100</li>
              <li>→ mistake queue · auto-resurface</li>
              <li>→ strengths confirmed</li>
              <li>→ running session summary</li>
            </ul>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest opacity-60">
            § memory · initialized on first message
          </div>
        </div>
      </div>
    </div>
  );
}
