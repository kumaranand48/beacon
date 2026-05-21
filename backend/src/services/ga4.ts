/**
 * GA4 Data API client.
 *
 * Uses the Google Analytics Data API v1 to pull reporting data from GA4.
 * Authenticated via the Firebase service-account JSON already present in the
 * repo root.
 */

import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { config } from "../config";
import path from "path";

// ─── Client (lazy-initialized) ──────────────────────────────────────────────

let _client: BetaAnalyticsDataClient | null = null;

function getClient(): BetaAnalyticsDataClient {
  if (!_client) {
    const credPath =
      config.googleApplicationCredentials ||
      path.resolve(process.cwd(), "firebase-service-account.json");

    _client = new BetaAnalyticsDataClient({
      keyFilename: credPath,
    });
    console.log("[ga4] Analytics Data API client initialized");
  }
  return _client;
}

const propertyId = (): string => `properties/${config.ga4PropertyId}`;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert GA4 YYYYMMDD -> ISO YYYY-MM-DD */
export function ga4DateToISO(ga4Date: string): string {
  if (ga4Date.length !== 8) return ga4Date;
  return `${ga4Date.slice(0, 4)}-${ga4Date.slice(4, 6)}-${ga4Date.slice(6, 8)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GA4Row = any;

/** Extract a dimension value by index from a GA4 row */
function dim(row: GA4Row, index: number): string {
  return row?.dimensionValues?.[index]?.value ?? "(not set)";
}

/** Extract a metric value by index from a GA4 row */
function met(row: GA4Row, index: number): number {
  return parseFloat(row?.metricValues?.[index]?.value ?? "0");
}

// ─── Public Methods ─────────────────────────────────────────────────────────

/**
 * Fetch total active-users count between two dates.
 */
export async function fetchActiveUsers(
  startDate: string,
  endDate: string
): Promise<number> {
  const client = getClient();
  const [response] = await client.runReport({
    property: propertyId(),
    dateRanges: [{ startDate, endDate }],
    metrics: [{ name: "activeUsers" }],
  });

  return met(response.rows?.[0] ?? {}, 0);
}

/**
 * Fetch session-level data with user, duration, pageviews, country, device.
 */
export async function fetchSessions(
  startDate: string,
  endDate: string
): Promise<
  Array<{
    date: string;
    sessionId: string;
    userId: string;
    duration: number;
    pageviews: number;
    country: string;
    city: string;
    device: string;
    browser: string;
  }>
> {
  const client = getClient();
  const [response] = await client.runReport({
    property: propertyId(),
    dateRanges: [{ startDate, endDate }],
    dimensions: [
      { name: "date" },
      { name: "sessionDefaultChannelGrouping" },
      { name: "country" },
      { name: "city" },
      { name: "deviceCategory" },
      { name: "browser" },
    ],
    metrics: [
      { name: "sessions" },
      { name: "averageSessionDuration" },
      { name: "screenPageViews" },
      { name: "totalUsers" },
    ],
    limit: 10000,
  });

  return (response.rows ?? []).map((row, idx) => ({
    date: ga4DateToISO(dim(row, 0)),
    sessionId: `ga4_ses_${ga4DateToISO(dim(row, 0))}_${idx}`,
    userId: `ga4_user_${dim(row, 1)}_${dim(row, 4)}`.replace(/\s+/g, "_"),
    duration: met(row, 1),
    pageviews: met(row, 2),
    country: dim(row, 2),
    city: dim(row, 3),
    device: dim(row, 4),
    browser: dim(row, 5),
  }));
}

/**
 * Fetch page-view data with path, title, user.
 */
export async function fetchPageViews(
  startDate: string,
  endDate: string
): Promise<
  Array<{
    date: string;
    pagePath: string;
    pageTitle: string;
    views: number;
    users: number;
    avgDuration: number;
  }>
> {
  const client = getClient();
  const [response] = await client.runReport({
    property: propertyId(),
    dateRanges: [{ startDate, endDate }],
    dimensions: [
      { name: "date" },
      { name: "pagePath" },
      { name: "pageTitle" },
    ],
    metrics: [
      { name: "screenPageViews" },
      { name: "totalUsers" },
      { name: "userEngagementDuration" },
    ],
    limit: 10000,
  });

  return (response.rows ?? []).map((row) => ({
    date: ga4DateToISO(dim(row, 0)),
    pagePath: dim(row, 1),
    pageTitle: dim(row, 2),
    views: met(row, 0),
    users: met(row, 1),
    avgDuration: met(row, 2),
  }));
}

/**
 * Fetch events with name, count, user.
 */
export async function fetchEvents(
  startDate: string,
  endDate: string
): Promise<
  Array<{
    date: string;
    eventName: string;
    count: number;
    users: number;
  }>
> {
  const client = getClient();
  const [response] = await client.runReport({
    property: propertyId(),
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "date" }, { name: "eventName" }],
    metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
    limit: 10000,
  });

  return (response.rows ?? []).map((row) => ({
    date: ga4DateToISO(dim(row, 0)),
    eventName: dim(row, 1),
    count: met(row, 0),
    users: met(row, 1),
  }));
}

/**
 * Fetch per-user aggregated metrics.
 */
export async function fetchUserMetrics(
  startDate: string,
  endDate: string
): Promise<
  Array<{
    date: string;
    totalUsers: number;
    activeUsers: number;
    sessions: number;
    pageviews: number;
    avgSessionDuration: number;
    engagedSessions: number;
  }>
> {
  const client = getClient();
  const [response] = await client.runReport({
    property: propertyId(),
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "date" }],
    metrics: [
      { name: "totalUsers" },
      { name: "activeUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "averageSessionDuration" },
      { name: "engagedSessions" },
    ],
    limit: 10000,
  });

  return (response.rows ?? []).map((row) => ({
    date: ga4DateToISO(dim(row, 0)),
    totalUsers: met(row, 0),
    activeUsers: met(row, 1),
    sessions: met(row, 2),
    pageviews: met(row, 3),
    avgSessionDuration: met(row, 4),
    engagedSessions: met(row, 5),
  }));
}

/**
 * Fetch real-time active users and current pages.
 *
 * Uses the Realtime API which has its own request shape.
 */
export async function fetchRealtime(): Promise<{
  activeUsers: number;
  topPages: Array<{ pagePath: string; activeUsers: number }>;
}> {
  const client = getClient();

  // Active users only
  const [countResponse] = await client.runRealtimeReport({
    property: propertyId(),
    metrics: [{ name: "activeUsers" }],
  });
  const activeUsers = met(countResponse.rows?.[0] ?? {}, 0);

  // Top pages right now
  const [pagesResponse] = await client.runRealtimeReport({
    property: propertyId(),
    dimensions: [{ name: "unifiedScreenName" }],
    metrics: [{ name: "activeUsers" }],
    limit: 20,
  });

  const topPages = (pagesResponse.rows ?? []).map((row) => ({
    pagePath: dim(row, 0),
    activeUsers: met(row, 0),
  }));

  return { activeUsers, topPages };
}

/**
 * Fetch daily active users between two dates.
 */
export async function fetchDAU(
  startDate: string,
  endDate: string
): Promise<Array<{ date: string; activeUsers: number }>> {
  const client = getClient();
  const [response] = await client.runReport({
    property: propertyId(),
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "activeUsers" }],
    orderBys: [{ dimension: { dimensionName: "date" } }],
    limit: 10000,
  });
  return (response.rows ?? []).map((row) => ({
    date: ga4DateToISO(dim(row, 0)),
    activeUsers: met(row, 0),
  }));
}

/**
 * Fetch weekly cohort retention data from GA4.
 */
export async function fetchCohortRetention(
  numWeeks = 8
): Promise<{
  cohorts: Array<{
    label: string;
    startDate: string;
    endDate: string;
    totalUsers: number;
    retention: number[];
  }>;
}> {
  const client = getClient();
  const now = new Date();

  // Build weekly cohort definitions going back numWeeks
  // Each cohort is a Mon-Sun week, ending before the current week
  const cohortDefs: Array<{
    name: string;
    dimension: string;
    dateRange: { startDate: string; endDate: string };
  }> = [];

  for (let i = numWeeks; i >= 1; i--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - (i * 7));
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    cohortDefs.push({
      name: `week${numWeeks - i}`,
      dimension: "firstSessionDate",
      dateRange: {
        startDate: weekStart.toISOString().slice(0, 10),
        endDate: weekEnd.toISOString().slice(0, 10),
      },
    });
  }

  const maxOffset = Math.min(numWeeks - 1, 4);

  try {
    const [response] = await client.runReport({
      property: propertyId(),
      dimensions: [
        { name: "cohort" },
        { name: "cohortNthWeek" },
      ],
      metrics: [
        { name: "cohortActiveUsers" },
        { name: "cohortTotalUsers" },
      ],
      cohortSpec: {
        cohorts: cohortDefs,
        cohortsRange: {
          granularity: 2, // WEEKLY
          startOffset: 0,
          endOffset: maxOffset,
        },
      },
    });

    // Parse response into cohort data
    const cohortMap = new Map<
      string,
      { totalUsers: number; weekData: Map<number, number> }
    >();

    for (const row of response.rows ?? []) {
      const cohortName = dim(row, 0);
      const weekOffset = parseInt(dim(row, 1));
      const activeUsers = met(row, 0);
      const totalUsers = met(row, 1);

      if (!cohortMap.has(cohortName)) {
        cohortMap.set(cohortName, { totalUsers, weekData: new Map() });
      }
      const entry = cohortMap.get(cohortName)!;
      if (totalUsers > 0) entry.totalUsers = totalUsers;
      entry.weekData.set(
        weekOffset,
        totalUsers > 0
          ? Math.round((activeUsers / totalUsers) * 1000) / 10
          : 0
      );
    }

    // Format cohort labels
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    function formatLabel(start: string, end: string): string {
      const s = new Date(start + "T00:00:00");
      const e = new Date(end + "T00:00:00");
      const sm = monthNames[s.getUTCMonth()];
      const em = monthNames[e.getUTCMonth()];
      if (sm === em) return `${sm} ${s.getUTCDate()} \u2013 ${e.getUTCDate()}`;
      return `${sm} ${s.getUTCDate()} \u2013 ${em} ${e.getUTCDate()}`;
    }

    const cohorts = cohortDefs.map((def) => {
      const data = cohortMap.get(def.name);
      const retention: number[] = [];
      for (let w = 0; w <= maxOffset; w++) {
        retention.push(data?.weekData.get(w) ?? -1); // -1 = no data
      }
      return {
        label: formatLabel(def.dateRange.startDate, def.dateRange.endDate),
        startDate: def.dateRange.startDate,
        endDate: def.dateRange.endDate,
        totalUsers: data?.totalUsers ?? 0,
        retention,
      };
    });

    return { cohorts };
  } catch (err) {
    console.error("[ga4] Cohort retention query failed:", (err as Error).message);
    return { cohorts: [] };
  }
}
