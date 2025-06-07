import type { FC } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

import { formatLineChartAmount } from './helpers';

interface LineChartDatum {
  [key: string]: string | number | null | undefined;
  totalIncome?: number;
  totalExpenses?: number;
  totalNet?: number;
}

interface LineChartProps {
  data: LineChartDatum[];
  xKey: string;
  /**
   * The data key(s) to display as line(s). Only 'totalIncome', 'totalExpenses', and 'totalNet' are allowed.
   * Defaults to ['totalNet'].
   */
  dataKey?: Array<'totalIncome' | 'totalExpenses' | 'totalNet'>;
}

const LINE_META: Record<'totalIncome' | 'totalExpenses' | 'totalNet', { name: string; stroke: string }> = {
  totalIncome: { name: 'Income', stroke: '#81b29a' },
  totalExpenses: { name: 'Expenses', stroke: '#e07a5f' },
  totalNet: { name: 'Net', stroke: '#3d405b' },
};

/**
 * LineChart component for visualizing time series data.
 * Accessible, responsive, and styled with Tailwind for integration with design tokens.
 */
export const LineChart: FC<Omit<LineChartProps, 'color'> & { color?: string }> = ({ data, xKey, dataKey }) => {
  const keys = dataKey && dataKey.length > 0 ? dataKey : ['totalNet'];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RechartsLineChart data={data} margin={{ top: 24, right: 32, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="1 1" stroke="#dbeafe" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12, fill: '#3d405b', fontWeight: 400 }} // Slate, lighter for clarity
          axisLine={{ stroke: '#3d405b', strokeWidth: 0.5 }}
          tickLine={{ stroke: '#3d405b', strokeWidth: 1 }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#3d405b', fontWeight: 400 }}
          axisLine={{ stroke: '#3d405b', strokeWidth: 0.5 }}
          tickLine={{ stroke: '#3d405b', strokeWidth: 1 }}
          tickFormatter={(value) => formatLineChartAmount(Number(value), { compact: true })}
          domain={[
            (dataMin: number) => {
              if (dataMin >= 0) return 0;
              // Clamp so the lower bound never exceeds -40% of the max absolute value
              const padding = Math.max(Math.abs(dataMin) * 0.4, 10);
              return dataMin - padding;
            },
            (dataMax: number) => dataMax + Math.abs(dataMax) * 0.1,
          ]}
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
          formatter={(value, name, props) => {
            const key = props && typeof props.dataKey === 'string' ? props.dataKey : '';
            const meta = LINE_META[key as 'totalIncome' | 'totalExpenses' | 'totalNet'];
            return [formatLineChartAmount(Number(value), { compact: false }), meta ? meta.name : name];
          }}
        />
        {keys.map((key) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={LINE_META[key as 'totalIncome' | 'totalExpenses' | 'totalNet'].name}
            stroke={LINE_META[key as 'totalIncome' | 'totalExpenses' | 'totalNet'].stroke}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};
