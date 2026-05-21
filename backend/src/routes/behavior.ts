import { Router, Response } from "express";
import { AuthenticatedRequest } from "../types";
import * as db from "../services/data";

const router = Router();

/**
 * GET /api/behavior
 *
 * Frontend expects (BehaviorPageData):
 * {
 *   topActions: UserAction[],             // { action, count }
 *   sessionDurations: SessionDurationBucket[], // { range, count }
 *   userJourney: { step: string; users: number }[],
 * }
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [topActions, sessionDurations, userJourney] = await Promise.all([
      db.getTopActions(20),
      db.getSessionDurations(),
      db.getUserJourney(),
    ]);

    res.json({ topActions, sessionDurations, userJourney });
  } catch (err) {
    console.error("[behavior/combined]", err);
    res.status(500).json({ error: "Failed to fetch behavior data" });
  }
});

// ---------------------------------------------------------------------------
// Granular endpoints (kept for direct API usage)
// ---------------------------------------------------------------------------

/**
 * GET /api/behavior/top-actions?limit=20
 * Top user actions by frequency
 */
router.get("/top-actions", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const actions = await db.getTopActions(limit);
    res.json(actions);
  } catch (err) {
    console.error("[behavior/top-actions]", err);
    res.status(500).json({ error: "Failed to fetch top actions" });
  }
});

/**
 * GET /api/behavior/session-durations
 * Session duration distribution
 */
router.get("/session-durations", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const durations = await db.getSessionDurations();
    res.json(durations);
  } catch (err) {
    console.error("[behavior/session-durations]", err);
    res.status(500).json({ error: "Failed to fetch session duration data" });
  }
});

export default router;
