import { fileSlug } from './format'

/** Blob'u dosya olarak indirir (ad ASCII'ye sadeleşir — bazı tarayıcılar Türkçe adı yok sayar) */
export function downloadBlob(blob: Blob, name: string, ext: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileSlug(name) || 'katman'}.${ext}`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export const isoDay = (d = new Date()) => d.toISOString().slice(0, 10)
