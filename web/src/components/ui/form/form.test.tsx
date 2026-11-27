import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { DebounceForm } from '@/components/ui/form/debounce-form'
import { Form } from '@/components/ui/form/form'
import { TextField } from '@/components/ui/form/text-field'
import { useFormProvider } from '@/components/ui/form/use-form-provider'

type Values = { name: string }

const defaults: Values = { name: '' }

function typed(value: string) {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value } })
}

function Orphan() {
  useFormProvider<Values>()

  return null
}

describe('components/ui/form', () => {
  it('submits the parsed values and hands the form to the callback', async () => {
    const submitted: Values[] = []
    const seen: string[] = []

    render(
      <Form<Values>
        defaultValues={defaults}
        onSubmit={(values) => {
          submitted.push(values)
        }}
      >
        {(form) => {
          seen.push(form.formState.isSubmitting ? 'busy' : 'idle')

          return <TextField<Values> name="name" label="Name" />
        }}
      </Form>,
    )

    typed('Ada')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(submitted).toEqual([{ name: 'Ada' }])
    })
    expect(seen).toContain('idle')
  })

  it('renders a cancel button only when onCancel is given', () => {
    const { rerender } = render(
      <Form<Values> defaultValues={defaults} onSubmit={() => {}}>
        {() => <TextField<Values> name="name" label="Name" />}
      </Form>,
    )

    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()

    rerender(
      <Form<Values> defaultValues={defaults} onSubmit={() => {}} onCancel={() => {}}>
        {() => <TextField<Values> name="name" label="Name" />}
      </Form>,
    )

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('debounces the watched values, once, with the latest edit', async () => {
    const batches: Values[] = []

    render(
      <DebounceForm<Values>
        defaultValues={defaults}
        options={{ delay: 5 }}
        onDebounce={(values) => {
          batches.push(values)
        }}
      >
        {() => <TextField<Values> name="name" label="Name" />}
      </DebounceForm>,
    )

    typed('A')
    typed('Ad')
    typed('Ada')

    await waitFor(() => {
      expect(batches).toEqual([{ name: 'Ada' }])
    })
  })

  it('refuses to serve a field that has no form above it', () => {
    expect(() => render(<Orphan />)).toThrow(/useFormProvider/)
  })
})
