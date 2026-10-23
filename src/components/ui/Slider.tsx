import * as RSlider from '@radix-ui/react-slider'
import { cn } from '@/lib/cn'

interface SliderProps {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  'aria-label': string
  className?: string
}

export function Slider({ value, onChange, min, max, step, className, ...aria }: SliderProps) {
  return (
    <RSlider.Root
      value={[Math.min(max, Math.max(min, value))]}
      onValueChange={([v]) => onChange(v)}
      min={min}
      max={max}
      step={step}
      className={cn('relative flex h-11 w-full touch-none items-center select-none', className)}
    >
      <RSlider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-surface-strong">
        <RSlider.Range className="brand-gradient absolute h-full" />
      </RSlider.Track>
      <RSlider.Thumb
        aria-label={aria['aria-label']}
        className="block size-5 rounded-full border-2 border-white bg-brand-2 shadow-[0_2px_10px_rgba(255,61,119,0.5)] focus-visible:ring-4 focus-visible:ring-brand-2/25"
      />
    </RSlider.Root>
  )
}
