import { useState } from "react";
import {
  addDoc,
  tournamentsRef,
  serverTimestamp,
} from "../firebase";
import { logEvent } from "../utils/logger";

export default function CreateTournament({ user, onCancel, onCreated }) {
  const [name, setName] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [regStart, setRegStart] = useState("");
  const [regEnd, setRegEnd] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !regStart || !regEnd) {
      alert("Please fill all fields");
      return;
    }
    try {
      const docRef = await addDoc(tournamentsRef, {
        name,
        maxParticipants: parseInt(maxParticipants),
        regStart: new Date(regStart),
        regEnd: new Date(regEnd),
        createdAt: serverTimestamp(),
        adminId: user.uid,
        adminName: user.displayName,
        published: false,
        participants: [],
        matches: [],
      });
      onCreated({ id: docRef.id, name, maxParticipants, regStart, regEnd });
      logEvent({ action: "create_tournament", details: { tournamentId: docRef.id, name, adminId: user.uid } });
    } catch (error) {
      console.error("Create failed:", error);
      logEvent({ level: "error", action: "create_tournament_error", details: { error: error.message, adminId: user.uid } });
      alert("Failed to create tournament: " + error.message);
    }
  };

  return (
    <div className="create-tournament">
      <h2>Create Tournament</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Tournament Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Tournament"
            required
          />
        </label>
        <label>
          Max Participants
          <select
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
          >
            <option value={4}>4</option>
            <option value={8}>8</option>
            <option value={16}>16</option>
            <option value={32}>32</option>
          </select>
        </label>
        <label>
          Registration Start
          <input
            type="datetime-local"
            value={regStart}
            onChange={(e) => setRegStart(e.target.value)}
            required
          />
        </label>
        <label>
          Registration End
          <input
            type="datetime-local"
            value={regEnd}
            onChange={(e) => setRegEnd(e.target.value)}
            required
          />
        </label>
        <div className="buttons">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Create
          </button>
        </div>
      </form>
    </div>
  );
}