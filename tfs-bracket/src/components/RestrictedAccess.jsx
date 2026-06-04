import "./RestrictedAccess.css";

export default function RestrictedAccess({ onLogout }) {
  return (
    <div className="restricted-container">
      <div className="restricted-box">
        <div className="restricted-lock">R</div>
        <h2>Access Restricted</h2>
        <p>This application is currently in private testing.</p>
        <p>You need a valid invitation link to access it.</p>
        <button className="restricted-logout-btn" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </div>
  );
}
