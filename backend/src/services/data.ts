/**
 * Data adapter — auto-switches between DynamoDB and mock data.
 *
 * When config.useMockData is true (auto-detected when AWS creds are missing),
 * all reads are served from the in-memory mock data service.
 * Otherwise, reads go through DynamoDB.
 */

import { config } from "../config";
import * as db from "./dynamodb";
import * as mock from "./mock-data";
import type {
  DashboardSummary,
  ActivityPoint,
  DistributionSegment,
  RecentSession,
  TopPage,
  UserProfile,
  UserDetail,
  AnalyticsEvent,
  EventTimelinePoint,
  TopAction,
  SessionDurationBucket,
  UserJourneyStep,
} from "../types";

const USE_MOCK = config.useMockData;

if (USE_MOCK) {
  console.log("[data] Mock mode enabled — serving in-memory data (no AWS required)");
}

// Dashboard
export function getDashboardSummary(startDate?: string, endDate?: string): Promise<DashboardSummary> {
  if (USE_MOCK) return Promise.resolve(mock.getMockDashboardSummary());
  return db.getDashboardSummary(startDate, endDate);
}

export function getActivity(startDate?: string, endDate?: string): Promise<ActivityPoint[]> {
  if (USE_MOCK) return Promise.resolve(mock.getMockActivity(30));
  return db.getActivity(startDate, endDate);
}

export function getDistribution(): Promise<DistributionSegment[]> {
  if (USE_MOCK) return Promise.resolve(mock.getMockDistribution());
  return db.getDistribution();
}

export function getRecentSessions(limit: number): Promise<RecentSession[]> {
  if (USE_MOCK) return Promise.resolve(mock.getMockRecentSessions(limit));
  return db.getRecentSessions(limit);
}

export function getTopPages(limit: number): Promise<TopPage[]> {
  if (USE_MOCK) return Promise.resolve(mock.getMockTopPages(limit));
  return db.getTopPages(limit);
}

export function getDAUTrend(startDate?: string, endDate?: string): Promise<{ date: string; activeUsers: number }[]> {
  if (USE_MOCK) {
    // Generate mock DAU data for 30 days
    const points = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      points.push({ date: d.toISOString().slice(0, 10), activeUsers: 20 + Math.floor(Math.random() * 40) });
    }
    return Promise.resolve(points);
  }
  return db.getDAUTrend(startDate, endDate);
}

export function getCohortRetention(): Promise<{ cohorts: Array<{ label: string; startDate: string; endDate: string; totalUsers: number; retention: number[] }> }> {
  if (USE_MOCK) return Promise.resolve({ cohorts: [] });
  return db.getCohortRetention();
}

export function getPlatformStats(): Promise<{ totalSessions: number; totalPageViews: number }> {
  if (USE_MOCK) return Promise.resolve({ totalSessions: 3991, totalPageViews: 15374 });
  return db.getPlatformStats();
}

// Users
export function getAllUsers(): Promise<UserProfile[]> {
  if (USE_MOCK) return Promise.resolve(mock.getMockUsers());
  return db.getAllUsers();
}

export function getUserDetail(userId: string): Promise<UserDetail | null> {
  if (USE_MOCK) return Promise.resolve(mock.getMockUserDetail(userId));
  return db.getUserDetail(userId);
}

// Events
export function getEvents(opts: { limit: number; type?: string; startDate?: string; endDate?: string }): Promise<AnalyticsEvent[]> {
  if (USE_MOCK) return Promise.resolve(mock.getMockEvents(opts));
  return db.getEvents(opts);
}

export function getEventTimeline(days: number): Promise<EventTimelinePoint[]> {
  if (USE_MOCK) return Promise.resolve(mock.getMockEventTimeline(days));
  return db.getEventTimeline(days);
}

// Behavior
export function getTopActions(limit: number): Promise<TopAction[]> {
  if (USE_MOCK) return Promise.resolve(mock.getMockTopActions(limit));
  return db.getTopActions(limit);
}

export function getSessionDurations(): Promise<SessionDurationBucket[]> {
  if (USE_MOCK) return Promise.resolve(mock.getMockSessionDurations());
  return db.getSessionDurations();
}

export function getUserJourney(): Promise<UserJourneyStep[]> {
  if (USE_MOCK) return Promise.resolve(mock.getMockUserJourney());
  return db.getUserJourney();
}

// Cache warming (no-op in mock mode)
export async function warmCache(): Promise<void> {
  if (USE_MOCK) return;
  return db.warmCache();
}
