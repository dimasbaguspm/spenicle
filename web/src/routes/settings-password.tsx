import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { queryClient } from '@/api/query'
import { changePassword } from '@/api/settings'
import { Button } from '@/components/primitives/button'
import { Field } from '@/components/primitives/field'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel } from '@/components/primitives/panel'
import { PasswordInput } from '@/components/primitives/password-input'
import { Text } from '@/components/primitives/text'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const crumbs = [{ label: 'Settings', to: '/settings' }, { label: 'Password' }] as const

/**
 * Rotating the root credential. Every token minted from the old password keeps working, because a
 * token is its own credential; only the password itself changes.
 */
export function PasswordPage() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')

  const rotate = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: async () => {
      setCurrent('')
      setNext('')
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader items={crumbs} title="Password" />

      <Panel>
        <form
          className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault()
            rotate.mutate()
          }}
        >
          <Field label="Current password" error={rotate.error?.message}>
            <PasswordInput
              name="current-password"
              autoComplete="current-password"
              value={current}
              onChange={(event) => {
                setCurrent(event.target.value)
              }}
            />
          </Field>
          <Field label="New password">
            <PasswordInput
              name="new-password"
              autoComplete="new-password"
              value={next}
              onChange={(event) => {
                setNext(event.target.value)
              }}
            />
          </Field>
          <div className="space-y-2 sm:col-span-2">
            <Button type="submit" loading={rotate.isPending} disabled={next.length < 12}>
              {rotate.isPending ? 'Saving' : 'Rotate password'}
            </Button>
            {rotate.isSuccess ? (
              <Text as="p" tone="caption" className="text-success">
                Password replaced. Every token minted from the old one keeps working; this tab still
                uses the token it already holds.
              </Text>
            ) : null}
          </div>
        </form>
      </Panel>
    </div>
  )
}
