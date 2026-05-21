/**
 * GA4 -> DynamoDB sync orchestrator.
 *
 * Pulls reporting data from GA4 via the Data API, transforms it into the
 * DynamoDB item shapes used by the rest of the backend, and batch-writes
 * the results.  Designed to be idempotent: deterministic keys ensure
 * re-running the sync for the same date range upserts rather than duplicates.
 */

import crypto from "crypto";
import * as admin from "firebase-admin";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { config, TableNames } from "../config";
import * as ga4 from "./ga4";
import * as cache from "./cache";
import * as db from "./dynamodb";
import {
  Session,
  AnalyticsEvent,
  PageView,
} from "../types";

// ─── DynamoDB client (shared with dynamodb.ts pattern) ──────────────────────

let _docClient: DynamoDBDocumentClient | null = null;

function getDocClient(): DynamoDBDocumentClient {
  if (!_docClient) {
    const clientConfig: ConstructorParameters<typeof DynamoDBClient>[0] = {
      region: config.aws.region,
    };
    if (config.aws.accessKeyId && config.aws.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      };
    }
    const raw = new DynamoDBClient(clientConfig);
    _docClient = DynamoDBDocumentClient.from(raw, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return _docClient;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Deterministic hash for deduplication keys. */
function deterministicId(...parts: string[]): string {
  return crypto
    .createHash("sha256")
    .update(parts.join("|"))
    .digest("hex")
    .slice(0, 16);
}

/** Format date N days ago as YYYY-MM-DD. */
function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * Batch-write items to a DynamoDB table, respecting the 25-item limit.
 * Items are PutRequests, so this is an upsert — existing keys are overwritten.
 */
async function batchPut(
  tableName: string,
  items: Record<string, unknown>[]
): Promise<number> {
  if (items.length === 0) return 0;
  const doc = getDocClient();
  let written = 0;

  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25);
    const requestItems: Record<string, Array<{ PutRequest: { Item: Record<string, unknown> } }>> = {
      [tableName]: chunk.map((item) => ({
        PutRequest: { Item: item },
      })),
    };

    try {
      await doc.send(new BatchWriteCommand({ RequestItems: requestItems }));
      written += chunk.length;
    } catch (err) {
      console.error(
        `[sync] BatchWrite error for ${tableName} (chunk ${i}-${i + chunk.length}):`,
        (err as Error).message
      );
    }
  }

  return written;
}

// ─── Transform GA4 rows -> DynamoDB items ───────────────────────────────────

function transformSessions(
  ga4Sessions: Awaited<ReturnType<typeof ga4.fetchSessions>>
): Session[] {
  return ga4Sessions.map((s) => {
    const sessionId = `ga4_${deterministicId(s.date, s.sessionId)}`;
    const userId = `ga4_${deterministicId(s.userId)}`;
    const startTime = `${s.date}T00:00:00Z`;
    const durationSec = Math.round(s.duration);
    const endMs = new Date(startTime).getTime() + durationSec * 1000;
    const endTime = new Date(endMs).toISOString();

    return {
      userId,
      sessionId,
      email: "",
      startTime,
      endTime,
      duration: durationSec,
      pagesViewed: Math.round(s.pageviews),
      userAgent: s.browser,
      ip: "",
      date: s.date,
      timestamp: startTime,
      country: s.country,
      city: s.city,
      device: s.device,
    } as Session & { country?: string; city?: string; device?: string };
  });
}

function transformPageViews(
  ga4PVs: Awaited<ReturnType<typeof ga4.fetchPageViews>>
): PageView[] {
  // GA4 can return multiple rows for the same date+pagePath (different pageTitle etc.)
  // Deduplicate by using a unique counter to make each key distinct
  const seen = new Map<string, number>();

  return ga4PVs.map((pv) => {
    const baseKey = `${pv.date}|${pv.pagePath}`;
    const idx = (seen.get(baseKey) ?? 0);
    seen.set(baseKey, idx + 1);

    const sessionId = `ga4_pv_${deterministicId(pv.date, pv.pagePath, String(idx))}`;
    const userId = `ga4_${deterministicId(pv.date, pv.pagePath, "user", String(idx))}`;
    // Use index to create unique timestamps within the same date
    const timestamp = `${pv.date}T00:${String(idx).padStart(2, "0")}:00Z`;

    return {
      sessionId,
      userId,
      email: "",
      pagePath: pv.pagePath,
      pageTitle: pv.pageTitle || pv.pagePath,
      timestamp,
      date: pv.date,
      referrer: "",
      duration: Math.round(pv.avgDuration),
      views: Math.round(pv.views),
      uniqueVisitors: Math.round(pv.users),
    } as PageView & { views?: number; uniqueVisitors?: number };
  });
}

function transformEvents(
  ga4Events: Awaited<ReturnType<typeof ga4.fetchEvents>>
): AnalyticsEvent[] {
  return ga4Events.map((e) => {
    const eventId = `ga4_${deterministicId(e.date, e.eventName)}`;
    const sessionId = `ga4_ses_${deterministicId(e.date)}`;
    const userId = `ga4_${deterministicId(e.date, e.eventName, "user")}`;
    const timestamp = `${e.date}T00:00:00Z`;

    return {
      sessionId,
      eventId,
      userId,
      email: "",
      eventType: e.eventName,
      eventName: e.eventName,
      timestamp,
      date: e.date,
      properties: { count: e.count, users: e.users },
      page: "",
    };
  });
}

// ─── User aggregation ───────────────────────────────────────────────────────

interface UserAgg {
  sessions: number;
  pageViews: number;
  events: number;
  firstDate: string;
  lastDate: string;
}

function aggregateUsers(
  sessions: Session[],
  pageViews: PageView[],
  events: AnalyticsEvent[]
): Map<string, UserAgg> {
  const map = new Map<string, UserAgg>();

  function ensure(userId: string, date: string): UserAgg {
    let agg = map.get(userId);
    if (!agg) {
      agg = { sessions: 0, pageViews: 0, events: 0, firstDate: date, lastDate: date };
      map.set(userId, agg);
    }
    if (date < agg.firstDate) agg.firstDate = date;
    if (date > agg.lastDate) agg.lastDate = date;
    return agg;
  }

  for (const s of sessions) {
    ensure(s.userId, s.date).sessions++;
  }
  for (const pv of pageViews) {
    ensure(pv.userId, pv.date).pageViews++;
  }
  for (const ev of events) {
    ensure(ev.userId, ev.date).events++;
  }

  return map;
}

async function upsertUsers(userMap: Map<string, UserAgg>): Promise<number> {
  // GA4 users are pseudonymous — batch write their aggregated stats directly.
  // Firebase Auth users (with real emails) were already written by syncFirebaseAuthUsers
  // and have different userIds, so there's no conflict.
  const items: Record<string, unknown>[] = [];

  for (const [userId, agg] of userMap) {
    items.push({
      userId,
      email: "",
      firstSeen: `${agg.firstDate}T00:00:00Z`,
      lastSeen: `${agg.lastDate}T23:59:59Z`,
      totalSessions: agg.sessions,
      totalPageViews: agg.pageViews,
      totalEvents: agg.events,
    });
  }

  console.log(`[sync] Batch writing ${items.length} GA4 user aggregations...`);
  return batchPut(TableNames.users, items);
}

// ─── Firebase Auth user sync ────────────────────────────────────────────

/** Scan the users table to get existing records (used to preserve counters). */
async function scanExistingUsers(): Promise<Map<string, Record<string, unknown>>> {
  const doc = getDocClient();
  const map = new Map<string, Record<string, unknown>>();
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await doc.send(
      new ScanCommand({
        TableName: TableNames.users,
        ExclusiveStartKey: lastKey,
      })
    );
    for (const item of (result.Items ?? []) as Record<string, unknown>[]) {
      if (typeof item.userId === "string") {
        map.set(item.userId, item);
      }
    }
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return map;
}

/**
 * Fetch all users from Firebase Auth and upsert into the users table.
 * This gives us email + displayName for the dashboard.
 * Preserves existing counter values (totalSessions, totalPageViews, totalEvents)
 * so GA4 data written by upsertUsers is not overwritten with zeros.
 */
async function syncFirebaseAuthUsers(): Promise<number> {
  let count = 0;

  // Ensure Firebase Admin is initialized
  if (admin.apps.length === 0) {
    console.log("[sync] Initializing Firebase Admin for user sync...");
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: config.firebase.projectId || undefined,
    });
  }

  try {
    console.log("[sync] Fetching Firebase Auth users...");

    // Read existing users to preserve their counter values
    const existingMap = await scanExistingUsers();
    console.log(`[sync] Found ${existingMap.size} existing users in DynamoDB`);

    const items: Record<string, unknown>[] = [];
    let nextPageToken: string | undefined;

    // Wrap listUsers in a timeout to prevent hanging
    const timeoutMs = 15_000;
    const fetchWithTimeout = <T>(promise: Promise<T>): Promise<T> =>
      Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Firebase Auth listUsers timed out")), timeoutMs)
        ),
      ]);

    do {
      const listResult = await fetchWithTimeout(
        admin.auth().listUsers(1000, nextPageToken)
      );

      for (const fbUser of listResult.users) {
        const existing = existingMap.get(fbUser.uid);
        items.push({
          userId: fbUser.uid,
          email: fbUser.email || "",
          displayName: fbUser.displayName || (fbUser.email || "").split("@")[0] || fbUser.uid.slice(0, 8),
          photoURL: fbUser.photoURL || "",
          firstSeen: fbUser.metadata.creationTime || new Date().toISOString(),
          lastSeen: fbUser.metadata.lastSignInTime || new Date().toISOString(),
          // Preserve existing counters — don't overwrite with zeros
          totalSessions: (existing?.totalSessions as number) || 0,
          totalPageViews: (existing?.totalPageViews as number) || 0,
          totalEvents: (existing?.totalEvents as number) || 0,
        });
      }

      nextPageToken = listResult.pageToken;
    } while (nextPageToken);

    console.log(`[sync] Found ${items.length} Firebase Auth users, writing to DynamoDB...`);
    count = await batchPut(TableNames.users, items);
    console.log(`[sync] Synced ${count} Firebase Auth users`);
  } catch (err) {
    console.error("[sync] Firebase Auth user sync failed:", (err as Error).message);
  }

  return count;
}

// ─── Main sync function ─────────────────────────────────────────────────────

export interface SyncResult {
  success: boolean;
  durationMs: number;
  sessions: number;
  pageviews: number;
  events: number;
  users: number;
  errors: string[];
}

export async function syncAll(rangeDays?: number): Promise<SyncResult> {
  const days = rangeDays ?? 30;
  const startDate = daysAgoStr(days);
  const endDate = daysAgoStr(0); // today

  console.log(`[sync] Starting GA4 sync for ${startDate} to ${endDate} (${days} days)`);
  const t0 = Date.now();
  const errors: string[] = [];

  let sessionsWritten = 0;
  let pageviewsWritten = 0;
  let eventsWritten = 0;
  let usersWritten = 0;

  // 0. Sync Firebase Auth users (get emails + display names) ---------------
  try {
    await syncFirebaseAuthUsers();
  } catch (err) {
    errors.push(`Firebase Auth sync failed: ${(err as Error).message}`);
  }

  // 1. Fetch from GA4 ---------------------------------------------------
  let ga4Sessions: Awaited<ReturnType<typeof ga4.fetchSessions>> = [];
  let ga4PageViews: Awaited<ReturnType<typeof ga4.fetchPageViews>> = [];
  let ga4Events: Awaited<ReturnType<typeof ga4.fetchEvents>> = [];

  try {
    ga4Sessions = await ga4.fetchSessions(startDate, endDate);
    console.log(`[sync] Fetched ${ga4Sessions.length} session rows from GA4`);
  } catch (err) {
    const msg = `GA4 fetchSessions failed: ${(err as Error).message}`;
    console.error(`[sync] ${msg}`);
    errors.push(msg);
  }

  try {
    ga4PageViews = await ga4.fetchPageViews(startDate, endDate);
    console.log(`[sync] Fetched ${ga4PageViews.length} pageview rows from GA4`);
  } catch (err) {
    const msg = `GA4 fetchPageViews failed: ${(err as Error).message}`;
    console.error(`[sync] ${msg}`);
    errors.push(msg);
  }

  try {
    ga4Events = await ga4.fetchEvents(startDate, endDate);
    console.log(`[sync] Fetched ${ga4Events.length} event rows from GA4`);
  } catch (err) {
    const msg = `GA4 fetchEvents failed: ${(err as Error).message}`;
    console.error(`[sync] ${msg}`);
    errors.push(msg);
  }

  // 2. Transform --------------------------------------------------------
  const sessions = transformSessions(ga4Sessions);
  const pageviews = transformPageViews(ga4PageViews);
  const events = transformEvents(ga4Events);

  // 3. Batch write to DynamoDB ------------------------------------------
  try {
    sessionsWritten = await batchPut(TableNames.sessions, sessions as unknown as Record<string, unknown>[]);
    console.log(`[sync] Wrote ${sessionsWritten} sessions to DynamoDB`);
  } catch (err) {
    const msg = `DynamoDB sessions write failed: ${(err as Error).message}`;
    console.error(`[sync] ${msg}`);
    errors.push(msg);
  }

  try {
    pageviewsWritten = await batchPut(TableNames.pageviews, pageviews as unknown as Record<string, unknown>[]);
    console.log(`[sync] Wrote ${pageviewsWritten} pageviews to DynamoDB`);
  } catch (err) {
    const msg = `DynamoDB pageviews write failed: ${(err as Error).message}`;
    console.error(`[sync] ${msg}`);
    errors.push(msg);
  }

  try {
    eventsWritten = await batchPut(TableNames.events, events as unknown as Record<string, unknown>[]);
    console.log(`[sync] Wrote ${eventsWritten} events to DynamoDB`);
  } catch (err) {
    const msg = `DynamoDB events write failed: ${(err as Error).message}`;
    console.error(`[sync] ${msg}`);
    errors.push(msg);
  }

  // 4. Aggregate and upsert users --------------------------------------
  try {
    const userMap = aggregateUsers(sessions, pageviews, events);
    usersWritten = await upsertUsers(userMap);
    console.log(`[sync] Upserted ${usersWritten} users`);
  } catch (err) {
    const msg = `User aggregation failed: ${(err as Error).message}`;
    console.error(`[sync] ${msg}`);
    errors.push(msg);
  }

  // 5. Fetch DAU + cohort retention from GA4 and store in DynamoDB ------
  try {
    const doc = getDocClient();
    const [dau30, dau1, cohortData] = await Promise.all([
      ga4.fetchDAU(daysAgoStr(30), endDate),
      ga4.fetchDAU(daysAgoStr(1), endDate),
      ga4.fetchCohortRetention(8),
    ]);

    await Promise.all([
      doc.send(new PutCommand({
        TableName: TableNames.users,
        Item: { userId: "__meta:dau:30", email: "", payload: dau30, updatedAt: new Date().toISOString() },
      })),
      doc.send(new PutCommand({
        TableName: TableNames.users,
        Item: { userId: "__meta:dau:1", email: "", payload: dau1, updatedAt: new Date().toISOString() },
      })),
      doc.send(new PutCommand({
        TableName: TableNames.users,
        Item: { userId: "__meta:cohort_retention", email: "", payload: cohortData, updatedAt: new Date().toISOString() },
      })),
    ]);
    console.log(`[sync] Stored DAU (30d: ${dau30.length} points, 1d: ${dau1.length} points) + cohort retention (${cohortData.cohorts.length} cohorts)`);
  } catch (err) {
    const msg = `DAU/retention sync failed: ${(err as Error).message}`;
    console.error(`[sync] ${msg}`);
    errors.push(msg);
  }

  // 6. Pre-warm cache with fresh data (overwrites stale entries in-place,
  //    so requests during warm-up still get served from old cache) --------
  try {
    await db.warmCache();
  } catch (err) {
    console.error("[sync] Cache pre-warm failed:", (err as Error).message);
  }

  const durationMs = Date.now() - t0;
  const success = errors.length === 0;
  console.log(
    `[sync] Completed in ${durationMs}ms — ` +
      `sessions=${sessionsWritten} pageviews=${pageviewsWritten} ` +
      `events=${eventsWritten} users=${usersWritten} ` +
      `errors=${errors.length}${success ? "" : " [PARTIAL]"}`
  );

  return {
    success,
    durationMs,
    sessions: sessionsWritten,
    pageviews: pageviewsWritten,
    events: eventsWritten,
    users: usersWritten,
    errors,
  };
}

// ─── Scheduled sync ─────────────────────────────────────────────────────────

let _syncInterval: ReturnType<typeof setInterval> | null = null;

export function startSyncSchedule(intervalMinutes?: number): void {
  const minutes = intervalMinutes ?? config.syncIntervalMinutes;
  const ms = minutes * 60 * 1000;

  if (_syncInterval) {
    console.warn("[sync] Schedule already running, stopping previous one");
    stopSyncSchedule();
  }

  console.log(`[sync] Starting sync schedule — every ${minutes} minutes`);

  // Run immediately on startup
  syncAll().catch((err) => {
    console.error("[sync] Initial sync failed:", (err as Error).message);
  });

  // Then repeat at interval
  _syncInterval = setInterval(() => {
    syncAll().catch((err) => {
      console.error("[sync] Scheduled sync failed:", (err as Error).message);
    });
  }, ms);
}

export function stopSyncSchedule(): void {
  if (_syncInterval) {
    clearInterval(_syncInterval);
    _syncInterval = null;
    console.log("[sync] Sync schedule stopped");
  }
}

export function isSyncScheduleRunning(): boolean {
  return _syncInterval !== null;
}
