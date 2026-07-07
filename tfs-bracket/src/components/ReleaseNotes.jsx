import releaseNotes from "../release-notes.json";
import BaseModal from "./BaseModal";

export default function ReleaseNotes({ isOpen, onClose, currentVersion, env }) {
  const filtered = releaseNotes.filter(
    (r) => r.environment === "all" || r.environment === env
  );

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Release Notes">
      <div className="release-notes-list">
        {filtered.length === 0 ? (
          <p>No release notes for this environment.</p>
        ) : (
          filtered.map((release) => (
            <div
              key={release.version}
              className={`release-entry${release.version === currentVersion ? " release-current" : ""}`}
            >
              <div className="release-header">
                <span className="release-version">{release.version}</span>
                <span className="release-date">{release.date}</span>
                {release.version === currentVersion && (
                  <span className="release-current-badge">current</span>
                )}
              </div>
              <ul className="release-notes">
                {release.notes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </BaseModal>
  );
}
