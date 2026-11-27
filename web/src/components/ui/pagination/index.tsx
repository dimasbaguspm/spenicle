import { Pagination as ArkPagination } from '@ark-ui/react/pagination'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Text } from '@/components/ui/text'

type PaginationProps = {
  page: number
  count: number
  pageSize: number
  onPageChange: (page: number) => void
}

const trigger =
  'border-border text-text-muted hover:text-accent rounded border px-2 py-1 text-xs transition-colors disabled:opacity-40'
const item =
  'border-border text-text size-7 rounded border text-xs transition-colors data-[selected]:border-accent data-[selected]:bg-primary-soft'

/** Ark owns the page-range math and the aria; the count and the page number come from the caller. */
export function Pagination({ page, count, pageSize, onPageChange }: PaginationProps) {
  return (
    <ArkPagination.Root
      page={page}
      count={count}
      pageSize={pageSize}
      onPageChange={(details) => {
        onPageChange(details.page)
      }}
      className="flex items-center gap-1"
    >
      <ArkPagination.PrevTrigger className={trigger}>
        <ChevronLeft className="size-4" aria-hidden="true" strokeWidth={1.75} />
      </ArkPagination.PrevTrigger>
      <ArkPagination.Context>
        {(pagination) =>
          pagination.pages.map((entry, index) => {
            if (entry.type === 'page') {
              return (
                <ArkPagination.Item
                  key={entry.value}
                  type="page"
                  value={entry.value}
                  className={item}
                >
                  <Text as="span" tone="body">
                    {entry.value}
                  </Text>
                </ArkPagination.Item>
              )
            }

            return (
              <ArkPagination.Ellipsis
                key={`gap-${gapKey(pagination.pages[index - 1])}`}
                index={index}
                className="text-ink-400 px-1"
              >
                <Text as="span" tone="caption">
                  …
                </Text>
              </ArkPagination.Ellipsis>
            )
          })
        }
      </ArkPagination.Context>
      <ArkPagination.NextTrigger className={trigger}>
        <ChevronRight className="size-4" aria-hidden="true" strokeWidth={1.75} />
      </ArkPagination.NextTrigger>
    </ArkPagination.Root>
  )
}

function gapKey(previous: { type: 'ellipsis' } | { type: 'page'; value: number } | undefined) {
  return previous?.type === 'page' ? String(previous.value) : 'start'
}
