import React, { useEffect, useRef, useState } from "react";

export interface AuthUser {
  id: string;
  name: string;
  locality: string;
}

const STORAGE_KEY = "fisheriq_user";

export function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function saveUser(user: AuthUser): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

function loadAllUsers(): Record<string, AuthUser> {
  try {
    const raw = localStorage.getItem("fisheriq_users");
    return raw ? (JSON.parse(raw) as Record<string, AuthUser>) : {};
  } catch {
    return {};
  }
}

function saveAllUsers(users: Record<string, AuthUser>): void {
  localStorage.setItem("fisheriq_users", JSON.stringify(users));
}

interface Props {
  onSuccess: (user: AuthUser) => void;
  onClose: () => void;
}

type Tab = "login" | "register";

export default function AuthModal({ onSuccess, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("login");
  const [ic, setIc] = useState("");
  const [name, setName] = useState("");
  const [locality, setLocality] = useState("");
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  function dismiss() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) dismiss();
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = ic.trim();
    if (!trimmed) { setError("Please enter your IC number."); return; }
    const users = loadAllUsers();
    const found = users[trimmed];
    if (!found) { setError("IC not registered. Please register first."); return; }
    saveUser(found);
    setVisible(false);
    setTimeout(() => onSuccess(found), 280);
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmedIc = ic.trim();
    const trimmedName = name.trim();
    const trimmedLocality = locality.trim();
    if (!trimmedIc) { setError("Please enter your IC number."); return; }
    if (!trimmedName) { setError("Please enter your name."); return; }
    if (!trimmedLocality) { setError("Please enter your locality."); return; }
    const users = loadAllUsers();
    if (users[trimmedIc]) { setError("IC already registered. Please log in."); return; }
    const user: AuthUser = { id: trimmedIc, name: trimmedName, locality: trimmedLocality };
    users[trimmedIc] = user;
    saveAllUsers(users);
    saveUser(user);
    setVisible(false);
    setTimeout(() => onSuccess(user), 280);
  }

  return (
    <div
      ref={overlayRef}
      className={visible ? "auth-overlay auth-overlay--visible" : "auth-overlay"}
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-label="Sign in to FisherIQ"
    >
      <div className={visible ? "auth-card auth-card--visible" : "auth-card"}>
        <div className="auth-card-header">
          <span className="auth-brand">FIQ</span>
          <div>
            <p className="auth-title">Welcome to FisherIQ</p>
            <p className="auth-subtitle">Sign in to see today's fishing decision</p>
          </div>
          <button className="auth-close" type="button" aria-label="Close" onClick={dismiss}>
            ✕
          </button>
        </div>

        <div className="auth-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "login"}
            className={tab === "login" ? "auth-tab auth-tab--active" : "auth-tab"}
            type="button"
            onClick={() => { setTab("login"); setError(""); }}
          >
            Log in
          </button>
          <button
            role="tab"
            aria-selected={tab === "register"}
            className={tab === "register" ? "auth-tab auth-tab--active" : "auth-tab"}
            type="button"
            onClick={() => { setTab("register"); setError(""); }}
          >
            Register
          </button>
        </div>

        {tab === "login" ? (
          <form className="auth-form" onSubmit={handleLogin} noValidate>
            <label className="auth-label">
              IC Number
              <input
                className="auth-input"
                type="text"
                placeholder="e.g. 901231015678"
                value={ic}
                onChange={(e) => setIc(e.target.value)}
                autoFocus
                autoComplete="username"
              />
            </label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit">Log in</button>
            <p className="auth-switch">
              No account?{" "}
              <button type="button" className="auth-link" onClick={() => { setTab("register"); setError(""); }}>
                Register here
              </button>
            </p>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegister} noValidate>
            <label className="auth-label">
              IC Number
              <input
                className="auth-input"
                type="text"
                placeholder="e.g. 901231015678"
                value={ic}
                onChange={(e) => setIc(e.target.value)}
                autoFocus
                autoComplete="username"
              />
            </label>
            <label className="auth-label">
              Full Name
              <input
                className="auth-input"
                type="text"
                placeholder="e.g. Ahmad bin Ismail"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="auth-label">
              Fishing Locality
              <input
                className="auth-input"
                type="text"
                placeholder="e.g. Kuala Sepetang, Perak"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
              />
            </label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit">Create account</button>
            <p className="auth-switch">
              Already have an account?{" "}
              <button type="button" className="auth-link" onClick={() => { setTab("login"); setError(""); }}>
                Log in
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
