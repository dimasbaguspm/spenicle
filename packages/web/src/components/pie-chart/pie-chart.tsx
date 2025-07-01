import { type FC, useState } from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, Sector } from 'recharts';

import { formatLineChartAmount } from '../line-chart/helpers';

export interface PieChartDatum {
  name: string;
  value: number;
  percentage: number;
  fill: string;
}

interface PieChartProps {
  data: PieChartDatum[];
}

// color palette for pie chart segments following our design system
const PIE_COLORS = [
  '#e07a5f', // coral - primary
  '#81b29a', // sage - secondary
  '#6b8fad', // mist info blue
  '#e08a47', // coral harmonized amber
  '#6db285', // sage based green
  '#94a3b8', // slate 400
  '#e06650', // coral family red
  '#f1f5f9', // slate 50
  '#cbd5e1', // slate 300
  '#64748b', // slate 500
];

// custom active shape for interactive pie chart segments
const renderActiveShape = (props: unknown) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props as {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    startAngle: number;
    endAngle: number;
    fill: string;
    payload: PieChartDatum;
  };
  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill="#3d405b" fontSize="14" fontWeight="600">
        {payload.name}
      </text>
      <text x={cx} y={cy} dy={24} textAnchor="middle" fill="#64748b" fontSize="12">
        {formatLineChartAmount(payload.value, { compact: false })}
      </text>
      <text x={cx} y={cy} dy={38} textAnchor="middle" fill="#64748b" fontSize="12">
        ({payload.percentage.toFixed(1)}%)
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        textAnchor={textAnchor}
        fill="#3d405b"
        fontSize="12"
        fontWeight="500"
      >
        {formatLineChartAmount(payload.value, { compact: true })} ({payload.percentage.toFixed(1)}%)
      </text>
    </g>
  );
};

/**
 * PieChart component for visualizing account distribution with percentages.
 * Uses custom active shapes for enhanced interactivity and center space for totals.
 * Accessible, responsive, and styled with design tokens for financial data.
 */
export const PieChart: FC<PieChartProps> = ({ data }) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RechartsPieChart margin={{ top: 24, right: 80, left: 80, bottom: 24 }}>
        <Pie
          activeIndex={activeIndex}
          activeShape={renderActiveShape}
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={80}
          outerRadius={120}
          paddingAngle={1}
          dataKey="value"
          onMouseEnter={onPieEnter}
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill ?? PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          cursor={false}
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
          separator=": "
          wrapperStyle={{ boxShadow: 'none', border: 'none', background: 'transparent', padding: 0 }}
          formatter={(value, name, props) => {
            const percentage = props.payload?.percentage ?? 0;
            return [`${formatLineChartAmount(Number(value), { compact: false })} (${percentage.toFixed(1)}%)`, name];
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 13, color: '#3d405b', fontWeight: 500 }}
          iconType="circle"
          align="center"
          verticalAlign="bottom"
          formatter={(value, entry) => {
            const pieData = entry.payload as unknown as PieChartDatum;
            const percentage = pieData?.percentage ?? 0;
            return `${value} (${percentage.toFixed(1)}%)`;
          }}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};
