import { Router, Response } from "express";
import { AuthenticatedRequest } from "../types";
import * as db from "../services/data";

const router = Router();

// ---------------------------------------------------------------------------
// Helper: derive a display name from whatever we have
// ---------------------------------------------------------------------------
function displayName(
  email: string,
  userId: string,
  country?: string,
  device?: string
): string {
  if (email) {
    const local = email.split("@")[0] || "";
    if (local) return local.charAt(0).toUpperCase() + local.slice(1);
  }
  // For GA4 anonymous sessions, show device / country
  const parts: string[] = [];
  if (device) parts.push(device.charAt(0).toUpperCase() + device.slice(1));
  if (country && country !== "(not set)") parts.push(country);
  if (parts.length > 0) return parts.join(" / ");

  if (userId.startsWith("ga4_")) return `User ${userId.slice(4, 10)}`;
  return userId.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Combined endpoint — matches what the frontend's fetchDashboardData() expects
// GET /api/dashboard
//
// Response shape  (frontend DashboardData):
// {
//   kpis: KpiData,
//   timeSeries: TimeSeriesPoint[],
//   userDistribution: UserDistribution[],
//   recentSessions: Session[],
//   topPages: PageView[],
// }
// ---------------------------------------------------------------------------
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const startDate = typeof req.query.startDate === "string" ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined;

    const [summary, activity, distribution, recentSessions, topPages, dauData, retentionData] =
      await Promise.all([
        db.getDashboardSummary(startDate, endDate),
        db.getActivity(startDate, endDate),
        db.getDistribution(),
        db.getRecentSessions(10),
        db.getTopPages(10),
        db.getDAUTrend(startDate, endDate),
        db.getCohortRetention(),
      ]);

    const pctChange = (cur: number, prev: number): number =>
      prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 1000) / 10;

    // DAU: today's value, plus change vs ~30 days ago (use earliest available point)
    const todayDAU = dauData.length > 0 ? dauData[dauData.length - 1].activeUsers : 0;
    const dauPrev = dauData.length > 1 ? dauData[0].activeUsers : 0;
    const dauChange = pctChange(todayDAU, dauPrev);

    // Retention: latest valid cohort value, plus change vs cohort 4 weeks earlier
    const cohorts = retentionData.cohorts;
    function retentionAt(weekIdx: number): { current: number; change: number } {
      let latestIdx = -1;
      for (let i = cohorts.length - 1; i >= 0; i--) {
        if (cohorts[i].retention[weekIdx] >= 0) {
          latestIdx = i;
          break;
        }
      }
      if (latestIdx === -1) return { current: 0, change: 0 };
      const current = cohorts[latestIdx].retention[weekIdx];
      const prevIdx = latestIdx - 4;
      if (prevIdx < 0 || cohorts[prevIdx].retention[weekIdx] < 0) {
        return { current, change: 0 };
      }
      return { current, change: pctChange(current, cohorts[prevIdx].retention[weekIdx]) };
    }
    const d7 = retentionAt(1);
    const d14 = retentionAt(2);

    // Map DashboardSummary (KpiMetric objects) -> flat KpiData the frontend wants
    const kpis = {
      totalUsers: summary.totalUsers.current,
      totalUsersChange: summary.totalUsers.changePercent,
      activeSessions: summary.activeSessions.current,
      activeSessionsChange: summary.activeSessions.changePercent,
      pageViews: summary.totalPageViews.current,
      pageViewsChange: summary.totalPageViews.changePercent,
      avgSessionDuration: summary.avgSessionDuration.current,
      avgSessionDurationChange: summary.avgSessionDuration.changePercent,
      dau: todayDAU,
      dauChange,
      d7Retention: d7.current,
      d7RetentionChange: d7.change,
      d14Retention: d14.current,
      d14RetentionChange: d14.change,
    };

    // Map ActivityPoint[] -> TimeSeriesPoint[] (drop uniqueUsers)
    const timeSeries = activity.map((a) => ({
      date: a.date,
      sessions: a.sessions,
      pageViews: a.pageViews,
    }));

    // Map DistributionSegment[] -> UserDistribution[] (ensure color exists)
    const DISTRIBUTION_COLORS = ["#5B5FC7", "#8082D2", "#AAABE1", "#D4D5F0"];
    const userDistribution = distribution.map((d, i) => ({
      name: d.name,
      value: d.value,
      color: d.color || DISTRIBUTION_COLORS[i % DISTRIBUTION_COLORS.length],
    }));

    // Map RecentSession[] -> Session[] (frontend shape with id, userEmail, etc.)
    const sessions = recentSessions.map((s, i) => ({
      id: `rs_${i}`,
      userId: s.userId,
      userEmail: s.email || "",
      userName: displayName(s.email, s.userId, s.country, s.device),
      duration: s.duration,
      pagesViewed: s.pagesViewed,
      startedAt: s.date,
      endedAt: s.date,
    }));

    // Map TopPage[] -> PageView[] (frontend expects path/title/views/uniqueVisitors)
    const pages = topPages.map((p) => ({
      path: p.pagePath,
      title: p.pageTitle,
      views: p.views,
      uniqueVisitors: p.uniqueVisitors,
    }));

    res.json({
      kpis,
      timeSeries,
      userDistribution,
      recentSessions: sessions,
      topPages: pages,
    });
  } catch (err) {
    console.error("[dashboard/combined]", err);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

// ---------------------------------------------------------------------------
// Granular endpoints (kept for direct API usage)
// ---------------------------------------------------------------------------

/**
 * GET /api/dashboard/summary
 * KPI summary: totalUsers, activeSessions, totalPageViews, avgSessionDuration
 */
router.get("/summary", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const summary = await db.getDashboardSummary();
    res.json(summary);
  } catch (err) {
    console.error("[dashboard/summary]", err);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

/**
 * GET /api/dashboard/activity?days=30
 * Activity over time: sessions, pageViews, uniqueUsers per day
 */
router.get("/activity", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const startDate = typeof req.query.startDate === "string" ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined;
    const activity = await db.getActivity(startDate, endDate);
    res.json(activity);
  } catch (err) {
    console.error("[dashboard/activity]", err);
    res.status(500).json({ error: "Failed to fetch activity data" });
  }
});

/**
 * GET /api/dashboard/distribution
 * User activity distribution (for donut chart)
 */
router.get("/distribution", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const distribution = await db.getDistribution();
    res.json(distribution);
  } catch (err) {
    console.error("[dashboard/distribution]", err);
    res.status(500).json({ error: "Failed to fetch distribution data" });
  }
});

/**
 * GET /api/dashboard/recent-sessions?limit=10
 * Most recent sessions
 */
router.get("/recent-sessions", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 100);
    const sessions = await db.getRecentSessions(limit);
    res.json(sessions);
  } catch (err) {
    console.error("[dashboard/recent-sessions]", err);
    res.status(500).json({ error: "Failed to fetch recent sessions" });
  }
});

/**
 * GET /api/dashboard/top-pages?limit=10
 * Top pages by view count
 */
router.get("/top-pages", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 100);
    const pages = await db.getTopPages(limit);
    res.json(pages);
  } catch (err) {
    console.error("[dashboard/top-pages]", err);
    res.status(500).json({ error: "Failed to fetch top pages" });
  }
});

export default router;
