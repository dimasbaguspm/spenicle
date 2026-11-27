import { DatePicker as ArkDatePicker, parseDate, type DateValue } from '@ark-ui/react/date-picker'
import { useMemo } from 'react'
import { control } from '@/components/ui/control'

type DatePickerProps = {
  value: string
  onValueChange: (isoDay: string) => void
  placeholder?: string | undefined
}

/** The wire speaks `YYYY-MM-DD`; Ark speaks `DateValue`. These two helpers are the only crossing. */
function toDay(date: DateValue): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
}

function toDateValue(day: string): DateValue | undefined {
  return day === '' ? undefined : parseDate(day)
}

/** Ark owns the calendar grid, the keyboard model and the input parsing; the plate is ours. */
export function DatePicker({ value, onValueChange, placeholder }: DatePickerProps) {
  const selected = useMemo(() => {
    const day = toDateValue(value)

    return day === undefined ? [] : [day]
  }, [value])

  return (
    <ArkDatePicker.Root
      value={selected}
      onValueChange={(details) => {
        const next = details.value[0]
        onValueChange(next === undefined ? '' : toDay(next))
      }}
      className="space-y-1"
    >
      <ArkDatePicker.Control className="flex items-center gap-2">
        <ArkDatePicker.Input placeholder={placeholder} className={control()} />
        <ArkDatePicker.Trigger className="border-border text-brass-500 hover:border-border-strong rounded border px-2 py-2 text-xs transition-colors">
          ▾
        </ArkDatePicker.Trigger>
      </ArkDatePicker.Control>
      <ArkDatePicker.Positioner>
        <ArkDatePicker.Content className="border-border-strong bg-surface-raised z-20 mt-1 rounded border p-2 text-sm shadow-xl">
          <ArkDatePicker.View view="day">
            <ArkDatePicker.Context>
              {(datePicker) => (
                <>
                  <ArkDatePicker.ViewControl className="mb-2 flex items-center justify-between">
                    <ArkDatePicker.PrevTrigger className="text-text-muted hover:text-accent rounded px-2 py-1 text-xs transition-colors">
                      ‹
                    </ArkDatePicker.PrevTrigger>
                    <ArkDatePicker.ViewTrigger className="text-text text-xs">
                      <ArkDatePicker.RangeText />
                    </ArkDatePicker.ViewTrigger>
                    <ArkDatePicker.NextTrigger className="text-text-muted hover:text-accent rounded px-2 py-1 text-xs transition-colors">
                      ›
                    </ArkDatePicker.NextTrigger>
                  </ArkDatePicker.ViewControl>
                  <ArkDatePicker.Table className="border-collapse text-center text-xs">
                    <ArkDatePicker.TableHead>
                      <ArkDatePicker.TableRow>
                        {datePicker.weekDays.map((weekDay) => (
                          <ArkDatePicker.TableHeader
                            key={weekDay.value.toString()}
                            className="text-ink-400 pb-1 font-normal"
                          >
                            {weekDay.narrow}
                          </ArkDatePicker.TableHeader>
                        ))}
                      </ArkDatePicker.TableRow>
                    </ArkDatePicker.TableHead>
                    <ArkDatePicker.TableBody>
                      {datePicker.weeks.map((week) => (
                        <ArkDatePicker.TableRow key={week[0]?.toString() ?? ''}>
                          {week.map((day) => (
                            <ArkDatePicker.TableCell key={day.toString()} value={day}>
                              <ArkDatePicker.TableCellTrigger className="text-porcelain-200 data-outside-range:text-ink-600 data-selected:bg-primary hover:bg-brass-800/40 data-today:text-accent block size-7 rounded transition-colors data-selected:text-porcelain-50">
                                {day.day}
                              </ArkDatePicker.TableCellTrigger>
                            </ArkDatePicker.TableCell>
                          ))}
                        </ArkDatePicker.TableRow>
                      ))}
                    </ArkDatePicker.TableBody>
                  </ArkDatePicker.Table>
                </>
              )}
            </ArkDatePicker.Context>
          </ArkDatePicker.View>
        </ArkDatePicker.Content>
      </ArkDatePicker.Positioner>
    </ArkDatePicker.Root>
  )
}
