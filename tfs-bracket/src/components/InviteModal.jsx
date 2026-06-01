import { useState } from "react";
import { createInvite, createGenericInvite, buildInviteLink, INVITE_ROLES } from "../utils/invite";
import { logEvent } from "../utils/logger";

export default function InviteModal({ user, onClose }) {
  const [mode, setMode] = useState("email");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("tournament_admin");
  const [maxUses, setMaxUses] = useState(10);
  const [expiresAt, setExpiresAt] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [isExisting, setIsExisting] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError("");

    if (mode === "email") {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed.endsWith("@gmail.com")) {
        setError("Only @gmail.com emails are supported");
        return;
      }
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
        setIsExisting(result.existing || false);
        logEvent({
          action: result.existing ? "invite_reused" : "invite_created",
          details: { email: trimmed, role, createdBy: user.uid },
        });
      } catch (err) {
        setError("Failed to create invite: " + err.message);
      } finally {
        setGenerating(false);
      }
    } else {
      const uses = parseInt(maxUses, 10);
      if (!uses || uses < 1) {
        setError("Max uses must be at least 1");
        return;
      }
      if (!expiresAt) {
        setError("Please set an expiration date");
        return;
      }
      const expDate = new Date(expiresAt);
      if (expDate <= new Date()) {
        setError("Expiration must be in the future");
        return;
      }
      setGenerating(true);
      try {
        const result = await createGenericInvite({
          maxUses: uses,
          expiresAt: expDate,
          createdBy: user.uid,
          createdByName: user.displayName,
        });
        const inviteLink = buildInviteLink(result.token);
        setLink(inviteLink);
        logEvent({
          action: "generic_invite_created",
          details: { maxUses: uses, expiresAt: expDate.toISOString(), createdBy: user.uid },
        });
      } catch (err) {
        setError("Failed to create invite: " + err.message);
      } finally {
        setGenerating(false);
      }
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
              <div className="invite-mode-tabs">
                <button type="button" className={`invite-mode-tab ${mode === "email" ? "active" : ""}`} onClick={() => setMode("email")}>
                  Email Invite
                </button>
                <button type="button" className={`invite-mode-tab ${mode === "link" ? "active" : ""}`} onClick={() => setMode("link")}>
                  Link Invite
                </button>
              </div>

              {mode === "email" ? (
                <>
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
                </>
              ) : (
                <>
                  <p className="modal-desc">Anyone with this link can join as a Player until it expires or reaches the max uses.</p>
                  <div className="modal-field">
                    <label>Max Uses</label>
                    <input
                      type="number"
                      min="1"
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value)}
                      required
                    />
                  </div>
                  <div className="modal-field">
                    <label>Expires At</label>
                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      required
                    />
                  </div>
                  <div className="modal-field">
                    <label>Role</label>
                    <p className="invite-role-locked">Player</p>
                  </div>
                </>
              )}

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
              <p className={`invite-success ${isExisting ? "invite-success-muted" : ""}`}>
                {isExisting ? "Invite already exists! Here is the existing link:" : "Invite created successfully!"}
              </p>
              {mode === "email" && (
                <p className="invite-hint">
                  Send this link to <strong>{email}</strong>. They will be registered as{" "}
                  <strong>{INVITE_ROLES.find((r) => r.value === role)?.label}</strong>.
                </p>
              )}
              {mode === "link" && (
                <p className="invite-hint">
                  This link expires on <strong>{new Date(expiresAt).toLocaleString()}</strong> and can be used up to <strong>{maxUses}</strong> times.
                  Anyone with this link will be registered as <strong>Player</strong>.
                </p>
              )}
              <div className="modal-field">
                <label>Invite Link</label>
                <div className="invite-link-box">
                  <code className="invite-link">{link}</code>
                </div>
              </div>
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
