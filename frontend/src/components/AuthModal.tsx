import React, { useEffect, useRef, useState } from "react";
import { loginWithIc, registerWithIc } from "../services/api";

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


interface Props {
  onSuccess: (user: AuthUser) => void;
  onClose: () => void;
}

type Step = "welcome" | "login" | "register";

export default function AuthModal({ onSuccess, onClose }: Props) {
  const [step, setStep] = useState<Step>("welcome");
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

  function goTo(s: Step) {
    setError("");
    setStep(s);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = ic.trim();
    if (!trimmed) { setError("Please enter your IC number."); return; }
    try {
      const found = await loginWithIc(trimmed);
      saveUser(found);
      setVisible(false);
      setTimeout(() => onSuccess(found), 280);
    } catch {
      setError("IC not registered. Please register first.");
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmedIc = ic.trim();
    const trimmedName = name.trim();
    const trimmedLocality = locality.trim();
    if (!trimmedIc) { setError("Please enter your IC number."); return; }
    if (!trimmedName) { setError("Please enter your name."); return; }
    if (!trimmedLocality) { setError("Please enter your locality."); return; }
    try {
      const user = await registerWithIc({
        icNumber: trimmedIc,
        name: trimmedName,
        locality: trimmedLocality,
      });
      saveUser(user);
      setVisible(false);
      setTimeout(() => onSuccess(user), 280);
    } catch {
      setError("Could not create account. If this IC exists, please log in.");
    }
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

        {/* ── Shared header ── */}
        <div className="auth-card-header">
          <span className="auth-brand">FIQ</span>
          <div>
            <p className="auth-title">
              {step === "welcome" ? "Welcome to FisherIQ" : step === "login" ? "Log in" : "Create account"}
            </p>
            <p className="auth-subtitle">
              {step === "welcome"
                ? "Your daily fishing decision, powered by data"
                : step === "login"
                  ? "Enter your IC number to continue"
                  : "Set up your free account"}
            </p>
          </div>
          <button className="auth-close" type="button" aria-label="Close" onClick={dismiss}>
            ✕
          </button>
        </div>

        {/* ── Step: Welcome ── */}
        {step === "welcome" && (
          <div className="auth-welcome">
            <p className="auth-welcome-question">Have you used FisherIQ before?</p>
            <div className="auth-welcome-actions">
              <button
                className="auth-welcome-btn auth-welcome-btn--yes"
                type="button"
                onClick={() => goTo("login")}
              >
                <span aria-hidden="true">👋</span>
                Yes, log me in
              </button>
              <button
                className="auth-welcome-btn auth-welcome-btn--no"
                type="button"
                onClick={() => goTo("register")}
              >
                <span aria-hidden="true">🆕</span>
                No, I'm new here
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Login ── */}
        {step === "login" && (
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
              New here?{" "}
              <button type="button" className="auth-link" onClick={() => goTo("register")}>
                Create an account
              </button>
              {" · "}
              <button type="button" className="auth-link" onClick={() => goTo("welcome")}>
                Back
              </button>
            </p>
          </form>
        )}

        {/* ── Step: Register ── */}
        {step === "register" && (
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
              Already registered?{" "}
              <button type="button" className="auth-link" onClick={() => goTo("login")}>
                Log in
              </button>
              {" · "}
              <button type="button" className="auth-link" onClick={() => goTo("welcome")}>
                Back
              </button>
            </p>
          </form>
        )}

      </div>
    </div>
  );
}
