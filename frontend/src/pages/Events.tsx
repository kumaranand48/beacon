import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import { fetchEventsData } from '../services/api';
import type { EventsPageData, AnalyticsEvent } from '../types';

export default function EventsPage() {
  const [data, setData] = useState<EventsPageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEventsData()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const eventColumns = [
    {
      key: 'name',
      header: 'Event Name',
      render: (row: AnalyticsEvent) => (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary-400" />
          <span className="font-semibold text-text-primary">
            {row.name
              .split('_')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ')}
          </span>
        </div>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (row: AnalyticsEvent) => (
        <span className="text-text-secondary">{row.userEmail}</span>
      ),
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (row: AnalyticsEvent) => (
        <span className="text-text-muted">
          {format(parseISO(row.timestamp), 'MMM dd, yyyy h:mm a')}
        </span>
      ),
    },
    {
      key: 'properties',
      header: 'Properties',
      render: (row: AnalyticsEvent) => (
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(row.properties)
            .slice(0, 2)
            .map(([key, val]) => (
              <span
                key={key}
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary-50 text-primary-600 text-xs font-medium"
              >
                {key}: {String(val)}
              </span>
            ))}
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-text-primary">Events</h1>
        <p className="text-text-secondary text-sm mt-1">
          Track and monitor application events
        </p>
      </div>

      {/* Events Over Time Chart */}
      <ChartCard
        title="Events Over Time"
        subtitle="Total events per day over the last 30 days"
        className="mb-8"
      >
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data.timeSeries}
              margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
            >
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
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="custom-tooltip">
                      <p className="label">{label}</p>
                      <p className="value">
                        Events:{' '}
                        <strong>
                          {payload[0].value?.toLocaleString()}
                        </strong>
                      </p>
                    </div>
                  );
                }}
              />
              <defs>
                <linearGradient id="eventGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5B5FC7" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#5B5FC7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Line
                type="monotone"
                dataKey="events"
                stroke="#5B5FC7"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: '#5B5FC7',
                  stroke: 'white',
                  strokeWidth: 2,
                }}
                fill="url(#eventGradient)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Recent Events Table */}
      <ChartCard title="Recent Events" subtitle="Latest recorded events">
        <DataTable<AnalyticsEvent>
          columns={eventColumns}
          data={data.recentEvents}
        />
      </ChartCard>
    </div>
  );
}
