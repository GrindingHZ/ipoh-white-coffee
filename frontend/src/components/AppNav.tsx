import type { Dispatch, RefObject, SetStateAction } from "react";
import { useClickOutside } from "../hooks/useClickOutside";
import type { AmbientCondition } from "../types";
import type { AuthUser } from "./AuthModal";

interface AppNavProps {
  navHidden: boolean;
  navHovered: boolean;
  setNavHovered: (value: boolean) => void;
  conditions: AmbientCondition[];
  currentUser: AuthUser | null;
  showProfileMenu: boolean;
  setShowProfileMenu: Dispatch<SetStateAction<boolean>>;
  profileMenuRef: RefObject<HTMLDivElement | null>;
  onLogout: () => void;
}

function AmbientChip({ condition }: { condition: AmbientCondition }) {
  return (
    <div className="nav-condition-chip" tabIndex={0}>
      <span className="nav-condition-collapsed">
        <span className="nav-condition-emoji" aria-hidden="true">{condition.icon}</span>
        <span className="nav-condition-text">{condition.value.split(" ")[0]}</span>
      </span>
      <span className="nav-condition-expanded" aria-hidden="true">
        <span className="nav-condition-icon">{condition.icon}</span>
        <span className="nav-condition-body">
          <strong>{condition.value}</strong>
          <small>{condition.sub}</small>
        </span>
      </span>
    </div>
  );
}

function ProfileMenu({
  currentUser,
  showProfileMenu,
  setShowProfileMenu,
  profileMenuRef,
  onLogout,
}: Pick<AppNavProps, "currentUser" | "showProfileMenu" | "setShowProfileMenu" | "profileMenuRef" | "onLogout">) {
  useClickOutside(profileMenuRef, () => setShowProfileMenu(false), showProfileMenu);

  const buttonClass = currentUser
    ? "nav-button nav-button--profile nav-button--active"
    : "nav-button nav-button--profile";

  return (
    <div className="profile-menu-wrap" ref={profileMenuRef}>
      <button
        className={buttonClass}
        type="button"
        onClick={() => setShowProfileMenu((v) => !v)}
        aria-haspopup="true"
        aria-expanded={showProfileMenu}
      >
        {currentUser ? currentUser.name.split(" ")[0] : "Profile"}
      </button>
      {showProfileMenu && currentUser && (
        <div className="profile-dropdown" role="menu">
          <div className="profile-dropdown-header">
            <strong>{currentUser.name}</strong>
            <small>{currentUser.locality}</small>
          </div>
          <hr className="profile-dropdown-divider" />
          <button
            className="profile-dropdown-item profile-dropdown-item--danger"
            role="menuitem"
            type="button"
            onClick={onLogout}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppNav(props: AppNavProps) {
  const {
    navHidden,
    navHovered,
    setNavHovered,
    conditions,
    currentUser,
    showProfileMenu,
    setShowProfileMenu,
    profileMenuRef,
    onLogout,
  } = props;

  return (
    <nav
      className={navHidden && !navHovered ? "app-bar app-bar--hidden" : "app-bar"}
      onMouseEnter={() => setNavHovered(true)}
      onMouseLeave={() => setNavHovered(false)}
      aria-label="FisherIQ app bar"
    >
      <div className="brand-lockup" aria-label="FisherIQ">
        <span className="brand-logo">FIQ</span>
        <strong>FisherIQ</strong>
      </div>
      <div className="app-bar-divider" aria-hidden="true" />

      <div className="nav-conditions" aria-label="Current conditions">
        {conditions.map((c) => (
          <AmbientChip key={c.label} condition={c} />
        ))}
      </div>

      <div className="top-actions" aria-label="App actions">
        <button className="nav-button" type="button">Settings</button>
        <ProfileMenu
          currentUser={currentUser}
          showProfileMenu={showProfileMenu}
          setShowProfileMenu={setShowProfileMenu}
          profileMenuRef={profileMenuRef}
          onLogout={onLogout}
        />
      </div>
    </nav>
  );
}
