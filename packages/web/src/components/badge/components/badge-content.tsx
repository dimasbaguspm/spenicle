import React from 'react';

import { cn } from '../../../libs/utils';
import { sanitizeBadgeContent, truncateText } from '../helpers';
import type { BadgeContentProps } from '../types';

export const BadgeContent: React.FC<BadgeContentProps> = ({
  children,
  truncate = false,
  maxLength = 20,
  className,
  ...props
}) => {
  // sanitize and optionally truncate content
  const sanitizedContent = sanitizeBadgeContent(children);
  const displayContent = truncate ? truncateText(sanitizedContent, maxLength) : sanitizedContent;

  return (
    <span
      className={cn('select-none', className)}
      title={truncate && sanitizedContent.length > maxLength ? sanitizedContent : undefined}
      {...props}
    >
      {displayContent}
    </span>
  );
};
