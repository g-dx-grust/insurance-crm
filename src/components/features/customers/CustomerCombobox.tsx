'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface CustomerOption {
  id: string
  name: string
  name_kana: string
}

export function CustomerCombobox({
  value,
  onChange,
  customers,
  placeholder = '顧客を選択',
  disabled,
}: {
  value: string | null
  onChange: (id: string | null) => void
  customers: CustomerOption[]
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = useMemo(
    () => customers.find((c) => c.id === value) ?? null,
    [value, customers],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.name_kana.toLowerCase().includes(q),
    )
  }, [query, customers])

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setQuery('')
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            type="button"
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className={cn(selected ? 'text-text' : 'text-text-muted')}>
              {selected ? `${selected.name} (${selected.name_kana})` : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 size-4 text-text-muted" />
          </Button>
        }
      />
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0"
        style={{ width: 'var(--anchor-width, 320px)' }}
      >
        <Command>
          <div className="flex items-center border-b border-border px-2">
            <Search className="size-4 text-text-muted" />
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="氏名・カナで検索"
              className="border-0 focus-visible:ring-0"
            />
          </div>
          <CommandList className="max-h-64">
            <CommandEmpty>該当する顧客がいません</CommandEmpty>
            <CommandGroup>
              {filtered.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.name} ${c.name_kana}`}
                  onSelect={() => {
                    onChange(c.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 size-4',
                      value === c.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm">{c.name}</span>
                    <span className="text-xs text-text-muted">{c.name_kana}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
