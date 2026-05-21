import { useEffect, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import {
  Users,
  Monitor,
  Eye,
  Clock,
  Loader2,
  ExternalLink,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import KpiCard from '../components/KpiCard';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import { fetchDashboardData } from '../services/api';
import type { DashboardData, Session, PageView } from '../types';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins}m`;
  }
  return `${mins}m ${secs}s`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}

function ActivityTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3">
      <p className="font-bold text-text-primary text-sm mb-1.5">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2 text-sm">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-text-secondary">
            {entry.dataKey === 'sessions' ? 'Sessions' : 'Page Views'}:
          </span>
          <span className="font-bold text-text-primary">
            {entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

const DONUT_COLORS = ['#0EA5E9', '#22C55E', '#F59E0B', '#F97066'];

const RADIAN = Math.PI / 180;

function renderCustomizedLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-bold"
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

const RANK_COLORS = [
  'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm',
  'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-sm',
  'bg-gradient-to-br from-orange-300 to-orange-400 text-white shadow-sm',
  'bg-primary-100 text-primary-600',
  'bg-primary-100 text-primary-600',
];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() =>
    format(subDays(new Date(), 29), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(() =>
    format(new Date(), 'yyyy-MM-dd')
  );

  const loadData = useCallback(() => {
    setLoading(true);
    fetchDashboardData(startDate, endDate)
      .then(setData)
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const sessionColumns = [
    {
      key: 'user',
      header: 'User',
      render: (row: Session) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#D946A8] to-[#7B2FF7] flex items-center justify-center shadow-sm">
            <span className="text-white text-xs font-bold">
              {row.userName.charAt(0)}
            </span>
          </div>
          <span className="font-semibold text-text-primary">
            {row.userName}
          </span>
        </div>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (row: Session) => (
        <span className="text-text-secondary font-medium">
          {formatDuration(row.duration)}
        </span>
      ),
    },
    {
      key: 'pages',
      header: 'Pages',
      render: (row: Session) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 text-sm font-bold">
          {row.pagesViewed}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (row: Session) => (
        <span className="text-text-muted">
          {format(parseISO(row.startedAt), 'MMM dd, yyyy')}
        </span>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">
            Dashboard
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Overview of your analytics
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-gray-200 px-3 py-2">
          <Calendar className="w-4 h-4 text-text-muted" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-sm text-text-primary bg-transparent border-none outline-none cursor-pointer"
          />
          <span className="text-text-muted text-sm">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-sm text-text-primary bg-transparent border-none outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8 stagger-children">
        <KpiCard
          icon={<Users className="w-6 h-6 text-white" />}
          label="Total Users"
          value={data.kpis.totalUsers.toLocaleString()}
          change={data.kpis.totalUsersChange}
          color="purple"
          href="/users"
        />
        <KpiCard
          icon={<Monitor className="w-6 h-6 text-white" />}
          label="Active Sessions"
          value={data.kpis.activeSessions.toLocaleString()}
          change={data.kpis.activeSessionsChange}
          color="blue"
        />
        <KpiCard
          icon={<Eye className="w-6 h-6 text-white" />}
          label="Page Views"
          value={data.kpis.pageViews.toLocaleString()}
          change={data.kpis.pageViewsChange}
          color="emerald"
          href="/behavior"
        />
        <KpiCard
          icon={<Clock className="w-6 h-6 text-white" />}
          label="Avg Session Duration"
          value={formatDuration(data.kpis.avgSessionDuration)}
          change={data.kpis.avgSessionDurationChange}
          color="amber"
        />
      </div>

      {/* Engagement KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8 stagger-children">
        <KpiCard
          icon={<Users className="w-6 h-6 text-white" />}
          label="DAU (Today)"
          value={data.kpis.dau.toLocaleString()}
          change={data.kpis.dauChange}
          color="purple"
        />
        <KpiCard
          icon={<TrendingUp className="w-6 h-6 text-white" />}
          label="D7 Retention"
          value={`${data.kpis.d7Retention}%`}
          change={data.kpis.d7RetentionChange}
          color="blue"
        />
        <KpiCard
          icon={<TrendingUp className="w-6 h-6 text-white" />}
          label="D14 Retention"
          value={`${data.kpis.d14Retention}%`}
          change={data.kpis.d14RetentionChange}
          color="emerald"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 mb-8">
        {/* Area Chart - User Activity */}
        <ChartCard
          title="User Activity"
          subtitle={`Sessions and page views (${startDate} to ${endDate})`}
          className="xl:col-span-3"
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.timeSeries}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="gradSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradPageViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F3F4F6"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={{ stroke: '#F3F4F6' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ActivityTooltip />} />
                <Area
                  type="monotone"
                  dataKey="pageViews"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  fill="url(#gradPageViews)"
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: '#F59E0B',
                    stroke: 'white',
                    strokeWidth: 2,
                  }}
                  name="Page Views"
                />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  stroke="#0EA5E9"
                  strokeWidth={2.5}
                  fill="url(#gradSessions)"
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: '#0EA5E9',
                    stroke: 'white',
                    strokeWidth: 2,
                  }}
                  name="Sessions"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-sky-500" />
              <span className="text-xs text-text-secondary font-medium">
                Sessions
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs text-text-secondary font-medium">
                Page Views
              </span>
            </div>
          </div>
        </ChartCard>

        {/* Donut Chart - User Distribution */}
        <ChartCard
          title="User Distribution"
          subtitle="By activity type"
          className="xl:col-span-2"
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  {DONUT_COLORS.map((color, idx) => (
                    <linearGradient
                      key={`pie-grad-${idx}`}
                      id={`pieGrad${idx}`}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={color} stopOpacity={1} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.75} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie
                  data={data.userDistribution}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={4}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  animationBegin={200}
                  animationDuration={800}
                  stroke="none"
                >
                  {data.userDistribution.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#pieGrad${index % DONUT_COLORS.length})`}
                      style={{
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))',
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0];
                    return (
                      <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3">
                        <p className="font-bold text-text-primary text-sm">
                          {item.name}
                        </p>
                        <p className="text-text-secondary text-sm">
                          Users: <strong>{item.value}</strong>
                        </p>
                      </div>
                    );
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  iconSize={10}
                  formatter={(value, entry) => (
                    <span className="text-xs text-text-secondary font-semibold ml-1">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Recent Sessions Table */}
        <ChartCard
          title="Recent Sessions"
          subtitle="Latest user sessions"
          className="xl:col-span-3"
        >
          <DataTable<Session>
            columns={sessionColumns}
            data={data.recentSessions}
          />
        </ChartCard>

        {/* Top Pages */}
        <ChartCard
          title="Top Pages"
          subtitle="Most visited pages"
          className="xl:col-span-2"
        >
          <div className="space-y-3.5">
            {data.topPages.map((page, idx) => (
              <div
                key={page.path}
                className="flex items-center gap-3 group p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${RANK_COLORS[idx] || RANK_COLORS[3]}`}
                >
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-text-primary truncate">
                      {page.title}
                    </p>
                    <ExternalLink className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-text-muted">{page.path}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-text-primary">
                    {page.views.toLocaleString()}
                  </p>
                  <p className="text-xs text-text-muted">views</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
