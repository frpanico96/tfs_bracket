import { useState } from "react";
import {
  addDoc,
  tournamentsRef,
  serverTimestamp,
} from "../firebase";
import { logEvent } from "../utils/logger";
import { getUserName } from "../utils/user";
import { useToast } from "../hooks/useToast";

export default function CreateTournament({ user, onCancel, onCreated }) {
  const [name, setName] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [regStart, setRegStart] = useState("");
  const [regEnd, setRegEnd] = useState("");
  const [bracketType, setBracketType] = useState("single");
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState({});
  const addToast = useToast();

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = "Tournament name is required";
    else if (name.length > 100) errs.name = "Name must be 100 characters or less";
    const maxP = parseInt(maxParticipants);
    if (isNaN(maxP) || maxP < 2 || maxP > 64) errs.maxParticipants = "Must be between 2 and 64";
    if (!regStart) errs.regStart = "Registration start is required";
    if (!regEnd) errs.regEnd = "Registration end is required";
    if (regStart && regEnd && new Date(regEnd) <= new Date(regStart)) {
      errs.regEnd = "End must be after start";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setCreating(true);
    try {
      const maxP = parseInt(maxParticipants);
      const docRef = await addDoc(tournamentsRef, {
        name: name.trim(),
        maxParticipants: maxP,
        regStart: new Date(regStart),
        regEnd: new Date(regEnd),
        createdAt: serverTimestamp(),
        adminId: user.uid,
        adminName: getUserName(user),
        published: false,
        started: false,
        bracketType,
        participants: [],
        matches: [],
      });
      onCreated({
        id: docRef.id,
        name: name.trim(),
        maxParticipants: maxP,
        regStart: new Date(regStart),
        regEnd: new Date(regEnd),
        adminId: user.uid,
        adminName: getUserName(user),
        published: false,
        started: false,
        bracketType,
        participants: [],
        matches: [],
      });
      logEvent({ action: "create_tournament", details: { tournamentId: docRef.id, name, adminId: user.uid } });
    } catch (error) {
      console.error("Create failed:", error);
      logEvent({ level: "error", action: "create_tournament_error", details: { error: error.message, adminId: user.uid } });
      addToast("Failed to create tournament: " + error.message, "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="create-tournament">
      <h2>Create Tournament</h2>
      <form onSubmit={handleSubmit} noValidate>
        <label className={errors.name ? "field-invalid" : ""}>
          Tournament Name
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((prev) => ({ ...prev, name: "" })); }}
            placeholder="My Tournament"
            required
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </label>
        <label className={errors.maxParticipants ? "field-invalid" : ""}>
          Max Participants
          <input
            type="number"
            min="2"
            max="64"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
          />
          {errors.maxParticipants && <span className="field-error">{errors.maxParticipants}</span>}
        </label>
        <label>
          Bracket Type
          <div className="bracket-type-toggle">
            <button
              type="button"
              className={`bracket-type-btn ${bracketType === "single" ? "selected" : ""}`}
              onClick={() => setBracketType("single")}
            >
              Single Elimination
            </button>
            <button
              type="button"
              className={`bracket-type-btn ${bracketType === "double" ? "selected" : ""}`}
              onClick={() => setBracketType("double")}
            >
              Double Elimination
            </button>
          </div>
        </label>
        <label className={errors.regStart ? "field-invalid" : ""}>
          Registration Start
          <input
            type="datetime-local"
            value={regStart}
            onChange={(e) => { setRegStart(e.target.value); if (errors.regStart) setErrors((prev) => ({ ...prev, regStart: "" })); }}
            required
          />
          {errors.regStart && <span className="field-error">{errors.regStart}</span>}
        </label>
        <label className={errors.regEnd ? "field-invalid" : ""}>
          Registration End
          <input
            type="datetime-local"
            value={regEnd}
            onChange={(e) => { setRegEnd(e.target.value); if (errors.regEnd) setErrors((prev) => ({ ...prev, regEnd: "" })); }}
            required
          />
          {errors.regEnd && <span className="field-error">{errors.regEnd}</span>}
        </label>
        <div className="buttons">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={creating}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={creating}>
            {creating && <span className="saving-throbber" />}
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}