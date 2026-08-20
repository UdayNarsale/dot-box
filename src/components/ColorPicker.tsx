import { PLAYER_COLORS } from '../types/game'

interface ColorPickerProps {
  value: number
  taken: number[]
  onChange: (colorIndex: number) => void
  disabled?: boolean
  label?: string
}

export function ColorPicker({ value, taken, onChange, disabled, label }: ColorPickerProps) {
  return (
    <div>
      {label && <p className="text-xs font-medium text-slate-600 mb-1.5">{label}</p>}
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label ?? 'Color'}>
        {PLAYER_COLORS.map((color) => {
          const isTaken = taken.includes(color.id) && color.id !== value
          const selected = color.id === value
          return (
            <button
              key={color.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={color.name}
              title={isTaken ? `${color.name} is taken` : color.name}
              disabled={disabled || isTaken}
              onClick={() => onChange(color.id)}
              className={`size-8 rounded-full border-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 ${
                selected ? 'scale-110 shadow-sm' : 'opacity-90 hover:scale-105'
              } ${isTaken ? 'opacity-25 cursor-not-allowed grayscale' : 'cursor-pointer'}`}
              style={{
                background: color.stroke,
                borderColor: selected ? '#1a1f2e' : 'white',
                boxShadow: selected ? `0 0 0 2px ${color.stroke}` : undefined,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

export function firstFreeColor(taken: number[]): number {
  const used = new Set(taken)
  const free = PLAYER_COLORS.find((c) => !used.has(c.id))
  return free?.id ?? 0
}
