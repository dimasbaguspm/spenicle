import type { FC } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

import { formatLineChartAmount } from '../line-chart/helpers';

interface BarChartDatum {
  [key: string]: string | number | null | undefined;
  totalIncome?: number;
  totalExpenses?: number;
  totalNet?: number;
}

interface BarChartProps {
  data: BarChartDatum[];
  xKey: string;
  /**
   * The data keys to display as bars (e.g., ['totalIncome', 'totalExpenses']).
   * Only 'totalIncome', 'totalExpenses', and 'totalNet' are allowed.
   * Defaults to ['totalIncome', 'totalExpenses'].
   */
  dataKey?: Array<'totalIncome' | 'totalExpenses' | 'totalNet'>;
  legendAlign?: 'left' | 'center' | 'right';
  xAxisTickFormatter?: (value: string) => string;
}

const BAR_META: Record<'totalIncome' | 'totalExpenses' | 'totalNet', { name: string; fill: string }> = {
  totalIncome: { name: 'Income', fill: '#81b29a' },
  totalExpenses: { name: 'Expenses', fill: '#e07a5f' },
  totalNet: { name: 'Net', fill: '#3d405b' },
};

/**
 * BarChart component for visualizing income and expenses.
 * Accessible, responsive, and styled with Tailwind for integration with design tokens.
 */
export const BarChart: FC<BarChartProps> = ({ data, xKey, dataKey, legendAlign = 'center', xAxisTickFormatter }) => {
  const keys = dataKey && dataKey.length > 0 ? dataKey : ['totalIncome', 'totalExpenses'];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RechartsBarChart data={data} margin={{ top: 24, right: 32, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="1 1" stroke="#dbeafe" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12, fill: '#3d405b', fontWeight: 400 }}
          axisLine={{ stroke: '#3d405b', strokeWidth: 0.5 }}
          tickLine={{ stroke: '#3d405b', strokeWidth: 1 }}
          tickFormatter={xAxisTickFormatter}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#3d405b', fontWeight: 400 }}
          axisLine={{ stroke: '#3d405b', strokeWidth: 0.5 }}
          tickLine={{ stroke: '#3d405b', strokeWidth: 1 }}
          tickFormatter={(value) => formatLineChartAmount(Number(value), { compact: true })}
        />
        <Tooltip
          cursor={{ fill: 'transparent' }}
          contentStyle={{
            background: 'white',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            boxShadow: '0 4px 24px 0 rgba(60, 60, 60, 0.08)',
            padding: '12px 16px',
            color: '#3d405b',
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
          formatter={(value, name, props) => {
            const key = props && typeof props.dataKey === 'string' ? props.dataKey : '';
            const meta = BAR_META[key as 'totalIncome' | 'totalExpenses' | 'totalNet'];
            return [formatLineChartAmount(Number(value), { compact: false }), meta ? meta.name : name];
          }}
          separator=": "
          wrapperStyle={{ boxShadow: 'none', border: 'none', background: 'transparent', padding: 0 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 13, color: '#3d405b', fontWeight: 500 }}
          iconType="circle"
          align={legendAlign}
          verticalAlign="bottom"
        />
        {keys.map((key) => (
          <Bar
            key={key}
            dataKey={key}
            name={BAR_META[key as 'totalIncome' | 'totalExpenses' | 'totalNet'].name}
            fill={BAR_META[key as 'totalIncome' | 'totalExpenses' | 'totalNet'].fill}
            isAnimationActive
            maxBarSize={32}
            stackId="total"
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};
