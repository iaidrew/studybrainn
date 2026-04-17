import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Brain, LogOut } from "lucide-react";

export default function TopBar({ right = null }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="border-b border-foreground bg-background" data-testid="app-topbar">
      <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2" data-testid="topbar-brand">
          <div className="w-7 h-7 bg-foreground text-background flex items-center justify-center">
            <Brain className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <span className="font-display font-black text-lg tracking-tighter">StudyBrain</span>
          <span className="hidden md:inline font-mono text-[10px] uppercase tracking-widest ml-2 text-muted-foreground">
            control room
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {right}
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end leading-tight">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {user.auth_provider === "google" ? "google" : "email"}
                </span>
                <span className="font-sans text-sm font-medium" data-testid="topbar-user-name">{user.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="brut-btn brut-btn-ghost text-sm"
                data-testid="topbar-logout-btn"
                title="Log out"
              >
                <LogOut className="w-4 h-4" /> <span className="hidden md:inline">Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
