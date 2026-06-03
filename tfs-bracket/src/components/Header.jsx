import { useState } from "react";
import VersionBadges from "./VersionBadges";
import { getUserName, getUserDisplayName, getUserPhoto, getInitials } from "../utils/user";

function Avatar({ user }) {
  const [broken, setBroken] = useState(false);
  const photo = getUserPhoto(user);
  const name = getUserName(user);
  const showImg = photo && !broken;

  if (showImg) {
    return <img src={photo} alt="" className="avatar" onError={() => setBroken(true)} />;
  }

  return <div className="avatar avatar-fallback">{getInitials(name)}</div>;
}

export default function Header({ user, userDoc, role, isSuperAdmin, isGlobalAdmin, onLogout, onLogoClick, onInvite, onNavigate, onVersionClick }) {
  const displayName = getUserDisplayName(userDoc) || getUserName(user);

  return (
    <header className="header">
      <div className="header-left">
        <h1 onClick={onLogoClick} style={{ cursor: "pointer" }}>
          TFS Bracket
          <VersionBadges onVersionClick={onVersionClick} />
        </h1>
        <nav className="header-nav">
          <button className="nav-link" onClick={() => onNavigate("list")}>Tournaments</button>
          <button className="nav-link" onClick={() => onNavigate("leaderboard")}>Leaderboard</button>
        </nav>
      </div>
      <div className="user-info">
        <Avatar user={user} />
        <span>{displayName}</span>
        {role && <span className={`role-badge role-${role}`}>{role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>}
        <div className="header-actions">
          {isGlobalAdmin && (
            <button className="btn-invite" onClick={onInvite}>
              + Invite
            </button>
          )}
          <button className="btn-secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}