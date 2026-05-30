import { useState } from "react";
import { createInvite, buildInviteLink, INVITE_ROLES } from "../utils/invite";
import { logEvent } from "../utils/logger";

export default function InviteModal({ user, onClose }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("tournament_admin");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith("@gmail.com")) {
      setError("Only @gmail.com emails are supported");
      return;
    }
    setError("");
    setGenerating(true);
    try {
      const result = await createInvite({
        email: trimmed,
        role,
        createdBy: user.uid,
        createdByName: user.displayName,
      });
      const inviteLink = buildInviteLink(result.token);
      setLink(inviteLink);
      logEvent({ action: "invite_created", details: { email: trimmed, role, createdBy: user.uid } });
    } catch (err) {
      setError("Failed to create invite: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Invite User</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {!link ? (
          <form onSubmit={handleGenerate}>
            <div className="modal-body">
              <div className="modal-field">
                <label>Email (@gmail.com only)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@gmail.com"
                  required
                />
              </div>
              <div className="modal-field">
                <label>Role</label>
                <div className="modal-options">
                  {INVITE_ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      className={`modal-option ${role === r.value ? "selected" : ""}`}
                      onClick={() => setRole(r.value)}
                    >
                      <div>
                        <div>{r.label}</div>
                        <div className="modal-option-desc">{r.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="invite-error">{error}</p>}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={generating}>
                {generating ? "Generating..." : "Generate Invite Link"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="modal-body">
              <p className="invite-success">Invite created successfully!</p>
              <div className="modal-field">
                <label>Invite Link</label>
                <div className="invite-link-box">
                  <code className="invite-link">{link}</code>
                </div>
              </div>
              <p className="invite-hint">
                Send this link to <strong>{email}</strong>. They will be registered as{" "}
                <strong>{INVITE_ROLES.find((r) => r.value === role)?.label}</strong>.
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleCopy}>
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <button className="btn-secondary" onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
