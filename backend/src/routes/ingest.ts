import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { AuthenticatedRequest, IngestSessionPayload, IngestEventPayload, IngestPageViewPayload } from "../types";
import * as db from "../services/dynamodb";

const router = Router();

// ─── Validation helpers ─────────────────────────────────────────────────────

function isNonEmptyString(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

function isValidEmail(val: unknown): val is string {
  return isNonEmptyString(val) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

function isISODate(val: unknown): val is string {
  if (!isNonEmptyString(val)) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

// ─── POST /api/ingest/session ───────────────────────────────────────────────

router.post("/session", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as IngestSessionPayload;

    // Validate required fields
    const errors: string[] = [];
    if (!isNonEmptyString(body.userId)) errors.push("userId is required");
    if (!isValidEmail(body.email)) errors.push("valid email is required");
    if (!isISODate(body.startTime)) errors.push("startTime must be a valid ISO date");
    if (!isISODate(body.endTime)) errors.push("endTime must be a valid ISO date");
    if (typeof body.pagesViewed !== "number" || body.pagesViewed < 0) {
      errors.push("pagesViewed must be a non-negative number");
    }

    if (errors.length > 0) {
      res.status(400).json({ error: "Validation failed", details: errors });
      return;
    }

    const startTime = new Date(body.startTime);
    const endTime = new Date(body.endTime);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

    if (duration < 0) {
      res.status(400).json({ error: "endTime must be after startTime" });
      return;
    }

    const sessionId = `ses_${uuidv4().slice(0, 8)}`;
    const date = startTime.toISOString().slice(0, 10);

    await db.putSession({
      userId: body.userId,
      sessionId,
      email: body.email,
      startTime: body.startTime,
      endTime: body.endTime,
      duration,
      pagesViewed: body.pagesViewed,
      userAgent: body.userAgent || "",
      ip: body.ip || "",
      date,
      timestamp: body.startTime,
    });

    // Upsert user profile
    await db.upsertUser(body.userId, body.email);

    console.log(`[ingest] Session created: ${sessionId} for ${body.email}`);
    res.status(201).json({ sessionId, duration });
  } catch (err) {
    console.error("[ingest/session]", err);
    res.status(500).json({ error: "Failed to ingest session" });
  }
});

// ─── POST /api/ingest/event ─────────────────────────────────────────────────

router.post("/event", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as IngestEventPayload;

    const errors: string[] = [];
    if (!isNonEmptyString(body.sessionId)) errors.push("sessionId is required");
    if (!isNonEmptyString(body.userId)) errors.push("userId is required");
    if (!isValidEmail(body.email)) errors.push("valid email is required");
    if (!isNonEmptyString(body.eventType)) errors.push("eventType is required");
    if (!isNonEmptyString(body.eventName)) errors.push("eventName is required");
    if (!isNonEmptyString(body.page)) errors.push("page is required");

    if (errors.length > 0) {
      res.status(400).json({ error: "Validation failed", details: errors });
      return;
    }

    const eventId = `evt_${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const date = now.slice(0, 10);

    await db.putEvent({
      sessionId: body.sessionId,
      eventId,
      userId: body.userId,
      email: body.email,
      eventType: body.eventType,
      eventName: body.eventName,
      timestamp: now,
      date,
      properties: body.properties || {},
      page: body.page,
    });

    console.log(`[ingest] Event created: ${eventId} (${body.eventType}/${body.eventName})`);
    res.status(201).json({ eventId, timestamp: now });
  } catch (err) {
    console.error("[ingest/event]", err);
    res.status(500).json({ error: "Failed to ingest event" });
  }
});

// ─── POST /api/ingest/pageview ──────────────────────────────────────────────

router.post("/pageview", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as IngestPageViewPayload;

    const errors: string[] = [];
    if (!isNonEmptyString(body.sessionId)) errors.push("sessionId is required");
    if (!isNonEmptyString(body.userId)) errors.push("userId is required");
    if (!isValidEmail(body.email)) errors.push("valid email is required");
    if (!isNonEmptyString(body.pagePath)) errors.push("pagePath is required");
    if (!isNonEmptyString(body.pageTitle)) errors.push("pageTitle is required");

    if (errors.length > 0) {
      res.status(400).json({ error: "Validation failed", details: errors });
      return;
    }

    const now = new Date().toISOString();
    const date = now.slice(0, 10);

    await db.putPageView({
      sessionId: body.sessionId,
      userId: body.userId,
      email: body.email,
      pagePath: body.pagePath,
      pageTitle: body.pageTitle,
      timestamp: now,
      date,
      referrer: body.referrer || "",
      duration: body.duration || 0,
    });

    console.log(`[ingest] PageView: ${body.pagePath} by ${body.email}`);
    res.status(201).json({ timestamp: now });
  } catch (err) {
    console.error("[ingest/pageview]", err);
    res.status(500).json({ error: "Failed to ingest pageview" });
  }
});

export default router;
