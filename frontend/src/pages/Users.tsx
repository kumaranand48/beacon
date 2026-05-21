import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Loader2,
  X,
  Mail,
  Calendar,
  Clock,
  Activity,
  Users,
  BarChart3,
  Search,
} from 'lucide-react';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import { fetchUsersData } from '../services/api';
import type { User, UsersPageData } from '../types';

function safeFormat(dateStr: string, fmt: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return format(d, fmt);
  } catch {
    return 'N/A';
  }
}

export default function UsersPage() {
  const [data, setData] = useState<UsersPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsersData()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const columns = [
    {
      key: 'email',
      header: 'Email',
      sortValue: (row: User) => row.displayName.toLowerCase(),
      render: (row: User) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-primary-600 text-sm font-bold">
              {row.displayName.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-semibold text-text-primary">
              {row.displayName}
            </p>
            <p className="text-xs text-text-muted">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'lastActive',
      header: 'Last Active',
      sortValue: (row: User) => new Date(row.lastActive).getTime() || 0,
      render: (row: User) => (
        <span className="text-text-secondary">
          {safeFormat(row.lastActive, 'MMM dd, yyyy')}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Member Since',
      sortValue: (row: User) => new Date(row.createdAt).getTime() || 0,
      render: (row: User) => (
        <span className="text-text-secondary">
          {safeFormat(row.createdAt, 'MMM dd, yyyy')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row: User) => (row.status === 'active' ? 1 : 0),
      render: (row: User) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            row.status === 'active'
              ? 'bg-green-50 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              row.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
          {row.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: User) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedUser(row);
          }}
          className="text-primary-500 hover:text-primary-700 text-sm font-semibold hover:underline"
        >
          View Details
        </button>
      ),
    },
  ];

  const activeCount = data.users.filter((u) => u.status === 'active').length;

  function retentionColor(pct: number): string {
    if (pct < 0) return ''; // no data
    if (pct >= 50) return 'bg-primary-100 text-primary-700';
    if (pct >= 30) return 'bg-green-100 text-green-700';
    if (pct >= 15) return 'bg-yellow-50 text-yellow-700';
    if (pct >= 5) return 'bg-orange-50 text-orange-700';
    return 'bg-red-50 text-red-600';
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-text-primary">Users</h1>
        <p className="text-text-secondary text-sm mt-1">
          {data.totalCount} total registered users
        </p>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary-500" />
            <span className="text-xs text-text-muted font-medium uppercase tracking-wider">
              Active Users (30d)
            </span>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {activeCount}
          </p>
          <p className="text-xs text-text-muted mt-1">
            of {data.totalCount} total
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-primary-500" />
            <span className="text-xs text-text-muted font-medium uppercase tracking-wider">
              Platform Sessions
            </span>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {data.platformStats.totalSessions.toLocaleString()}
          </p>
          <p className="text-xs text-text-muted mt-1">last 30 days</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary-500" />
            <span className="text-xs text-text-muted font-medium uppercase tracking-wider">
              Platform Page Views
            </span>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {data.platformStats.totalPageViews.toLocaleString()}
          </p>
          <p className="text-xs text-text-muted mt-1">last 30 days</p>
        </div>
      </div>

      {/* DAU Trend */}
      <ChartCard title="Daily Active Users" subtitle="Last 30 days" className="mb-6">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.dauTrend}>
              <defs>
                <linearGradient id="dauGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5B5FC7" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#5B5FC7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => {
                  const dt = new Date(d);
                  return `${dt.getMonth() + 1}/${dt.getDate()}`;
                }}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
                formatter={(value: number) => [value, 'Active Users']}
                labelFormatter={(label: string) => {
                  const d = new Date(label);
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />
              <Area
                type="monotone"
                dataKey="activeUsers"
                stroke="#5B5FC7"
                strokeWidth={2}
                fill="url(#dauGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Cohort Retention */}
      {data.cohortRetention.length > 0 && (
        <ChartCard
          title="Cohort Retention"
          subtitle="Weekly cohorts — % of users returning each week"
          className="mb-6"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-left">
                    Cohort
                  </th>
                  <th className="pb-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">
                    Users
                  </th>
                  {['Week 0', 'Week 1', 'Week 2', 'Week 3', 'Week 4'].map((h) => (
                    <th
                      key={h}
                      className="pb-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-center"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...data.cohortRetention].reverse().map((cohort) => (
                  <tr
                    key={cohort.label}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="py-3 font-medium text-text-primary whitespace-nowrap">
                      {cohort.label}
                    </td>
                    <td className="py-3 text-right text-text-secondary font-semibold">
                      {cohort.totalUsers.toLocaleString()}
                    </td>
                    {cohort.retention.map((pct, i) => (
                      <td key={i} className="py-3 text-center">
                        {pct >= 0 ? (
                          <span
                            className={`inline-block min-w-[3.5rem] px-2 py-1 rounded-md text-xs font-bold ${retentionColor(pct)}`}
                          >
                            {pct}%
                          </span>
                        ) : (
                          <span className="text-text-muted">&mdash;</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {/* Table */}
      <ChartCard title="All Users" subtitle="Click on a user to see details" className="mb-6">
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <DataTable<User>
          columns={columns}
          data={filteredUsers}
          onRowClick={(user) => setSelectedUser(user)}
          emptyMessage={searchQuery ? 'No users match your search' : 'No data available'}
          pageSize={10}
        />
      </ChartCard>

      {/* User Detail Panel */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex justify-end"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl animate-slide-in overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-bold text-text-primary">
                  User Details
                </h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>

              {/* Avatar & Name */}
              <div className="flex flex-col items-center mb-8">
                <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                  <span className="text-primary-600 text-2xl font-bold">
                    {selectedUser.displayName.charAt(0)}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-text-primary">
                  {selectedUser.displayName}
                </h3>
                <p className="text-text-secondary text-sm">
                  {selectedUser.email}
                </p>
              </div>

              {/* Status Badge */}
              <div className="flex justify-center mb-8">
                <span
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                    selectedUser.status === 'active'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      selectedUser.status === 'active'
                        ? 'bg-green-500'
                        : 'bg-gray-400'
                    }`}
                  />
                  {selectedUser.status === 'active'
                    ? 'Active in last 30 days'
                    : 'Inactive'}
                </span>
              </div>

              {/* Detail List */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-surface-bg rounded-xl">
                  <Mail className="w-5 h-5 text-text-muted" />
                  <div>
                    <p className="text-xs text-text-muted font-medium">
                      Email
                    </p>
                    <p className="text-sm font-semibold text-text-primary">
                      {selectedUser.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-surface-bg rounded-xl">
                  <Clock className="w-5 h-5 text-text-muted" />
                  <div>
                    <p className="text-xs text-text-muted font-medium">
                      Last Active
                    </p>
                    <p className="text-sm font-semibold text-text-primary">
                      {safeFormat(selectedUser.lastActive, 'MMM dd, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-surface-bg rounded-xl">
                  <Calendar className="w-5 h-5 text-text-muted" />
                  <div>
                    <p className="text-xs text-text-muted font-medium">
                      Member Since
                    </p>
                    <p className="text-sm font-semibold text-text-primary">
                      {safeFormat(selectedUser.createdAt, 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
