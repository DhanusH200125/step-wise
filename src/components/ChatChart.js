'use client';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ef4444', '#8b5cf6', '#06b6d4'];

// Standardizes varied input data formats into a common array of objects for Recharts
function normaliseData(data, xKey, yKey, nameKey, valueKey) {
  if (Array.isArray(data)) return data;

  // Handles Chart.js style labels/datasets object
  if (data?.labels && data?.datasets?.[0]?.data) {
    return data.labels.map((label, i) => ({
      [xKey || nameKey || 'name']: label,
      [yKey || valueKey || 'value']: data.datasets[0].data[i] ?? 0,
    }));
  }

  // Handles raw key-value objects
  if (data && typeof data === 'object') {
    return Object.entries(data).map(([key, val]) => ({
      [xKey || nameKey || 'name']: key,
      [yKey || valueKey || 'value']: typeof val === 'number' ? val : Number(val) || 0,
    }));
  }

  return [];
}

export default function ChatChart({ chart }) {
  const { type, title, data, xKey, yKey, nameKey, valueKey } = chart;

  const safeData = normaliseData(data, xKey, yKey, nameKey, valueKey);

  if (safeData.length === 0) return null;

  const chartHeight = type === 'pie' ? 300 : 240;

  return (
    <div className="mt-3 mb-1 bg-slate-50 border border-slate-200 rounded-xl p-4 w-full">
      {title && (
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
          {title}
        </p>
      )}
      <div style={{ width: '100%', minWidth: 0, height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          {type === 'bar' ? (
            <BarChart data={safeData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey={xKey || 'name'} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
              <Bar dataKey={yKey || 'value'} radius={[4, 4, 0, 0]}>
                {safeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          ) : type === 'line' ? (
            <LineChart data={safeData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey={xKey || 'name'} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              <Line type="monotone" dataKey={yKey || 'value'} stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          ) : type === 'pie' ? (
            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Pie
                data={safeData}
                cx="50%"
                cy="44%"
                innerRadius={55}
                outerRadius={85}
                dataKey={valueKey || 'value'}
                nameKey={nameKey || 'name'}
                paddingAngle={3}
                strokeWidth={0}
              >
                {safeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              <Legend
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(value) => <span style={{ color: '#64748b' }}>{value}</span>}
              />
            </PieChart>
          ) : null}
        </ResponsiveContainer>
      </div>
    </div>
  );
}