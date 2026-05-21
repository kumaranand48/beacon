export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  lastActive: string;
  totalSessions: number;
  totalPageViews: number;
  createdAt: string;
  status: 'active' | 'inactive';
}

export interface Session {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  duration: number; // seconds
  pagesViewed: number;
  startedAt: string;
  endedAt: string;
}

export interface AnalyticsEvent {
  id: string;
  name: string;
  userId: string;
  userEmail: string;
  timestamp: string;
  properties: Record<string, string | number | boolean>;
}

export interface PageView {
  path: string;
  title: string;
  views: number;
  uniqueVisitors: number;
}

export interface KpiData {
  totalUsers: number;
  totalUsersChange: number;
  activeSessions: number;
  activeSessionsChange: number;
  pageViews: number;
  pageViewsChange: number;
  avgSessionDuration: number; // seconds
  avgSessionDurationChange: number;
  dau: number;
  dauChange: number;
  d7Retention: number;
  d7RetentionChange: number;
  d14Retention: number;
  d14RetentionChange: number;
}

export interface TimeSeriesPoint {
  date: string;
  sessions: number;
  pageViews: number;
}

export interface UserDistribution {
  name: string;
  value: number;
  color: string;
}

export interface EventTimeSeriesPoint {
  date: string;
  events: number;
}

export interface UserAction {
  action: string;
  count: number;
}

export interface SessionDurationBucket {
  range: string;
  count: number;
}

export interface DashboardData {
  kpis: KpiData;
  timeSeries: TimeSeriesPoint[];
  userDistribution: UserDistribution[];
  recentSessions: Session[];
  topPages: PageView[];
}

export interface UsersPageData {
  users: User[];
  totalCount: number;
  platformStats: {
    totalSessions: number;
    totalPageViews: number;
  };
  dauTrend: { date: string; activeUsers: number }[];
  cohortRetention: {
    label: string;
    totalUsers: number;
    retention: number[];
  }[];
}

export interface EventsPageData {
  timeSeries: EventTimeSeriesPoint[];
  recentEvents: AnalyticsEvent[];
}

export interface BehaviorPageData {
  topActions: UserAction[];
  sessionDurations: SessionDurationBucket[];
  userJourney: { step: string; users: number }[];
}
