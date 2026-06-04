import { useState, useRef, useEffect } from "react";
import { doc, updateDoc, db } from "../firebase";
import { getUserName } from "../utils/user";

export default function SetDisplayName({ user, onSaved }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Display name is required");
      return;
    }
    if (trimmed.length < 2) {
      setError("Display name must be at least 2 characters");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateDoc(doc(db, "users", user.uid), { display_name: trimmed });
      onSaved(trimmed);
    } catch (e) {
      setError("Failed to save. Try again.");
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>TFS Bracket</h1>
        <p>Choose your display name</p>
        <div className="modal-field">
          <label htmlFor="display-name">Display Name</label>
          <input
            id="display-name"
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            onKeyDown={handleKeyDown}
            placeholder={getUserName(user)}
            disabled={saving}
            autoComplete="off"
          />
          {error && <p className="field-error">{error}</p>}
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <><span className="saving-throbber" /> Saving...</> : "Continue"}
        </button>
      </div>
    </div>
  );
}
