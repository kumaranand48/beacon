import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),

  aws: {
    region: process.env.AWS_REGION || "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },

  dynamodb: {
    tablePrefix: process.env.DYNAMODB_TABLE_PREFIX || "beacon_",
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },

  /** GA4 Data API property ID. */
  ga4PropertyId: process.env.GA4_PROPERTY_ID || "",

  /** Minutes between GA4 -> DynamoDB sync runs. */
  syncIntervalMinutes: parseInt(process.env.SYNC_INTERVAL_MINUTES || "15", 10),

  /** Default cache TTL in milliseconds (16 min — slightly longer than sync interval). */
  cacheTtlMs: parseInt(process.env.CACHE_TTL_MS || "960000", 10),

  /** Path to Google service-account JSON (also used by Firebase Admin). */
  googleApplicationCredentials:
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.resolve(process.cwd(), "firebase-service-account.json"),

  allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim()),

  /** Emails permitted to access the dashboard (comma-separated). Empty = allow all authenticated users. */
  allowedEmails: (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),

  /** When true, use in-memory mock data instead of DynamoDB. Auto-enabled when AWS creds are missing. */
  useMockData:
    process.env.USE_MOCK_DATA === "true" ||
    (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_REGION),
} as const;

// ─── Derived table names ────────────────────────────────────────────────────

export const TableNames = {
  sessions: `${config.dynamodb.tablePrefix}sessions`,
  events: `${config.dynamodb.tablePrefix}events`,
  pageviews: `${config.dynamodb.tablePrefix}pageviews`,
  users: `${config.dynamodb.tablePrefix}users`,
} as const;
