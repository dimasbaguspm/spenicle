import { Star, ChevronRight } from 'lucide-react';

import { IconButton, Tile } from '../../../../components';

export interface TrackingStreakCardProps {
  /**
   * Number of consecutive days the user has been tracking
   */
  streakDays: number;
  /**
   * Current progress percentage towards the next milestone (0-100)
   */
  progressPercentage: number;
  /**
   * Number of days remaining to reach the next milestone
   */
  daysToMilestone: number;
  /**
   * Click handler for the card navigation
   */
  onClick: () => void;
  /**
   * Additional CSS classes for the tile container
   */
  className?: string;
}

/**
 * TrackingStreakCard displays the user's tracking progress and streak information.
 * Shows current streak, progress bar, and milestone countdown with callback for navigation.
 */
export function TrackingStreakCard({
  streakDays,
  progressPercentage,
  daysToMilestone,
  onClick,
  className,
}: TrackingStreakCardProps) {
  return (
    <Tile className={`p-4 ${className ?? ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-mist-100 rounded-lg">
            <Star className="h-4 w-4 text-mist-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Tracking Streak</p>
            <p className="text-xs text-slate-500">{streakDays} days strong</p>
          </div>
        </div>
        <IconButton
          variant="ghost"
          size="sm"
          onClick={onClick}
          className="text-mist-600 hover:text-mist-700"
          aria-label="View tracking details"
        >
          <ChevronRight className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="w-full bg-mist-100 rounded-full h-2 mb-2">
        <div
          className="bg-mist-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
        ></div>
      </div>

      <div className="flex justify-between text-xs">
        <span className="text-mist-600 font-medium">{daysToMilestone} days to milestone</span>
        <span className="text-slate-500">{progressPercentage}% complete</span>
      </div>
    </Tile>
  );
}
