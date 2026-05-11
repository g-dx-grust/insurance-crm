'use client'

import { Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/components/layout/ThemeProvider'

const OPTIONS = [
  { value: 'small',  label: '小 (90%)'  },
  { value: 'normal', label: '標準 (100%)' },
  { value: 'large',  label: '大 (110%)' },
] as const

export function FontScaleControl() {
  const { fontScale, setFontScale } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label="フォントサイズを変更"
            title="フォントサイズを変更"
          >
            <Type className="size-4" />
          </Button>
        }
      />

      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>フォントサイズ</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => setFontScale(opt.value)}
            className={fontScale === opt.value ? 'font-semibold text-accent' : ''}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
