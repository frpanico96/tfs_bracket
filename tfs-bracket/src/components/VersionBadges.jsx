export default function VersionBadges({ onVersionClick }) {
  const env = import.meta.env.DEV ? "dev" : import.meta.env.VITE_ENV || "prod";

  const devVersion = import.meta.env.VITE_DEV_VERSION || __APP_VERSION__ || "beta-v0.3";
  const intVersion = import.meta.env.VITE_INT_VERSION;
  const uatVersion = import.meta.env.VITE_UAT_VERSION || __APP_VERSION__ || "beta-v0.1";
  const prodVersion = import.meta.env.VITE_PROD_VERSION;

  const badges = [];

  if (env === "dev") {
    badges.push({ key: "prod", version: prodVersion });
    badges.push({ key: "uat", version: uatVersion });
    badges.push({ key: "int", version: intVersion });
    badges.push({ key: "dev", version: devVersion, suffix: "(development)" });
  } else if (env === "int") {
    badges.push({ key: "prod", version: prodVersion });
    badges.push({ key: "uat", version: uatVersion });
    badges.push({ key: "int", version: intVersion });
  } else if (env === "uat") {
    badges.push({ key: "prod", version: prodVersion });
    badges.push({ key: "uat", version: uatVersion });
  } else {
    badges.push({ key: "prod", version: prodVersion });
  }

  return (
    <span className="version-badges">
      {badges.map((b) => {
        const label = b.key === "int" ? "INT" : b.key === "uat" ? "UAT" : b.key === "dev" ? "DEV" : "Prod";
        return (
          <span
            key={b.key}
            className={`version-badge version-badge-${b.key}${!b.version ? " version-badge-empty" : ""}`}
            title={`${label}${b.version ? `: ${b.version}` : ": not deployed"}`}
            onClick={(e) => { e.stopPropagation(); onVersionClick?.(b.key); }}
          >
            {label}:{b.version || "\u2014"}{b.suffix ? ` ${b.suffix}` : ""}
          </span>
        );
      })}
    </span>
  );
}
