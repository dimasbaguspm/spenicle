import { Link } from '@tanstack/react-router'
import { Fragment } from 'react'

type Crumb = {
  label: string
  to?: string | undefined
}

/**
 * Where a screen sits, instead of an eyebrow saying it twice. The last crumb is the page and is
 * never a link; the ones before it are the trail back.
 */
export function Breadcrumb({ items }: { items: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="text-text-faint flex flex-wrap items-center gap-2 text-[0.6875rem] tracking-[0.14em] uppercase">
        {items.map((item, index) => (
          <Fragment key={`${item.label}-${String(index)}`}>
            {index === 0 ? null : (
              <li aria-hidden="true" className="text-border-strong">
                /
              </li>
            )}
            <li>
              {item.to === undefined ? (
                <span aria-current="page" className="text-text-muted">
                  {item.label}
                </span>
              ) : (
                <Link to={item.to} className="hover:text-text transition-colors">
                  {item.label}
                </Link>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
