export default function Header({ user, role, onLogout, onLogoClick }) {
  return (
    <header className="header">
      <h1 onClick={onLogoClick} style={{ cursor: "pointer" }}>
        TFS Bracket
      </h1>
      <div className="user-info">
        <img src={user.photoURL} alt="" className="avatar" />
        <span>{user.displayName}</span>
        {role && <span className={`role-badge role-${role}`}>{role}</span>}
        <button className="btn-secondary" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}