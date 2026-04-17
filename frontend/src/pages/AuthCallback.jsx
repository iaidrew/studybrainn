import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    const sessionId = match ? match[1] : null;

    if (!sessionId) {
      navigate("/login", { replace: true });
      return;
    }

    (async () => {
      try {
        const { data } = await api.post("/auth/session", { session_id: sessionId });
        setUser(data.user);
        // Clean the hash
        window.history.replaceState(null, "", window.location.pathname);
        toast.success(`Welcome, ${data.user.name}.`);
        navigate("/dashboard", { replace: true, state: { user: data.user } });
      } catch (err) {
        toast.error("Google sign-in failed");
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3" data-testid="oauth-callback-status">
          § establishing session
        </div>
        <div className="font-display font-black text-2xl">Finalizing sign-in…</div>
      </div>
    </div>
  );
}
