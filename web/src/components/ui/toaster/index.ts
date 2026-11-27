import { createToaster } from '@ark-ui/react/toast'

/**
 * One module-level store so any screen can fire a toast without rendering anything; a
 * store created inside the component would be thrown away on every remount, and the
 * queue is the one piece of state that must outlive the mount.
 */
export const toast = createToaster({ placement: 'bottom-end', overlap: true, gap: 12 })
