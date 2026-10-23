import { animate, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  format: (v: number) => string
  /** ms */
  duration?: number
  className?: string
}

/** Değer değişince yumuşakça sayarak geçer (count-up). Azaltılmış harekette anında değişir. */
export function AnimatedNumber({ value, format, duration = 300, className }: AnimatedNumberProps) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(value)
  const from = useRef(value)

  useEffect(() => {
    if (reduce || from.current === value) {
      from.current = value
      setDisplay(value)
      return
    }
    const controls = animate(from.current, value, {
      duration: duration / 1000,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => {
        from.current = v
        setDisplay(v)
      },
    })
    return () => controls.stop()
  }, [value, reduce, duration])

  return (
    <span className={className} aria-label={format(value)}>
      <span aria-hidden>{format(display)}</span>
    </span>
  )
}
