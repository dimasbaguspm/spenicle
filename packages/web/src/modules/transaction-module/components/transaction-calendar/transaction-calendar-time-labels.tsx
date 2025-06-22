interface TransactionCalendarTimeLabelsProps {
  hours: number[];
}

export const TransactionCalendarTimeLabels = ({ hours }: TransactionCalendarTimeLabelsProps) => (
  <div className="border-r border-mist-200 bg-cream-50">
    {hours.map((hour) => (
      <div key={hour} className="h-16 p-2 border-b border-mist-200 flex items-start justify-end">
        <span className="text-xs text-slate-500 font-medium">
          {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
        </span>
      </div>
    ))}
  </div>
);
