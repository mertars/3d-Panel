import { create } from 'zustand'

export type ToastTone = 'default' | 'success' | 'danger'

export interface Toast {
  id: number
  message: string
  tone: ToastTone
  action?: { label: string; onClick: () => void }
  duration: number
}

interface ToastState {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id' | 'tone' | 'duration'> & Partial<Pick<Toast, 'tone' | 'duration'>>) => number
  dismiss: (id: number) => void
}

let seq = 0

export const useToasts = create<ToastState>()((set) => ({
  toasts: [],
  push: (t) => {
    const id = ++seq
    set((s) => ({ toasts: [...s.toasts.slice(-2), { tone: 'default', duration: 4500, ...t, id }] }))
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = (message: string, opts: Partial<Omit<Toast, 'id' | 'message'>> = {}) =>
  useToasts.getState().push({ message, ...opts })
