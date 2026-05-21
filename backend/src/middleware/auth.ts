import { Response, NextFunction } from "express";
import * as admin from "firebase-admin";
import { config } from "../config";
import { AuthenticatedRequest } from "../types";

// ─── Firebase Admin initialization ──────────────────────────────────────────

let firebaseInitialized = false;

function ensureFirebase(): void {
  if (firebaseInitialized) return;

  try {
    if (config.firebase.credentialsPath) {
      // Initialized automatically via GOOGLE_APPLICATION_CREDENTIALS env var
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: config.firebase.projectId || undefined,
      });
    } else if (config.firebase.projectId) {
      admin.initializeApp({
        projectId: config.firebase.projectId,
      });
    } else {
      console.warn(
        "[auth] No Firebase credentials configured. " +
          "Auth middleware will reject all requests in production. " +
          "Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID."
      );
      return;
    }
    firebaseInitialized = true;
    console.log("[auth] Firebase Admin SDK initialized");
  } catch (err) {
    // Already initialized (e.g. hot-reload)
    if ((err as Error).message?.includes("already exists")) {
      firebaseInitialized = true;
    } else {
      console.error("[auth] Firebase init error:", err);
    }
  }
}

// ─── Middleware ──────────────────────────────────────────────────────────────

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  // ── Development bypass ────────────────────────────────────────────────
  // When no Firebase credentials are configured, accept a special dev
  // token so the frontend can work locally during development.
  if (
    !firebaseInitialized &&
    !config.firebase.credentialsPath &&
    !config.firebase.projectId
  ) {
    if (token === "dev-token") {
      req.user = { uid: "dev-user", email: config.allowedEmails[0] };
      next();
      return;
    }
  }

  // ── Firebase token verification ───────────────────────────────────────
  ensureFirebase();

  if (!firebaseInitialized) {
    res.status(500).json({ error: "Authentication service not configured" });
    return;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const email = decoded.email;

    if (!email) {
      res.status(403).json({ error: "Token does not contain an email claim" });
      return;
    }

    if (config.allowedEmails.length > 0 && !config.allowedEmails.includes(email.toLowerCase())) {
      console.warn(`[auth] Rejected access from: ${email}`);
      res.status(403).json({ error: "Access denied. Email not in allowlist." });
      return;
    }

    req.user = { uid: decoded.uid, email };
    next();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Token verification failed";
    console.error("[auth] Token error:", message);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
