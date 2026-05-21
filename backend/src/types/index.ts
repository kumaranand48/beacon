// ─── DynamoDB Record Types ───────────────────────────────────────────────────

export interface Session {
  userId: string;
  sessionId: string;
  email: string;
  startTime: string;   // ISO 8601
  endTime: string;      // ISO 8601
  duration: number;     // seconds
  pagesViewed: number;
  userAgent: string;
  ip: string;
  date: string;         // YYYY-MM-DD  (GSI byDate PK)
  timestamp: string;    // ISO 8601    (GSI byDate SK)
}

export interface AnalyticsEvent {
  sessionId: string;
  eventId: string;
  userId: string;
  email: string;
  eventType: string;
  eventName: string;
  timestamp: string;
  date: string;
  properties: Record<string, unknown>;
  page: string;
}

export interface PageView {
  sessionId: string;
  userId: string;
  email: string;
  pagePath: string;
  pageTitle: string;
  timestamp: string;
  date: string;
  referrer: string;
  duration: number;     // seconds on page
}

export interface UserProfile {
  userId: string;
  email: string;
  firstSeen: string;
  lastSeen: string;
  totalSessions: number;
  totalPageViews: number;
  totalEvents: number;
}

// ─── API Response Types ─────────────────────────────────────────────────────

export interface KpiMetric {
  current: number;
  previous: number;
  changePercent: number;
}

export interface DashboardSummary {
  totalUsers: KpiMetric;
  activeSessions: KpiMetric;
  totalPageViews: KpiMetric;
  avgSessionDuration: KpiMetric;
}

export interface ActivityPoint {
  date: string;
  sessions: number;
  pageViews: number;
  uniqueUsers: number;
}

export interface DistributionSegment {
  name: string;
  value: number;
  color?: string;
}

export interface UserJourneyStep {
  step: string;
  users: number;
}

export interface RecentSession {
  userId: string;
  email: string;
  duration: number;
  pagesViewed: number;
  date: string;
  country?: string;
  device?: string;
}

export interface TopPage {
  pagePath: string;
  pageTitle: string;
  views: number;
  uniqueVisitors: number;
}

export interface DAUPoint {
  date: string;
  activeUsers: number;
}

export interface CohortWeek {
  label: string;
  startDate: string;
  endDate: string;
  totalUsers: number;
  retention: number[];  // percentages for week 0-4, -1 means no data yet
}

export interface EventTimelinePoint {
  date: string;
  count: number;
  byType: Record<string, number>;
}

export interface TopAction {
  action: string;
  count: number;
}

export interface SessionDurationBucket {
  range: string;
  count: number;
}

export interface UserDetail extends UserProfile {
  recentSessions: RecentSession[];
  recentEvents: AnalyticsEvent[];
}

// ─── Ingest Payloads ────────────────────────────────────────────────────────

export interface IngestSessionPayload {
  userId: string;
  email: string;
  startTime: string;
  endTime: string;
  pagesViewed: number;
  userAgent?: string;
  ip?: string;
}

export interface IngestEventPayload {
  sessionId: string;
  userId: string;
  email: string;
  eventType: string;
  eventName: string;
  properties?: Record<string, unknown>;
  page: string;
}

export interface IngestPageViewPayload {
  sessionId: string;
  userId: string;
  email: string;
  pagePath: string;
  pageTitle: string;
  referrer?: string;
  duration?: number;
}

// ─── Express Augmentation ───────────────────────────────────────────────────

import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
  };
}
