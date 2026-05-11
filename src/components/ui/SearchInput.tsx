'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function SearchInput({
  defaultValue = '',
  onChange,
  placeholder = '検索…',
  debounceMs = 300,
  className,
}: {
  defaultValue?: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
}) {
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    const t = setTimeout(() => onChange(value), debounceMs)
    return () => clearTimeout(t)
    // onChange を依存配列に入れると親の再レンダリングで連続発火するため除外
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, debounceMs])

  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-text-muted"
        aria-hidden
      />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  )
}
