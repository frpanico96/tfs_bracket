# Production Environment Setup

## Firebase/GCP Console (manual)

### 1. Budget Alerts
- **GCP Console > Billing > Budgets & alerts**
  - Create budget at €50/month (or your expected spend)
  - Set alert thresholds: 50%, 80%, 90%, 100%
  - Configure Pub/Sub notification topic: `budget-alerts`

### 2. Cloud Monitoring — Write Spike Alert
- **GCP Console > Monitoring > Alerting**
  - Metric: `firestore.googleapis.com/document/writes_count`
  - Condition: threshold > 500 writes per minute
  - Notification channel: Pub/Sub topic `firestore-write-spike`
  - Optional: add email notification to yourself

### 3. App Check
- **Firebase Console > App Check > Register app**
  - Enable reCAPTCHA v3 for the web app
  - This blocks API requests from outside your real app (script-kiddie protection)

### 4. Firestore Usage Quota
- **GCP Console > APIs & Services > Firebase Rules API > Quotas**
  - Set a daily Firestore write quota (e.g. 50K writes/day)
  - Hard safety net below the budget threshold

### 5. IAM & Service Accounts
- **GCP Console > IAM & Admin**
  - Create a dedicated service account for deployments
  - Grant minimal roles: `Firebase Admin`, `Cloud Functions Developer`
  - Rotate keys regularly
  - Remove the `Editor` role from any user accounts

## Deployment Commands

```bash
# Deploy Cloud Functions
firebase deploy --project uat --only functions

# Deploy everything (hosting + firestore + functions)
firebase deploy --project uat
```

## Activation

- Create `config/app` in Firestore with:
  - `{ maintenanceMode: false }` for normal operation
  - `{ maintenanceMode: true }` to instantly read-only the entire app
- Budget alert function auto-activates at ≥50% threshold
- Write spike function auto-activates on alert
