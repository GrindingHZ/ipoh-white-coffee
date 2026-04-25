import React, { useEffect, useRef, useState } from "react";
import "./styles.css";
import heroBg from "./assets/fisheriq-hero.png";
import { STORAGE_USER_KEY } from "./constants";
import { getMe, logoutUser } from "./services/api";
import AuthModal, { loadStoredUser } from "./components/AuthModal";
import type { AuthUser } from "./components/AuthModal";
import AppNav from "./components/AppNav";
import SignalStage from "./components/SignalStage";
import DecisionDetails from "./components/DecisionDetails";
import { useScrollNav } from "./hooks/useScrollNav";
import { useGlowCursor } from "./hooks/useGlowCursor";
import { useFuelPrice } from "./hooks/useFuelPrice";
import { useFishingDecision } from "./hooks/useFishingDecision";
import { buildTripMetrics, getRecommendationConditions } from "./utils/recommendation";
import { getGreeting } from "./utils/format";

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => loadStoredUser());
  const [showAuthModal, setShowAuthModal] = useState(() => loadStoredUser() === null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const cursorRef = useGlowCursor();
  const { navHidden, navHovered, setNavHovered, appScreenRef } = useScrollNav();
  const { diesel, ron95 } = useFuelPrice(currentUser?.locality);
  const decision = useFishingDecision();

  const {
    canvasRef,
    isLoading,
    loadingStep,
    hasChecked,
    burstComplete,
    showVerdict,
    showMap,
    showMetrics,
    seeMoreReady,
    recommendation,
    recommendationError,
    userCoords,
    nearestCoast,
    fetchDecision,
    reset: resetDecision,
  } = decision;

  const selectedZoneName = nearestCoast?.name ?? (userCoords ? "Your Location" : "Detecting...");
  const tripMetrics = buildTripMetrics(recommendation, selectedZoneName);
  const conditions = [...getRecommendationConditions(recommendation), diesel, ron95];

  useEffect(() => {
    if (!loadStoredUser()) return;
    getMe()
      .then((profile) => {
        setCurrentUser(profile);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(profile));
      })
      .catch(() => {
        resetAppState();
        setShowAuthModal(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetAppState() {
    localStorage.removeItem(STORAGE_USER_KEY);
    setCurrentUser(null);
    setShowMore(false);
    resetDecision();
  }

  function handleLogout() {
    setShowProfileMenu(false);
    logoutUser().finally(() => {
      resetAppState();
      setShowAuthModal(true);
    });
  }

  function requireAuth(then: () => void) {
    if (currentUser) then();
    else setShowAuthModal(true);
  }

  function handleCheck() {
    requireAuth(fetchDecision);
  }

  const panelMessage = recommendationError
    ? `Could not load recommendation: ${recommendationError}`
    : hasChecked
      ? "\u00a0"
      : "Tap Check to see today's fishing decision.";

  return (
    <main className="app-shell" style={{ "--hero-bg": `url(${heroBg})` } as React.CSSProperties}>
      <div ref={cursorRef} className="cursor-glow" aria-hidden="true" />

      <div
        className="nav-hover-zone"
        onMouseEnter={() => setNavHovered(true)}
        onMouseLeave={() => setNavHovered(false)}
      />

      <AppNav
        navHidden={navHidden}
        navHovered={navHovered}
        setNavHovered={setNavHovered}
        conditions={conditions}
        currentUser={currentUser}
        showProfileMenu={showProfileMenu}
        setShowProfileMenu={setShowProfileMenu}
        profileMenuRef={profileMenuRef}
        onLogout={handleLogout}
      />

      <section ref={appScreenRef} className="app-screen" aria-label="FisherIQ daily dashboard">
        <aside className="decision-panel" aria-label="FisherIQ daily decision">
          <div className="panel-heading">
            <div>
              {currentUser && (
                <span className="greeting-text">
                  {getGreeting()}, {currentUser.name.split(" ")[0]}
                </span>
              )}
              <span>6:30 AM</span>
              <strong>Decision Zone</strong>
            </div>
            <span className="weather-chip">Calm sea</span>
          </div>

          <SignalStage
            canvasRef={canvasRef}
            isLoading={isLoading}
            loadingStep={loadingStep}
            hasChecked={hasChecked}
            burstComplete={burstComplete}
            showVerdict={showVerdict}
            showMap={showMap}
            showMetrics={showMetrics}
            recommendation={recommendation}
            userCoords={userCoords}
            nearestCoast={nearestCoast}
            metrics={tripMetrics}
            onCheck={handleCheck}
          />

          <div className="panel-actions">
            {seeMoreReady ? (
              <button
                className="see-more-button"
                type="button"
                onClick={() => setShowMore((current) => !current)}
              >
                {showMore ? "Hide more" : "See more"}
              </button>
            ) : (
              <p>{panelMessage}</p>
            )}
          </div>

          {showMore && recommendation && <DecisionDetails recommendation={recommendation} />}
        </aside>
      </section>

      {showAuthModal && (
        <AuthModal
          onSuccess={(user) => {
            setCurrentUser(user);
            setShowAuthModal(false);
            fetchDecision();
          }}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </main>
  );
}
