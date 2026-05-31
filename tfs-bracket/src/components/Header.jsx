import VersionBadges from "./VersionBadges";

export default function Header({ user, role, isSuperAdmin, onLogout, onLogoClick, onInvite, onNavigate, onVersionClick }) {
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
        <img src={user.photoURL} alt="" className="avatar" />
        <span>{user.displayName}</span>
        {role && <span className={`role-badge role-${role}`}>{role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>}
        <div className="header-actions">
          {isSuperAdmin && (
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