import { SegmentSingleInput, Text, Tile } from '@dimasbaguspm/versaur';
import React from 'react';

import { PieChart, type PieChartDatum } from '../../../../../components';

interface AccountsPieChartProps {
  chartData: PieChartDatum[];
  chartType: 'expenses' | 'income';
  onChartTypeChange: (chartType: 'expenses' | 'income') => void;
}

/**
 * Pie chart section for accounts breakdown with expenses/income toggle
 * Includes segment control in the header for chart type selection
 */
export const AccountsPieChart: React.FC<AccountsPieChartProps> = ({ chartData, chartType, onChartTypeChange }) => (
  <Tile className="space-y-4">
    <div className="flex items-start justify-between gap-12">
      <div>
        <Text as="h3" fontSize="lg" fontWeight="semibold">
          {chartType === 'expenses' ? 'Expenses' : 'Income'} Distribution
        </Text>
        <Text as="p" fontSize="sm">
          Percentage breakdown of {chartType} across accounts for the selected period
          {chartData.length > 0 && (
            <span className="text-slate-500 ml-1">
              ({chartData.length} account{chartData.length === 1 ? '' : 's'})
            </span>
          )}
        </Text>
      </div>
      <div className="flex-grow-1">
        <SegmentSingleInput
          className="flex justify-end"
          name="accounts-tab"
          size="sm"
          variant="ghost"
          value={chartType}
          onChange={(value) => onChartTypeChange(value as 'income' | 'expenses')}
        >
          <SegmentSingleInput.Option value="expenses">Expenses</SegmentSingleInput.Option>
          <SegmentSingleInput.Option value="income">Income</SegmentSingleInput.Option>
        </SegmentSingleInput>
      </div>
    </div>
    <PieChart data={chartData} showLegend={false} height={300} />
  </Tile>
);
