import express from "express";
import cors from "cors";
import path from "path";
import { config } from "./config";
import { authMiddleware } from "./middleware/auth";
import dashboardRoutes from "./routes/dashboard";
import usersRoutes from "./routes/users";
import eventsRoutes from "./routes/events";
import behaviorRoutes from "./routes/behavior";
import ingestRoutes from "./routes/ingest";
import { startSyncSchedule, syncAll, isSyncScheduleRunning } from "./services/sync";
import * as cache from "./services/cache";

const app = express();

// ─── Global middleware ──────────────────────────────────────────────────────

app.use(
  cors({
    origin: config.allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "1mb" }));

// ─── Health check (no auth) ─────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    syncSchedule: isSyncScheduleRunning() ? "running" : "stopped",
    timestamp: new Date().toISOString(),
  });
});

// ─── Request timing ─────────────────────────────────────────────────────────

app.use("/api", (req, res, next) => {
  const t0 = Date.now();
  res.on("finish", () => {
    console.log(`[api] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - t0}ms`);
  });
  next();
});

// ─── Auth-protected API routes ──────────────────────────────────────────────

app.use("/api", authMiddleware);

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/behavior", behaviorRoutes);
app.use("/api/ingest", ingestRoutes);

// ─── Admin endpoints ────────────────────────────────────────────────────────

/**
 * POST /api/admin/sync
 * Trigger a manual GA4 -> DynamoDB sync.
 */
app.post("/api/admin/sync", async (_req, res) => {
  try {
    console.log("[admin] Manual sync triggered");
    const result = await syncAll();
    res.json(result);
  } catch (err) {
    console.error("[admin] Manual sync failed:", (err as Error).message);
    res.status(500).json({ error: "Sync failed", message: (err as Error).message });
  }
});

/**
 * GET /api/admin/cache-stats
 * Return in-memory cache statistics.
 */
app.get("/api/admin/cache-stats", (_req, res) => {
  res.json(cache.getStats());
});

// ─── Serve frontend static files ─────────────────────────────────────────────

const staticDir = path.resolve(__dirname, "../../static");
app.use(express.static(staticDir));

// SPA fallback — any non-API route serves index.html
app.get("*", (_req, res) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

// ─── Global error handler ───────────────────────────────────────────────────

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[server] Unhandled error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
);

// ─── Start ──────────────────────────────────────────────────────────────────

app.listen(config.port, () => {
  console.log(`[server] Beacon Analytics API running on port ${config.port}`);
  console.log(`[server] Mode: ${config.useMockData ? "mock" : "live"}`);
  console.log(`[server] CORS origins: ${config.allowedOrigins.join(", ")}`);

  // Start the GA4 -> DynamoDB sync schedule (skip in mock mode)
  if (!config.useMockData) {
    console.log(`[server] GA4 Property: ${config.ga4PropertyId}`);
    startSyncSchedule();
  } else {
    console.log("[server] Mock mode — GA4 sync disabled");
  }
});

export default app;
