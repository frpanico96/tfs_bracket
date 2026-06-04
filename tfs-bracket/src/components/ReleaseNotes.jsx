import releaseNotes from "../release-notes.json";
import BaseModal from "./BaseModal";

export default function ReleaseNotes({ isOpen, onClose, currentVersion }) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Release Notes">
      <div className="release-notes-list">
        {releaseNotes.map((release) => (
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
        ))}
      </div>
    </BaseModal>
  );
}
