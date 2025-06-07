import type { FC } from 'react';
import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { formatLineChartAmount } from '../line-chart/helpers';

interface RadarChartDatum {
  category: string;
  totalIncome: number;
  totalExpenses: number;
  totalNet: number;
  totalTransactions: number;
}

interface RadarChartProps {
  data: RadarChartDatum[];
  /**
   * The data keys to display (e.g., ['totalIncome', 'totalExpenses']).
   * If not provided, all will be shown.
   */
  dataKey?: Array<keyof RadarChartDatum>;
  legendAlign?: 'left' | 'center' | 'right';
}

const RADAR_KEYS: Array<keyof RadarChartDatum> = ['totalIncome', 'totalExpenses', 'totalNet', 'totalTransactions'];

const RADAR_META: Record<keyof RadarChartDatum, { name: string; stroke: string; fill: string; fillOpacity: number }> = {
  totalIncome: { name: 'Income', stroke: '#81b29a', fill: '#81b29a', fillOpacity: 0.4 },
  totalExpenses: { name: 'Expenses', stroke: '#e07a5f', fill: '#e07a5f', fillOpacity: 0.3 },
  totalNet: { name: 'Net', stroke: '#3d405b', fill: '#3d405b', fillOpacity: 0.2 },
  totalTransactions: { name: 'Transactions', stroke: '#6b8fad', fill: '#6b8fad', fillOpacity: 0.2 },
  category: { name: '', stroke: '', fill: '', fillOpacity: 0 }, // not used for Radar
};

/**
 * RadarChart component for visualizing category breakdowns.
 * Accessible, responsive, and styled with Tailwind for integration with design tokens.
 */
export const RadarChart: FC<RadarChartProps> = ({ data, dataKey, legendAlign = 'center' }) => {
  const keys = dataKey && dataKey.length > 0 ? dataKey : RADAR_KEYS;
  return (
    <ResponsiveContainer width="100%" height={340}>
      <RechartsRadarChart data={data} margin={{ top: 24, right: 32, left: 8, bottom: 8 }}>
        <PolarGrid stroke="#dbeafe" strokeDasharray="1 1" />
        <PolarAngleAxis dataKey="category" tick={{ fontSize: 13, fill: '#3d405b', fontWeight: 500 }} />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={{ fontSize: 12, fill: '#3d405b', fontWeight: 400 }}
          axisLine={false}
          tickLine={false}
          tickCount={6}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip
          cursor={{ fill: 'transparent' }}
          contentStyle={{
            background: 'white', // Cream (light background)
            border: '1px solid #cbd5e1', // Mist-200 border
            borderRadius: 8,
            boxShadow: '0 4px 24px 0 rgba(60, 60, 60, 0.08)',
            padding: '12px 16px',
            color: '#3d405b', // Slate text
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.5,
            zIndex: 50,
          }}
          labelStyle={{ color: '#3d405b', fontWeight: 600, fontSize: 13, marginBottom: 4 }}
          itemStyle={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            fontWeight: 500,
            color: '#3d405b',
          }}
          separator=": "
          wrapperStyle={{ boxShadow: 'none', border: 'none', background: 'transparent', padding: 0 }}
          formatter={(value, name) => [formatLineChartAmount(Number(value), { compact: false }), name]}
        />
        <Legend
          wrapperStyle={{ fontSize: 13, color: '#3d405b', fontWeight: 500 }}
          iconType="circle"
          align={legendAlign}
          verticalAlign="bottom"
        />
        {keys.map((key) => (
          <Radar
            key={key}
            name={RADAR_META[key].name}
            dataKey={key}
            stroke={RADAR_META[key].stroke}
            fill={RADAR_META[key].fill}
            fillOpacity={RADAR_META[key].fillOpacity}
          />
        ))}
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
};
