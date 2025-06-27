import React from 'react';

export interface BreadcrumbContextValue {
  separator?: React.ReactNode;
  variant?: 'mist' | 'slate' | 'sage';
}

export interface BreadcrumbProps extends BreadcrumbContextValue {
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}

export interface BreadcrumbItemProps {
  children: React.ReactNode;
  className?: string;
  isCurrentPage?: boolean;
  href?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
}

export interface BreadcrumbLinkProps {
  children: React.ReactNode;
  href?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  className?: string;
  variant?: 'mist' | 'slate' | 'sage';
}

export interface BreadcrumbPageProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'mist' | 'slate' | 'sage';
}

export interface BreadcrumbSeparatorProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'mist' | 'slate' | 'sage';
}
