import { Router, Response } from "express";
import { AuthenticatedRequest } from "../types";
import * as db from "../services/data";

const router = Router();

/**
 * GET /api/events
 *
 * Frontend expects (EventsPageData):
 * {
 *   timeSeries: EventTimeSeriesPoint[],   // { date, events }
 *   recentEvents: AnalyticsEvent[],       // { id, name, userId, userEmail, timestamp, properties }
 * }
 *
 * Backend EventTimelinePoint has: { date, count, byType }
 *   -> map: count -> events
 *
 * Backend AnalyticsEvent has: { eventId, eventName, userId, email, timestamp, properties, ... }
 *   -> map: eventId -> id, eventName -> name, email -> userEmail
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 500);
    const type = (req.query.type as string) || undefined;
    const startDate = (req.query.startDate as string) || undefined;
    const endDate = (req.query.endDate as string) || undefined;

    // Basic date format validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (startDate && !dateRegex.test(startDate)) {
      res.status(400).json({ error: "startDate must be YYYY-MM-DD" });
      return;
    }
    if (endDate && !dateRegex.test(endDate)) {
      res.status(400).json({ error: "endDate must be YYYY-MM-DD" });
      return;
    }

    const [rawTimeline, rawEvents] = await Promise.all([
      db.getEventTimeline(30),
      db.getEvents({ limit, type, startDate, endDate }),
    ]);

    // Map EventTimelinePoint[] -> EventTimeSeriesPoint[]
    const timeSeries = rawTimeline.map((t) => ({
      date: t.date,
      events: t.count,
    }));

    // Map backend AnalyticsEvent[] -> frontend AnalyticsEvent[]
    const recentEvents = rawEvents.map((e) => ({
      id: e.eventId,
      name: e.eventName,
      userId: e.userId,
      userEmail: e.email,
      timestamp: e.timestamp,
      properties: e.properties as Record<string, string | number | boolean>,
    }));

    res.json({ timeSeries, recentEvents });
  } catch (err) {
    console.error("[events/combined]", err);
    res.status(500).json({ error: "Failed to fetch events data" });
  }
});

// ---------------------------------------------------------------------------
// Granular endpoints (kept for direct API usage)
// ---------------------------------------------------------------------------

/**
 * GET /api/events/timeline?days=30
 * Events over time grouped by type
 */
router.get("/timeline", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365);
    const timeline = await db.getEventTimeline(days);
    res.json(timeline);
  } catch (err) {
    console.error("[events/timeline]", err);
    res.status(500).json({ error: "Failed to fetch event timeline" });
  }
});

export default router;
