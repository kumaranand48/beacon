import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  Cell,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import ChartCard from '../components/ChartCard';
import { fetchBehaviorData } from '../services/api';
import type { BehaviorPageData } from '../types';

const FUNNEL_COLORS = [
  '#5B5FC7',
  '#6B6ECB',
  '#8082D2',
  '#AAABE1',
  '#D4D5F0',
];

export default function BehaviorPage() {
  const [data, setData] = useState<BehaviorPageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBehaviorData()
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

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-text-primary">
          Behavior
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Understand how users interact with your site
        </p>
      </div>

      {/* User Journey Funnel */}
      <ChartCard
        title="User Journey"
        subtitle="Funnel visualization of typical user flow"
        className="mb-8"
      >
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="custom-tooltip">
                      <p className="label">{item.step}</p>
                      <p className="value">
                        Users: <strong>{item.users}</strong>
                      </p>
                    </div>
                  );
                }}
              />
              <Funnel
                dataKey="users"
                data={data.userJourney}
                isAnimationActive
                animationDuration={800}
              >
                {data.userJourney.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]}
                  />
                ))}
                <LabelList
                  position="center"
                  content={({ x, y, width, height, value, index }) => {
                    const step = data.userJourney[index as number]?.step || '';
                    return (
                      <text
                        x={(x as number) + (width as number) / 2}
                        y={(y as number) + (height as number) / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="white"
                        className="text-sm font-bold"
                      >
                        {step}: {value}
                      </text>
                    );
                  }}
                />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Top User Actions */}
        <ChartCard
          title="Top User Actions"
          subtitle="Most performed actions by users"
        >
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.topActions}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F3F4F6"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={{ stroke: '#F3F4F6' }}
                />
                <YAxis
                  type="category"
                  dataKey="action"
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={false}
                  width={120}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0];
                    return (
                      <div className="custom-tooltip">
                        <p className="label">{item.payload.action}</p>
                        <p className="value">
                          Count: <strong>{item.value?.toLocaleString()}</strong>
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#5B5FC7"
                  radius={[0, 6, 6, 0]}
                  animationDuration={800}
                  barSize={24}
                >
                  {data.topActions.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        index < 3
                          ? '#5B5FC7'
                          : index < 5
                          ? '#8082D2'
                          : '#AAABE1'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Session Duration Distribution */}
        <ChartCard
          title="Session Duration Distribution"
          subtitle="How long users stay per session"
        >
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.sessionDurations}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F3F4F6"
                  vertical={false}
                />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={{ stroke: '#F3F4F6' }}
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
                          Sessions:{' '}
                          <strong>
                            {payload[0].value?.toLocaleString()}
                          </strong>
                        </p>
                      </div>
                    );
                  }}
                />
                <defs>
                  <linearGradient
                    id="barGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#5B5FC7" />
                    <stop offset="100%" stopColor="#8082D2" />
                  </linearGradient>
                </defs>
                <Bar
                  dataKey="count"
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                  animationDuration={800}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
