import { format, subDays } from 'date-fns';
import { auth, DEV_MODE } from '../firebase';
import type {
  DashboardData,
  UsersPageData,
  EventsPageData,
  BehaviorPageData,
  TimeSeriesPoint,
  EventTimeSeriesPoint,
  UserDistribution,
  Session,
  PageView,
  User,
  AnalyticsEvent,
  UserAction,
  SessionDurationBucket,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ---------------------------------------------------------------------------
// Generic fetch helper — attaches Firebase ID token
// ---------------------------------------------------------------------------
async function apiFetch<T>(endpoint: string): Promise<T> {
  try {
    const headers: Record<string, string> = {};

    // In dev mode, use dev-token; otherwise attach Firebase ID token
    if (DEV_MODE) {
      headers['Authorization'] = 'Bearer dev-token';
    } else {
      const user = auth?.currentUser;
      if (user) {
        const token = await user.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${API_BASE}${endpoint}`, { headers });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  } catch (err) {
    // Fall back to mock data when backend is unavailable
    console.warn(`API unavailable for ${endpoint}, using mock data:`, (err as Error).message);
    return getMockData(endpoint) as T;
  }
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------
export async function fetchDashboardData(
  startDate?: string,
  endDate?: string
): Promise<DashboardData> {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const qs = params.toString();
  return apiFetch<DashboardData>(`/dashboard${qs ? `?${qs}` : ''}`);
}

export async function fetchUsersData(): Promise<UsersPageData> {
  return apiFetch<UsersPageData>('/users');
}

export async function fetchEventsData(): Promise<EventsPageData> {
  return apiFetch<EventsPageData>('/events');
}

export async function fetchBehaviorData(): Promise<BehaviorPageData> {
  return apiFetch<BehaviorPageData>('/behavior');
}

// ---------------------------------------------------------------------------
// Mock data generators (fallback when API unavailable)
// ---------------------------------------------------------------------------
function generateTimeSeries(days: number): TimeSeriesPoint[] {
  const data: TimeSeriesPoint[] = [];
  for (let i = days; i >= 0; i--) {
    const date = format(subDays(new Date(), i), 'MMM dd');
    data.push({
      date,
      sessions: Math.floor(Math.random() * 80) + 30,
      pageViews: Math.floor(Math.random() * 250) + 80,
    });
  }
  return data;
}

function generateEventTimeSeries(days: number): EventTimeSeriesPoint[] {
  const data: EventTimeSeriesPoint[] = [];
  for (let i = days; i >= 0; i--) {
    data.push({
      date: format(subDays(new Date(), i), 'MMM dd'),
      events: Math.floor(Math.random() * 150) + 40,
    });
  }
  return data;
}

const mockUserDistribution: UserDistribution[] = [
  { name: 'Active', value: 42, color: '#0EA5E9' },
  { name: 'Returning', value: 28, color: '#22C55E' },
  { name: 'New', value: 18, color: '#F59E0B' },
  { name: 'Inactive', value: 12, color: '#F97066' },
];

const mockRecentSessions: Session[] = [
  { id: 's1', userId: 'u1', userEmail: 'alice@example.com', userName: 'Alice', duration: 1842, pagesViewed: 14, startedAt: subDays(new Date(), 0).toISOString(), endedAt: subDays(new Date(), 0).toISOString() },
  { id: 's2', userId: 'u2', userEmail: 'bob@example.com', userName: 'Bob', duration: 967, pagesViewed: 8, startedAt: subDays(new Date(), 0).toISOString(), endedAt: subDays(new Date(), 0).toISOString() },
];

const mockTopPages: PageView[] = [
  { path: '/editor', title: 'Editor', views: 1247, uniqueVisitors: 89 },
  { path: '/dashboard', title: 'Dashboard', views: 983, uniqueVisitors: 76 },
  { path: '/models', title: 'Model Library', views: 756, uniqueVisitors: 64 },
];

const mockUsers: User[] = [
  { id: 'u1', email: 'alice@example.com', displayName: 'Alice', lastActive: new Date().toISOString(), totalSessions: 142, totalPageViews: 1847, createdAt: '2024-09-15T10:00:00Z', status: 'active' },
];

const mockTopActions: UserAction[] = [
  { action: 'Model Opened', count: 342 },
  { action: 'Scene Saved', count: 287 },
];

const mockSessionDurations: SessionDurationBucket[] = [
  { range: '0-1 min', count: 45 },
  { range: '1-5 min', count: 123 },
  { range: '5-15 min', count: 187 },
];

const mockUserJourney = [
  { step: 'Login', users: 100 },
  { step: 'Dashboard', users: 94 },
  { step: 'Editor', users: 58 },
];

function getMockData(endpoint: string): unknown {
  if (endpoint.startsWith('/dashboard')) {
    return {
      kpis: { totalUsers: 4, totalUsersChange: 0, activeSessions: 127, activeSessionsChange: 12.5, pageViews: 4682, pageViewsChange: 8.3, avgSessionDuration: 1124, avgSessionDurationChange: -2.1, dau: 45, dauChange: 5.0, d7Retention: 32.5, d7RetentionChange: -3.2, d14Retention: 18.2, d14RetentionChange: 1.5 },
      timeSeries: generateTimeSeries(30),
      userDistribution: mockUserDistribution,
      recentSessions: mockRecentSessions,
      topPages: mockTopPages,
    } satisfies DashboardData;
  }
  if (endpoint.startsWith('/users')) {
    return {
      users: mockUsers,
      totalCount: mockUsers.length,
      platformStats: { totalSessions: 3991, totalPageViews: 15374 },
      dauTrend: Array.from({ length: 30 }, (_, i) => ({
        date: subDays(new Date(), 29 - i).toISOString().slice(0, 10),
        activeUsers: Math.floor(Math.random() * 50) + 20,
      })),
      cohortRetention: [],
    } satisfies UsersPageData;
  }
  if (endpoint.startsWith('/events')) {
    return { timeSeries: generateEventTimeSeries(30), recentEvents: [] } satisfies EventsPageData;
  }
  if (endpoint.startsWith('/behavior')) {
    return { topActions: mockTopActions, sessionDurations: mockSessionDurations, userJourney: mockUserJourney } satisfies BehaviorPageData;
  }
  return {};
}
