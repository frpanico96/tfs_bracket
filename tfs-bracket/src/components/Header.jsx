export default function Header({ user, role, isSuperAdmin, onLogout, onLogoClick, onInvite }) {
  const version = import.meta.env.VITE_APP_VERSION || "beta-v0.1";
  return (
    <header className="header">
      <h1 onClick={onLogoClick} style={{ cursor: "pointer" }}>
        TFS Bracket
        <span className="version-badge">{version}</span>
      </h1>
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