import { Search, X } from 'lucide-react'
import { cn } from '../../lib/utils'

export function SearchField({
  label,
  placeholder,
  value,
  onChange,
  onClear,
  clearLabel,
  className,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  onClear: () => void
  clearLabel?: string
  className?: string
}) {
  return <div className={cn('search-field', className)}>
    <span className="search-field-icon" aria-hidden="true"><Search size={18} /></span>
    <input
      aria-label={label}
      className="form-control search-field-control"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
    {value && <button type="button" aria-label={clearLabel ?? `Clear ${label.toLowerCase()}`} onClick={onClear} className="search-field-clear">
      <X aria-hidden="true" size={17} />
    </button>}
  </div>
}
