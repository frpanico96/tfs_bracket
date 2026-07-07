const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const CONFIG_DOC = db.doc("config/app");

setGlobalOptions({ region: "europe-west1" });

/**
 * Triggered by GCP Budget Alerts via Pub/Sub.
 * Topic expected: "budget-alerts"
 *
 * GCP budget notification format:
 * {
 *   budgetDisplayName: string,
 *   alertThresholdExceeded: number,   // e.g. 0.8 for 80%
 *   costAmount: number,
 *   budgetAmount: number,
 *   currencyCode: string
 * }
 */
exports.handleBudgetAlert = onMessagePublished("budget-alerts", async (event) => {
  const message = event.data.message.json;

  if (!message || !message.alertThresholdExceeded) {
    console.log("No budget alert data — skipping");
    return;
  }

  const threshold = message.alertThresholdExceeded;
  const cost = message.costAmount;
  const budget = message.budgetAmount;

  console.log(
    `Budget alert: "${message.budgetDisplayName}" exceeded ${(threshold * 100).toFixed(0)}% ` +
    `(€${cost?.toFixed(2)} / €${budget?.toFixed(2)})`
  );

  // Activate maintenance mode when exceeding 50% or higher
  if (threshold >= 0.5) {
    await CONFIG_DOC.set({ maintenanceMode: true }, { merge: true });
    console.log("Maintenance mode activated — budget threshold exceeded");
  }
});

/**
 * Triggered by Cloud Monitoring alert notifications via Pub/Sub.
 * Topic expected: "firestore-write-spike"
 *
 * Set up a GCP Monitoring alert on Firestore v1 metrics:
 *   Metric: firestore.googleapis.com/document/writes_count
 *   Condition: exceeds threshold (e.g. > 500 writes/min)
 *   Notification: Pub/Sub topic "firestore-write-spike"
 */
exports.handleUsageSpike = onMessagePublished("firestore-write-spike", async (event) => {
  const message = event.data.message.json;

  if (!message) {
    console.log("No usage spike data — skipping");
    return;
  }

  const incident = message.incident || {};
  console.log(
    `Usage spike: "${incident.policy_name}" — ${incident.condition_name} ` +
    `(resource: ${incident.resource?.type || "unknown"})`
  );

  await CONFIG_DOC.set({ maintenanceMode: true }, { merge: true });
  console.log("Maintenance mode activated — usage spike detected");
});
