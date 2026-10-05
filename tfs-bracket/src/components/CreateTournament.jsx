import { useState } from "react";
import {
  addDoc,
  tournamentsRef,
  serverTimestamp,
} from "../firebase";
import { logEvent } from "../utils/logger";
import { getUserName } from "../utils/user";
import { useToast } from "../hooks/useToast";
import GamePicker from "./GamePicker";
import GamePoolPicker from "./GamePoolPicker";
import { TOURNAMENT_TYPE_FC, MIN_POOL_SIZE } from "../utils/finalChampionship";

export default function CreateTournament({ user, onCancel, onCreated }) {
  const [name, setName] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [regStart, setRegStart] = useState("");
  const [regEnd, setRegEnd] = useState("");
  const [bracketType, setBracketType] = useState("single");
  const [game, setGame] = useState(null);
  const [tournamentType, setTournamentType] = useState("standard");
  const [gamePool, setGamePool] = useState([]);
  const isFc = tournamentType === TOURNAMENT_TYPE_FC;
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [twitchUrl, setTwitchUrl] = useState("");
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
    if (isFc && gamePool.length < MIN_POOL_SIZE) {
      errs.gamePool = `The game pool needs at least ${MIN_POOL_SIZE} games`;
    }
    if (twitchUrl && !twitchUrl.match(/^https?:\/\/(www\.)?twitch\.tv\//i)) {
      errs.twitchUrl = "Must be a valid Twitch URL (https://twitch.tv/...)";
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
      const data = {
        name: name.trim(),
        maxParticipants: maxP,
        regStart: new Date(regStart),
        regEnd: new Date(regEnd),
        adminId: user.uid,
        adminName: getUserName(user),
        published: false,
        started: false,
        bracketType: isFc ? "double" : bracketType,
        participants: [],
        matches: [],
        game: isFc ? null : game || null,
        imageUrl: imageUrl.trim() || null,
        description: description.trim() || null,
        twitchUrl: twitchUrl.trim() || null,
        ...(isFc ? { tournamentType: TOURNAMENT_TYPE_FC, gamePool } : {}),
      };
      const docRef = await addDoc(tournamentsRef, { ...data, createdAt: serverTimestamp() });
      onCreated({ id: docRef.id, ...data });
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
          Tournament Type
          <div className="bracket-type-toggle">
            <button
              type="button"
              className={`bracket-type-btn ${!isFc ? "selected" : ""}`}
              onClick={() => setTournamentType("standard")}
            >
              Standard
            </button>
            <button
              type="button"
              className={`bracket-type-btn ${isFc ? "selected" : ""}`}
              onClick={() => setTournamentType(TOURNAMENT_TYPE_FC)}
            >
              Final Championship
            </button>
          </div>
        </label>
        {isFc ? (
          <p className="field-hint">
            Double elimination with a shared game pool. Champions enter two rounds and Winners one
            round after the other participants. Matches use picks and bans from the pool.
          </p>
        ) : (
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
        )}
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
        {isFc ? (
          <label className={errors.gamePool ? "field-invalid" : ""}>
            Game Pool
            <GamePoolPicker value={gamePool} onChange={(p) => { setGamePool(p); if (errors.gamePool) setErrors((prev) => ({ ...prev, gamePool: "" })); }} />
            {errors.gamePool && <span className="field-error">{errors.gamePool}</span>}
          </label>
        ) : (
          <label>
            Game
            <GamePicker value={game} onChange={setGame} />
          </label>
        )}
        <label>
          Tournament Image URL
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
        </label>
        <label>
          Description
          <textarea
            className="create-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell players about your tournament..."
            rows={4}
          />
        </label>
        <label className={errors.twitchUrl ? "field-invalid" : ""}>
          Twitch Stream URL
          <input
            type="url"
            value={twitchUrl}
            onChange={(e) => { setTwitchUrl(e.target.value); if (errors.twitchUrl) setErrors((prev) => ({ ...prev, twitchUrl: "" })); }}
            placeholder="https://twitch.tv/yourchannel"
          />
          {errors.twitchUrl && <span className="field-error">{errors.twitchUrl}</span>}
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