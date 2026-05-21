/**
 * DynamoDB service layer.
 *
 * All functions query real DynamoDB tables.  Read operations are fronted by
 * the in-memory cache (invalidated on every GA4 sync cycle).
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { config, TableNames } from "../config";
import * as cache from "./cache";
import {
  Session,
  AnalyticsEvent,
  PageView,
  UserProfile,
  DashboardSummary,
  ActivityPoint,
  DistributionSegment,
  RecentSession,
  TopPage,
  EventTimelinePoint,
  TopAction,
  SessionDurationBucket,
  UserDetail,
  UserJourneyStep,
} from "../types";

// ─── DynamoDB client (lazy-initialized) ─────────────────────────────────────

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

// ─── Pagination helpers ─────────────────────────────────────────────────────

/**
 * Run a paginated Scan with Select=COUNT (no data transfer).
 */
async function countAll(
  tableName: string,
  filterExpression?: string,
  expressionValues?: Record<string, unknown>
): Promise<number> {
  const doc = getDocClient();
  let count = 0;
  let lastKey: Record<string, unknown> | undefined;

  do {
    const cmd: ConstructorParameters<typeof ScanCommand>[0] = {
      TableName: tableName,
      Select: "COUNT",
      ExclusiveStartKey: lastKey,
    };
    if (filterExpression) {
      cmd.FilterExpression = filterExpression;
      if (expressionValues) cmd.ExpressionAttributeValues = expressionValues;
    }
    const result = await doc.send(new ScanCommand(cmd));
    count += result.Count ?? 0;
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return count;
}

/**
 * Run a paginated Scan, collecting all items up to `maxItems`.
 */
async function scanAll(
  tableName: string,
  filterExpression?: string,
  expressionValues?: Record<string, unknown>,
  expressionNames?: Record<string, string>,
  maxItems = 10000
): Promise<Record<string, unknown>[]> {
  const doc = getDocClient();
  const items: Record<string, unknown>[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const cmd: ConstructorParameters<typeof ScanCommand>[0] = {
      TableName: tableName,
      ExclusiveStartKey: lastKey,
    };
    if (filterExpression) {
      cmd.FilterExpression = filterExpression;
      if (expressionValues) cmd.ExpressionAttributeValues = expressionValues;
      if (expressionNames) cmd.ExpressionAttributeNames = expressionNames;
    }
    const result = await doc.send(new ScanCommand(cmd));
    items.push(...((result.Items ?? []) as Record<string, unknown>[]));
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey && items.length < maxItems);

  return items;
}

/**
 * Run a paginated Query on a GSI, collecting all items up to `maxItems`.
 */
async function queryAllByDate(
  tableName: string,
  date: string,
  indexName = "byDate",
  maxItems = 10000
): Promise<Record<string, unknown>[]> {
  const doc = getDocClient();
  const items: Record<string, unknown>[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await doc.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: indexName,
        KeyConditionExpression: "#d = :date",
        ExpressionAttributeNames: { "#d": "date" },
        ExpressionAttributeValues: { ":date": date },
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...((result.Items ?? []) as Record<string, unknown>[]));
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey && items.length < maxItems);

  return items;
}

// ─── Date helpers ───────────────────────────────────────────────────────────

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export async function getDashboardSummary(
  startDate?: string,
  endDate?: string
): Promise<DashboardSummary> {
  const end = endDate || daysAgoStr(0);
  const start = startDate || daysAgoStr(29);
  const cacheKey = `dashboard:summary:${start}:${end}`;
  const cached = cache.get<DashboardSummary>(cacheKey);
  if (cached) return cached;

  // Total users — only count real Firebase Auth users (with email), paginated
  const totalUsersCurrent = await countAll(
    TableNames.users,
    "attribute_exists(email) AND size(email) > :zero",
    { ":zero": 0 }
  );

  // Previous total users — those who joined before the start date
  const totalUsersPrevious = await countAll(
    TableNames.users,
    "attribute_exists(email) AND size(email) > :zero AND firstSeen < :cutoff",
    { ":zero": 0, ":cutoff": `${start}T00:00:00Z` }
  );

  // Compute range length in days
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const rangeDays = Math.max(1, Math.round((endMs - startMs) / 86400000) + 1);

  // Previous period = same length window immediately before start
  const prevEndMs = startMs - 86400000;
  const prevStartMs = prevEndMs - (rangeDays - 1) * 86400000;

  // Current period
  let currentSessions = 0, currentPageViews = 0, currentDurationSum = 0, currentSessionCount = 0;
  for (let ms = startMs; ms <= endMs; ms += 86400000) {
    const date = new Date(ms).toISOString().slice(0, 10);
    const sessItems = await queryAllByDate(TableNames.sessions, date);
    const pvItems = await queryAllByDate(TableNames.pageviews, date);
    currentSessions += sessItems.length;
    currentPageViews += pvItems.length;
    currentDurationSum += sessItems.reduce(
      (sum, s) => sum + (typeof s.duration === "number" ? s.duration : 0), 0
    );
    currentSessionCount += sessItems.length;
  }

  // Previous period
  let previousSessions = 0, previousPageViews = 0, previousDurationSum = 0, previousSessionCount = 0;
  for (let ms = prevStartMs; ms <= prevEndMs; ms += 86400000) {
    const date = new Date(ms).toISOString().slice(0, 10);
    const sessItems = await queryAllByDate(TableNames.sessions, date);
    const pvItems = await queryAllByDate(TableNames.pageviews, date);
    previousSessions += sessItems.length;
    previousPageViews += pvItems.length;
    previousDurationSum += sessItems.reduce(
      (sum, s) => sum + (typeof s.duration === "number" ? s.duration : 0), 0
    );
    previousSessionCount += sessItems.length;
  }

  const pct = (cur: number, prev: number): number =>
    prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 1000) / 10;

  const avgDurCurrent =
    currentSessionCount > 0 ? Math.round(currentDurationSum / currentSessionCount) : 0;
  const avgDurPrevious =
    previousSessionCount > 0 ? Math.round(previousDurationSum / previousSessionCount) : 0;

  const summary: DashboardSummary = {
    totalUsers: {
      current: totalUsersCurrent,
      previous: totalUsersPrevious,
      changePercent: pct(totalUsersCurrent, totalUsersPrevious),
    },
    activeSessions: {
      current: currentSessions,
      previous: previousSessions,
      changePercent: pct(currentSessions, previousSessions),
    },
    totalPageViews: {
      current: currentPageViews,
      previous: previousPageViews,
      changePercent: pct(currentPageViews, previousPageViews),
    },
    avgSessionDuration: {
      current: avgDurCurrent,
      previous: avgDurPrevious,
      changePercent: pct(avgDurCurrent, avgDurPrevious),
    },
  };

  cache.set(cacheKey, summary);
  return summary;
}

export async function getActivity(
  startDate?: string,
  endDate?: string
): Promise<ActivityPoint[]> {
  const end = endDate || daysAgoStr(0);
  const start = startDate || daysAgoStr(29);
  const cacheKey = `dashboard:activity:${start}:${end}`;
  const cached = cache.get<ActivityPoint[]>(cacheKey);
  if (cached) return cached;

  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const points: ActivityPoint[] = [];

  for (let ms = startMs; ms <= endMs; ms += 86400000) {
    const date = new Date(ms).toISOString().slice(0, 10);

    const sessItems = await queryAllByDate(TableNames.sessions, date);
    const pvItems = await queryAllByDate(TableNames.pageviews, date);

    const uniqueUsers = new Set<string>();
    for (const s of sessItems) {
      if (typeof s.userId === "string") uniqueUsers.add(s.userId);
    }

    points.push({
      date,
      sessions: sessItems.length,
      pageViews: pvItems.length,
      uniqueUsers: uniqueUsers.size,
    });
  }

  cache.set(cacheKey, points);
  return points;
}

export async function getDistribution(): Promise<DistributionSegment[]> {
  const cached = cache.get<DistributionSegment[]>("dashboard:distribution");
  if (cached) return cached;

  // Only real Firebase Auth users — GA4 fabricated users have empty email
  const users = await scanAll(
    TableNames.users,
    "attribute_exists(email) AND size(email) > :zero",
    { ":zero": 0 }
  );

  const now = new Date();
  const cutoff = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d;
  };

  const buckets = { active7d: 0, active30d: 0, active90d: 0, dormant: 0 };
  for (const u of users) {
    const lastSeen =
      typeof u.lastSeen === "string" ? new Date(u.lastSeen) : new Date(0);
    if (isNaN(lastSeen.getTime())) {
      buckets.dormant++;
    } else if (lastSeen >= cutoff(7)) {
      buckets.active7d++;
    } else if (lastSeen >= cutoff(30)) {
      buckets.active30d++;
    } else if (lastSeen >= cutoff(90)) {
      buckets.active90d++;
    } else {
      buckets.dormant++;
    }
  }

  const result: DistributionSegment[] = [
    { name: "Active (last 7 days)", value: buckets.active7d, color: "#5B5FC7" },
    { name: "Recent (8–30 days)", value: buckets.active30d, color: "#8082D2" },
    { name: "Returning (31–90 days)", value: buckets.active90d, color: "#AAABE1" },
    { name: "Dormant (90+ days)", value: buckets.dormant, color: "#D4D5F0" },
  ];

  cache.set("dashboard:distribution", result);
  return result;
}

export async function getRecentSessions(limit: number): Promise<RecentSession[]> {
  const cacheKey = `dashboard:recentSessions:${limit}`;
  const cached = cache.get<RecentSession[]>(cacheKey);
  if (cached) return cached;

  // Query recent days until we have enough sessions
  const sessions: RecentSession[] = [];
  for (let i = 0; i < 7 && sessions.length < limit; i++) {
    const date = daysAgoStr(i);
    const doc = getDocClient();
    const result = await doc.send(
      new QueryCommand({
        TableName: TableNames.sessions,
        IndexName: "byDate",
        KeyConditionExpression: "#d = :date",
        ExpressionAttributeNames: { "#d": "date" },
        ExpressionAttributeValues: { ":date": date },
        ScanIndexForward: false,
        Limit: limit - sessions.length,
      })
    );
    for (const item of result.Items ?? []) {
      sessions.push({
        userId: item.userId as string,
        email: (item.email as string) || "",
        duration: (item.duration as number) || 0,
        pagesViewed: (item.pagesViewed as number) || 0,
        date: item.date as string,
        country: (item.country as string) || "",
        device: (item.device as string) || "",
      });
    }
  }

  cache.set(cacheKey, sessions);
  return sessions;
}

export async function getTopPages(limit: number): Promise<TopPage[]> {
  const cacheKey = `dashboard:topPages:${limit}`;
  const cached = cache.get<TopPage[]>(cacheKey);
  if (cached) return cached;

  // Aggregate from recent pageview data (last 30 days)
  const allPVs: Record<string, unknown>[] = [];
  for (let i = 0; i < 30; i++) {
    const date = daysAgoStr(i);
    const items = await queryAllByDate(TableNames.pageviews, date);
    allPVs.push(...items);
  }

  const counts: Record<string, { views: number; visitors: Set<string>; title: string }> = {};
  for (const pv of allPVs) {
    const path = (pv.pagePath as string) || "(unknown)";
    if (!counts[path]) {
      counts[path] = {
        views: 0,
        visitors: new Set(),
        title: (pv.pageTitle as string) || path,
      };
    }
    // Use 'views' field if present (from GA4 sync), otherwise count as 1
    const viewCount = typeof pv.views === "number" ? pv.views : 1;
    counts[path].views += viewCount;
    if (typeof pv.userId === "string") counts[path].visitors.add(pv.userId);
  }

  const result = Object.entries(counts)
    .map(([pagePath, data]) => ({
      pagePath,
      pageTitle: data.title,
      views: data.views,
      uniqueVisitors: data.visitors.size,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);

  cache.set(cacheKey, result);
  return result;
}

// ─── DAU & Retention (read from DynamoDB metadata, written by sync) ──────────

type DAUPoint = { date: string; activeUsers: number };
type CohortData = {
  cohorts: Array<{
    label: string;
    startDate: string;
    endDate: string;
    totalUsers: number;
    retention: number[];
  }>;
};

async function getMetaPayload<T>(metaKey: string): Promise<T | null> {
  const doc = getDocClient();
  const result = await doc.send(
    new GetCommand({
      TableName: TableNames.users,
      Key: { userId: metaKey },
    })
  );
  if (!result.Item?.payload) return null;
  return result.Item.payload as T;
}

export async function getDAUTrend(
  startDate?: string,
  endDate?: string
): Promise<DAUPoint[]> {
  const end = endDate || daysAgoStr(0);
  const start = startDate || daysAgoStr(29);
  const cacheKey = `dau:trend:${start}:${end}`;
  const cached = cache.get<DAUPoint[]>(cacheKey);
  if (cached) return cached;

  // Always read 30-day data (only __meta:dau:30 and __meta:dau:1 exist)
  const data = await getMetaPayload<DAUPoint[]>("__meta:dau:30");
  const all = data ?? [];
  // Filter to requested date range
  const result = all.filter((p) => p.date >= start && p.date <= end);
  cache.set(cacheKey, result);
  return result;
}

export async function getCohortRetention(): Promise<CohortData> {
  const cached = cache.get<CohortData>("retention:cohorts");
  if (cached) return cached;

  const data = await getMetaPayload<CohortData>("__meta:cohort_retention");
  const result = data ?? { cohorts: [] };
  cache.set("retention:cohorts", result);
  return result;
}

// ─── Platform Stats ─────────────────────────────────────────────────────────

export async function getPlatformStats(): Promise<{
  totalSessions: number;
  totalPageViews: number;
}> {
  const cached = cache.get<{ totalSessions: number; totalPageViews: number }>(
    "platform:stats"
  );
  if (cached) return cached;

  const [totalSessions, totalPageViews] = await Promise.all([
    countAll(TableNames.sessions),
    countAll(TableNames.pageviews),
  ]);

  const stats = { totalSessions, totalPageViews };

  cache.set("platform:stats", stats);
  return stats;
}

// ─── Users ──────────────────────────────────────────────────────────────────

export async function getAllUsers(): Promise<UserProfile[]> {
  const cached = cache.get<UserProfile[]>("users:all");
  if (cached) return cached;

  const items = await scanAll(TableNames.users);
  const users = items as unknown as UserProfile[];
  cache.set("users:all", users);
  return users;
}

export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  const cacheKey = `users:detail:${userId}`;
  const cached = cache.get<UserDetail>(cacheKey);
  if (cached) return cached;

  const doc = getDocClient();
  const userResult = await doc.send(
    new GetCommand({
      TableName: TableNames.users,
      Key: { userId },
    })
  );
  if (!userResult.Item) return null;
  const user = userResult.Item as unknown as UserProfile;

  // Recent sessions for this user
  const sessResult = await doc.send(
    new QueryCommand({
      TableName: TableNames.sessions,
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
      ScanIndexForward: false,
      Limit: 5,
    })
  );
  const recentSessions: RecentSession[] = (sessResult.Items ?? []).map((s) => ({
    userId: s.userId as string,
    email: (s.email as string) || "",
    duration: (s.duration as number) || 0,
    pagesViewed: (s.pagesViewed as number) || 0,
    date: s.date as string,
  }));

  // Recent events — scan with filter (events PK is sessionId, not userId)
  const eventsResult = await doc.send(
    new ScanCommand({
      TableName: TableNames.events,
      FilterExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
      Limit: 100,
    })
  );
  const recentEvents = ((eventsResult.Items ?? []) as unknown as AnalyticsEvent[]).slice(0, 10);

  const detail: UserDetail = { ...user, recentSessions, recentEvents };
  cache.set(cacheKey, detail);
  return detail;
}

// ─── Events ─────────────────────────────────────────────────────────────────

export async function getEvents(opts: {
  limit: number;
  type?: string;
  startDate?: string;
  endDate?: string;
}): Promise<AnalyticsEvent[]> {
  const cacheKey = `events:list:${opts.limit}:${opts.type || ""}:${opts.startDate || ""}:${opts.endDate || ""}`;
  const cached = cache.get<AnalyticsEvent[]>(cacheKey);
  if (cached) return cached;

  const doc = getDocClient();
  let events: AnalyticsEvent[];

  if (opts.type) {
    // Use byType GSI
    const result = await doc.send(
      new QueryCommand({
        TableName: TableNames.events,
        IndexName: "byType",
        KeyConditionExpression: "eventType = :t",
        ExpressionAttributeValues: { ":t": opts.type },
        ScanIndexForward: false,
        Limit: opts.limit,
      })
    );
    events = (result.Items ?? []) as unknown as AnalyticsEvent[];
  } else if (opts.startDate && opts.endDate) {
    // Collect from byDate GSI across the date range
    const items: Record<string, unknown>[] = [];
    const start = new Date(opts.startDate);
    const end = new Date(opts.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const date = d.toISOString().slice(0, 10);
      const dayItems = await queryAllByDate(TableNames.events, date, "byDate", opts.limit);
      items.push(...dayItems);
      if (items.length >= opts.limit) break;
    }
    events = items.slice(0, opts.limit) as unknown as AnalyticsEvent[];
  } else {
    // Fallback to scan
    const result = await doc.send(
      new ScanCommand({
        TableName: TableNames.events,
        Limit: opts.limit,
      })
    );
    events = (result.Items ?? []) as unknown as AnalyticsEvent[];
  }

  cache.set(cacheKey, events);
  return events;
}

export async function getEventTimeline(days: number): Promise<EventTimelinePoint[]> {
  const cacheKey = `events:timeline:${days}`;
  const cached = cache.get<EventTimelinePoint[]>(cacheKey);
  if (cached) return cached;

  const points: EventTimelinePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = daysAgoStr(i);
    const items = await queryAllByDate(TableNames.events, date);
    const byType: Record<string, number> = {};
    for (const item of items) {
      const t = (item.eventType as string) || "unknown";
      byType[t] = (byType[t] || 0) + 1;
    }
    points.push({ date, count: items.length, byType });
  }

  cache.set(cacheKey, points);
  return points;
}

// ─── Behavior ───────────────────────────────────────────────────────────────

export async function getTopActions(limit: number): Promise<TopAction[]> {
  const cacheKey = `behavior:topActions:${limit}`;
  const cached = cache.get<TopAction[]>(cacheKey);
  if (cached) return cached;

  const allEvents = await scanAll(TableNames.events, undefined, undefined, undefined, 5000);

  const counts: Record<string, number> = {};
  for (const e of allEvents) {
    const name = (e.eventName as string) || (e.eventType as string) || "unknown";
    counts[name] = (counts[name] || 0) + 1;
  }

  const result = Object.entries(counts)
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  cache.set(cacheKey, result);
  return result;
}

export async function getSessionDurations(): Promise<SessionDurationBucket[]> {
  const cached = cache.get<SessionDurationBucket[]>("behavior:sessionDurations");
  if (cached) return cached;

  const allSessions = await scanAll(TableNames.sessions, undefined, undefined, undefined, 5000);

  const buckets: Record<string, number> = {
    "0-1 min": 0,
    "1-5 min": 0,
    "5-15 min": 0,
    "15-30 min": 0,
    "30-60 min": 0,
    "60+ min": 0,
  };

  for (const s of allSessions) {
    const duration = typeof s.duration === "number" ? s.duration : 0;
    const mins = duration / 60;
    if (mins < 1) buckets["0-1 min"]++;
    else if (mins < 5) buckets["1-5 min"]++;
    else if (mins < 15) buckets["5-15 min"]++;
    else if (mins < 30) buckets["15-30 min"]++;
    else if (mins < 60) buckets["30-60 min"]++;
    else buckets["60+ min"]++;
  }

  const result = Object.entries(buckets).map(([range, count]) => ({ range, count }));
  cache.set("behavior:sessionDurations", result);
  return result;
}

export async function getUserJourney(): Promise<UserJourneyStep[]> {
  const cached = cache.get<UserJourneyStep[]>("behavior:userJourney");
  if (cached) return cached;

  // Build a funnel from pageview data: group by pagePath, rank by # of unique users
  const allPVs = await scanAll(TableNames.pageviews, undefined, undefined, undefined, 5000);

  const pageUsers: Record<string, Set<string>> = {};
  for (const pv of allPVs) {
    const page = (pv.pagePath as string) || (pv.pageTitle as string) || "(unknown)";
    if (!pageUsers[page]) pageUsers[page] = new Set();
    if (typeof pv.userId === "string") pageUsers[page].add(pv.userId);
  }

  // Sort by user count descending, take top steps as the "journey"
  const sorted = Object.entries(pageUsers)
    .map(([step, users]) => ({ step, users: users.size }))
    .sort((a, b) => b.users - a.users)
    .slice(0, 6);

  cache.set("behavior:userJourney", sorted);
  return sorted;
}

// ─── Cache pre-warming ───────────────────────────────────────────────────────

/**
 * Pre-populate the in-memory cache by calling all major read functions.
 * Called after each sync cycle so user requests are always served from cache.
 */
export async function warmCache(): Promise<void> {
  const t0 = Date.now();
  console.log("[cache] Pre-warming cache...");

  try {
    await Promise.all([
      getDashboardSummary(),
      getActivity(),
      getDistribution(),
      getRecentSessions(10),
      getTopPages(10),
      getDAUTrend(),
      getCohortRetention(),
      getPlatformStats(),
      getAllUsers(),
      getEventTimeline(30),
      getTopActions(20),
      getSessionDurations(),
      getUserJourney(),
    ]);
    console.log(`[cache] Pre-warm complete in ${Date.now() - t0}ms`);
  } catch (err) {
    console.error(`[cache] Pre-warm partial failure (${Date.now() - t0}ms):`, (err as Error).message);
  }
}

// ─── Ingest (write operations — no caching) ─────────────────────────────────

export async function putSession(session: Session): Promise<void> {
  const doc = getDocClient();
  await doc.send(new PutCommand({ TableName: TableNames.sessions, Item: session }));
}

export async function putEvent(event: AnalyticsEvent): Promise<void> {
  const doc = getDocClient();
  await doc.send(new PutCommand({ TableName: TableNames.events, Item: event }));
}

export async function putPageView(pv: PageView): Promise<void> {
  const doc = getDocClient();
  await doc.send(new PutCommand({ TableName: TableNames.pageviews, Item: pv }));
}

export async function upsertUser(userId: string, email: string): Promise<void> {
  const doc = getDocClient();
  const now = new Date().toISOString();

  const existing = await doc.send(
    new GetCommand({ TableName: TableNames.users, Key: { userId } })
  );

  if (existing.Item) {
    const user = existing.Item as unknown as UserProfile;
    await doc.send(
      new PutCommand({
        TableName: TableNames.users,
        Item: {
          ...user,
          lastSeen: now,
          totalSessions: user.totalSessions + 1,
        },
      })
    );
  } else {
    const newUser: UserProfile = {
      userId,
      email,
      firstSeen: now,
      lastSeen: now,
      totalSessions: 1,
      totalPageViews: 0,
      totalEvents: 0,
    };
    await doc.send(new PutCommand({ TableName: TableNames.users, Item: newUser }));
  }

  // Invalidate user-related caches on write
  cache.invalidate("users:all");
  cache.invalidate(`users:detail:${userId}`);
}
