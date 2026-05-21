import { Router, Response } from "express";
import { AuthenticatedRequest } from "../types";
import * as db from "../services/data";

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Coerce any date-like string into ISO-8601.  Handles RFC-2822 from Firebase
 *  metadata (e.g. "Thu, 10 Apr 2025 09:15:00 GMT") as well as plain ISO. */
function toISO(value: string | undefined): string {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] || "Unknown";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

/**
 * GET /api/users
 *
 * Returns only real users (with an email).  GA4 anonymous aggregations
 * (email === "") are excluded so the table shows meaningful data.
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rawUsers, platformStats, dauTrend, retentionData] = await Promise.all([
      db.getAllUsers(),
      db.getPlatformStats(),
      db.getDAUTrend(),
      db.getCohortRetention(),
    ]);

    // Filter out GA4 anonymous users (no email)
    const realUsers = rawUsers.filter((u) => u.email);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const users = realUsers.map((u) => {
      const raw = u as unknown as Record<string, unknown>;
      const lastActive = toISO(u.lastSeen);
      const isActive = new Date(lastActive) >= thirtyDaysAgo;

      return {
        id: u.userId,
        email: u.email,
        displayName:
          (raw.displayName as string) || displayNameFromEmail(u.email),
        lastActive,
        totalSessions: u.totalSessions || 0,
        totalPageViews: u.totalPageViews || 0,
        createdAt: toISO(u.firstSeen),
        status: isActive ? ("active" as const) : ("inactive" as const),
      };
    });

    res.json({
      users,
      totalCount: users.length,
      platformStats,
      dauTrend,
      cohortRetention: retentionData.cohorts,
    });
  } catch (err) {
    console.error("[users/list]", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/**
 * GET /api/users/:userId
 * Single user detail with recent activity
 */
router.get("/:userId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId || typeof userId !== "string") {
      res.status(400).json({ error: "Invalid userId parameter" });
      return;
    }

    const user = await db.getUserDetail(userId);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  } catch (err) {
    console.error("[users/detail]", err);
    res.status(500).json({ error: "Failed to fetch user detail" });
  }
});

export default router;
