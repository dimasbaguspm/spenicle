import { cva } from 'class-variance-authority';
import React from 'react';

import { cn } from '../../../libs/utils';
import { isValidImageUrl } from '../helpers';
import type { AvatarImageProps } from '../types';

const avatarImageVariants = cva('aspect-square h-full w-full object-cover');

export const AvatarImage: React.FC<AvatarImageProps> = ({
  src,
  alt = 'Avatar',
  loading = 'lazy',
  className,
  onError,
  ...props
}) => {
  // security validation of image url
  if (!isValidImageUrl(src)) {
    return null;
  }

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>): void => {
    // hide the image if it fails to load, allowing fallback to show
    event.currentTarget.style.display = 'none';
    onError?.(event);
  };

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      className={cn(avatarImageVariants(), className)}
      onError={handleImageError}
      crossOrigin="anonymous" // security: prevent credential leakage
      referrerPolicy="no-referrer" // privacy: don't send referrer information
      {...props}
    />
  );
};
