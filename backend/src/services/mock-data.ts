/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  MOCK DATA — used while DynamoDB is not connected.                     ║
 * ║  Set USE_MOCK_DATA=false in .env once real tables are provisioned.     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

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

// ─── Helper ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function isoAgo(n: number, hoursOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(d.getHours() - hoursOffset);
  return d.toISOString();
}

// ─── Raw records ────────────────────────────────────────────────────────────

const MOCK_USERS: UserProfile[] = [
  {
    userId: "usr_001",
    email: "alice@acme.com",
    firstSeen: "2025-11-15T08:30:00Z",
    lastSeen: isoAgo(0),
    totalSessions: 142,
    totalPageViews: 1873,
    totalEvents: 564,
  },
  {
    userId: "usr_002",
    email: "bob@acme.com",
    firstSeen: "2025-12-01T14:22:00Z",
    lastSeen: isoAgo(1),
    totalSessions: 87,
    totalPageViews: 934,
    totalEvents: 312,
  },
  {
    userId: "usr_003",
    email: "carol@widgets.io",
    firstSeen: "2026-01-10T10:05:00Z",
    lastSeen: isoAgo(0, 3),
    totalSessions: 63,
    totalPageViews: 712,
    totalEvents: 198,
  },
  {
    userId: "usr_004",
    email: "dave@widgets.io",
    firstSeen: "2026-02-05T16:45:00Z",
    lastSeen: isoAgo(2),
    totalSessions: 41,
    totalPageViews: 389,
    totalEvents: 127,
  },
  {
    userId: "usr_005",
    email: "eve@startup.co",
    firstSeen: "2026-03-01T09:12:00Z",
    lastSeen: isoAgo(0, 1),
    totalSessions: 28,
    totalPageViews: 256,
    totalEvents: 84,
  },
  {
    userId: "usr_006",
    email: "frank@startup.co",
    firstSeen: "2026-03-12T11:30:00Z",
    lastSeen: isoAgo(3),
    totalSessions: 19,
    totalPageViews: 145,
    totalEvents: 52,
  },
  {
    userId: "usr_007",
    email: "grace@bigcorp.com",
    firstSeen: "2026-03-20T13:00:00Z",
    lastSeen: isoAgo(1, 5),
    totalSessions: 12,
    totalPageViews: 98,
    totalEvents: 33,
  },
  {
    userId: "usr_008",
    email: "hank@bigcorp.com",
    firstSeen: "2026-04-01T07:45:00Z",
    lastSeen: isoAgo(0, 6),
    totalSessions: 8,
    totalPageViews: 67,
    totalEvents: 21,
  },
];

const MOCK_SESSIONS: Session[] = [
  {
    userId: "usr_001", sessionId: "ses_101", email: "alice@acme.com",
    startTime: isoAgo(0, 2), endTime: isoAgo(0, 1), duration: 3600,
    pagesViewed: 14, userAgent: "Mozilla/5.0 Chrome/124", ip: "192.168.1.10",
    date: daysAgo(0), timestamp: isoAgo(0, 2),
  },
  {
    userId: "usr_002", sessionId: "ses_102", email: "bob@acme.com",
    startTime: isoAgo(0, 4), endTime: isoAgo(0, 3), duration: 2400,
    pagesViewed: 9, userAgent: "Mozilla/5.0 Firefox/125", ip: "10.0.0.22",
    date: daysAgo(0), timestamp: isoAgo(0, 4),
  },
  {
    userId: "usr_003", sessionId: "ses_103", email: "carol@widgets.io",
    startTime: isoAgo(0, 5), endTime: isoAgo(0, 4), duration: 1800,
    pagesViewed: 7, userAgent: "Mozilla/5.0 Safari/17", ip: "172.16.0.5",
    date: daysAgo(0), timestamp: isoAgo(0, 5),
  },
  {
    userId: "usr_005", sessionId: "ses_104", email: "eve@startup.co",
    startTime: isoAgo(0, 1), endTime: isoAgo(0), duration: 900,
    pagesViewed: 4, userAgent: "Mozilla/5.0 Chrome/124", ip: "192.168.2.30",
    date: daysAgo(0), timestamp: isoAgo(0, 1),
  },
  {
    userId: "usr_008", sessionId: "ses_105", email: "hank@bigcorp.com",
    startTime: isoAgo(0, 7), endTime: isoAgo(0, 6), duration: 600,
    pagesViewed: 3, userAgent: "Mozilla/5.0 Edge/124", ip: "10.10.10.50",
    date: daysAgo(0), timestamp: isoAgo(0, 7),
  },
  {
    userId: "usr_001", sessionId: "ses_106", email: "alice@acme.com",
    startTime: isoAgo(1, 3), endTime: isoAgo(1, 1), duration: 5400,
    pagesViewed: 18, userAgent: "Mozilla/5.0 Chrome/124", ip: "192.168.1.10",
    date: daysAgo(1), timestamp: isoAgo(1, 3),
  },
  {
    userId: "usr_004", sessionId: "ses_107", email: "dave@widgets.io",
    startTime: isoAgo(1, 6), endTime: isoAgo(1, 5), duration: 1200,
    pagesViewed: 5, userAgent: "Mozilla/5.0 Chrome/124", ip: "172.16.0.12",
    date: daysAgo(1), timestamp: isoAgo(1, 6),
  },
  {
    userId: "usr_006", sessionId: "ses_108", email: "frank@startup.co",
    startTime: isoAgo(2, 2), endTime: isoAgo(2, 1), duration: 3000,
    pagesViewed: 11, userAgent: "Mozilla/5.0 Safari/17", ip: "192.168.3.8",
    date: daysAgo(2), timestamp: isoAgo(2, 2),
  },
  {
    userId: "usr_007", sessionId: "ses_109", email: "grace@bigcorp.com",
    startTime: isoAgo(3, 4), endTime: isoAgo(3, 3), duration: 2100,
    pagesViewed: 8, userAgent: "Mozilla/5.0 Firefox/125", ip: "10.10.10.22",
    date: daysAgo(3), timestamp: isoAgo(3, 4),
  },
  {
    userId: "usr_002", sessionId: "ses_110", email: "bob@acme.com",
    startTime: isoAgo(4, 5), endTime: isoAgo(4, 3), duration: 4200,
    pagesViewed: 16, userAgent: "Mozilla/5.0 Firefox/125", ip: "10.0.0.22",
    date: daysAgo(4), timestamp: isoAgo(4, 5),
  },
];

const EVENT_TYPES = ["click", "submit", "navigation", "search", "download", "export"];
const EVENT_NAMES = [
  "button_click", "form_submit", "page_navigate", "search_query",
  "file_download", "data_export", "filter_apply", "chart_interact",
  "settings_change", "share_link",
];
const PAGES = [
  "/dashboard", "/projects", "/projects/acme-1", "/analytics",
  "/settings", "/team", "/reports", "/data-explorer",
];

const MOCK_EVENTS: AnalyticsEvent[] = Array.from({ length: 60 }, (_, i) => {
  const dayOffset = Math.floor(i / 8);
  const user = MOCK_USERS[i % MOCK_USERS.length];
  const session = MOCK_SESSIONS[i % MOCK_SESSIONS.length];
  return {
    sessionId: session.sessionId,
    eventId: `evt_${String(i + 1).padStart(3, "0")}`,
    userId: user.userId,
    email: user.email,
    eventType: EVENT_TYPES[i % EVENT_TYPES.length],
    eventName: EVENT_NAMES[i % EVENT_NAMES.length],
    timestamp: isoAgo(dayOffset, i % 12),
    date: daysAgo(dayOffset),
    properties: { source: "web", variant: i % 2 === 0 ? "A" : "B" },
    page: PAGES[i % PAGES.length],
  };
});

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/projects/acme-1": "Project: ACME-1",
  "/analytics": "Analytics",
  "/settings": "Settings",
  "/team": "Team",
  "/reports": "Reports",
  "/data-explorer": "Data Explorer",
};

const MOCK_PAGEVIEWS: PageView[] = Array.from({ length: 80 }, (_, i) => {
  const dayOffset = Math.floor(i / 10);
  const user = MOCK_USERS[i % MOCK_USERS.length];
  const session = MOCK_SESSIONS[i % MOCK_SESSIONS.length];
  const page = PAGES[i % PAGES.length];
  return {
    sessionId: session.sessionId,
    userId: user.userId,
    email: user.email,
    pagePath: page,
    pageTitle: PAGE_TITLES[page] || page,
    timestamp: isoAgo(dayOffset, i % 12),
    date: daysAgo(dayOffset),
    referrer: i % 3 === 0 ? "https://google.com" : "",
    duration: 15 + (i * 7) % 300,
  };
});

// ─── Aggregated endpoint data ───────────────────────────────────────────────

export function getMockDashboardSummary(): DashboardSummary {
  return {
    totalUsers: { current: 8, previous: 6, changePercent: 33.3 },
    activeSessions: { current: 5, previous: 3, changePercent: 66.7 },
    totalPageViews: { current: 4474, previous: 3812, changePercent: 17.4 },
    avgSessionDuration: { current: 2520, previous: 2180, changePercent: 15.6 },
  };
}

export function getMockActivity(days: number): ActivityPoint[] {
  const points: ActivityPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = daysAgo(i);
    const base = Math.max(1, Math.floor(Math.random() * 6) + 2);
    points.push({
      date,
      sessions: base + Math.floor(Math.random() * 4),
      pageViews: base * 8 + Math.floor(Math.random() * 30),
      uniqueUsers: Math.max(1, base - Math.floor(Math.random() * 2)),
    });
  }
  return points;
}

export function getMockDistribution(): DistributionSegment[] {
  return [
    { name: "Power Users (10+ sessions)", value: 2, color: "#5B5FC7" },
    { name: "Regular (5-9 sessions)", value: 3, color: "#8082D2" },
    { name: "Occasional (2-4 sessions)", value: 2, color: "#AAABE1" },
    { name: "New (1 session)", value: 1, color: "#D4D5F0" },
  ];
}

export function getMockRecentSessions(limit: number): RecentSession[] {
  return MOCK_SESSIONS.slice(0, limit).map((s) => ({
    userId: s.userId,
    email: s.email,
    duration: s.duration,
    pagesViewed: s.pagesViewed,
    date: s.date,
  }));
}

export function getMockTopPages(limit: number): TopPage[] {
  const counts: Record<string, { views: number; visitors: Set<string> }> = {};
  for (const pv of MOCK_PAGEVIEWS) {
    if (!counts[pv.pagePath]) {
      counts[pv.pagePath] = { views: 0, visitors: new Set() };
    }
    counts[pv.pagePath].views++;
    counts[pv.pagePath].visitors.add(pv.userId);
  }
  return Object.entries(counts)
    .map(([pagePath, data]) => ({
      pagePath,
      pageTitle: PAGE_TITLES[pagePath] || pagePath,
      views: data.views,
      uniqueVisitors: data.visitors.size,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

export function getMockUsers(): UserProfile[] {
  return MOCK_USERS;
}

export function getMockUserDetail(userId: string): UserDetail | null {
  const user = MOCK_USERS.find((u) => u.userId === userId);
  if (!user) return null;

  return {
    ...user,
    recentSessions: MOCK_SESSIONS
      .filter((s) => s.userId === userId)
      .slice(0, 5)
      .map((s) => ({
        userId: s.userId,
        email: s.email,
        duration: s.duration,
        pagesViewed: s.pagesViewed,
        date: s.date,
      })),
    recentEvents: MOCK_EVENTS.filter((e) => e.userId === userId).slice(0, 10),
  };
}

export function getMockEvents(opts: {
  limit: number;
  type?: string;
  startDate?: string;
  endDate?: string;
}): AnalyticsEvent[] {
  let events = [...MOCK_EVENTS];
  if (opts.type) {
    events = events.filter((e) => e.eventType === opts.type);
  }
  if (opts.startDate) {
    events = events.filter((e) => e.date >= opts.startDate!);
  }
  if (opts.endDate) {
    events = events.filter((e) => e.date <= opts.endDate!);
  }
  return events.slice(0, opts.limit);
}

export function getMockEventTimeline(days: number): EventTimelinePoint[] {
  const points: EventTimelinePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = daysAgo(i);
    const dayEvents = MOCK_EVENTS.filter((e) => e.date === date);
    const byType: Record<string, number> = {};
    for (const e of dayEvents) {
      byType[e.eventType] = (byType[e.eventType] || 0) + 1;
    }
    points.push({ date, count: dayEvents.length, byType });
  }
  return points;
}

export function getMockTopActions(limit: number): TopAction[] {
  const counts: Record<string, number> = {};
  for (const e of MOCK_EVENTS) {
    counts[e.eventName] = (counts[e.eventName] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getMockSessionDurations(): SessionDurationBucket[] {
  const buckets: Record<string, number> = {
    "0-1 min": 0,
    "1-5 min": 0,
    "5-15 min": 0,
    "15-30 min": 0,
    "30-60 min": 0,
    "60+ min": 0,
  };
  for (const s of MOCK_SESSIONS) {
    const mins = s.duration / 60;
    if (mins < 1) buckets["0-1 min"]++;
    else if (mins < 5) buckets["1-5 min"]++;
    else if (mins < 15) buckets["5-15 min"]++;
    else if (mins < 30) buckets["15-30 min"]++;
    else if (mins < 60) buckets["30-60 min"]++;
    else buckets["60+ min"]++;
  }
  return Object.entries(buckets).map(([range, count]) => ({ range, count }));
}

export function getMockUserJourney(): UserJourneyStep[] {
  return [
    { step: "Login", users: 100 },
    { step: "Dashboard", users: 94 },
    { step: "Projects", users: 72 },
    { step: "Data Explorer", users: 58 },
    { step: "Export", users: 31 },
  ];
}

// ─── Raw record access (used by ingest to append) ───────────────────────────

export function getMockRawSessions(): Session[] {
  return MOCK_SESSIONS;
}

export function getMockRawEvents(): AnalyticsEvent[] {
  return MOCK_EVENTS;
}

export function getMockRawPageViews(): PageView[] {
  return MOCK_PAGEVIEWS;
}
