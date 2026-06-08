export default function VersionBadges({ onVersionClick }) {
  const env = import.meta.env.DEV ? "dev" : import.meta.env.VITE_ENV || "prod";

  const intVersion = import.meta.env.VITE_INT_VERSION || "beta-v0.2";
  const uatVersion = import.meta.env.VITE_UAT_VERSION || __APP_VERSION__ || "beta-v0.1";
  const prodVersion = import.meta.env.VITE_PROD_VERSION;

  const badges = [];

  if (env === "dev" || env === "int") {
    badges.push({ key: "prod", version: prodVersion });
    badges.push({ key: "uat", version: uatVersion });
    badges.push({ key: "int", version: intVersion, suffix: env === "dev" ? "(development)" : "" });
  } else if (env === "uat") {
    badges.push({ key: "prod", version: prodVersion });
    badges.push({ key: "uat", version: uatVersion });
  } else {
    badges.push({ key: "prod", version: prodVersion });
  }

  return (
    <span className="version-badges" onClick={(e) => { e.stopPropagation(); onVersionClick?.(); }}>
      {badges.map((b) => (
        <span
          key={b.key}
          className={`version-badge version-badge-${b.key}${!b.version ? " version-badge-empty" : ""}`}
          title={`${b.key.toUpperCase()}${b.version ? `: ${b.version}` : ": not deployed"}`}
        >
          {b.key === "int" ? "INT" : b.key === "uat" ? "UAT" : "Prod"}:{b.version || "\u2014"}{b.suffix ? ` ${b.suffix}` : ""}
        </span>
      ))}
    </span>
  );
}
