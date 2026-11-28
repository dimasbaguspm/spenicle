/**
 * Saving a file the API only hands over with a header on it. An `<a download>` would arrive
 * without the credential, so the bytes come back as a blob and the browser is handed a local URL.
 */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
