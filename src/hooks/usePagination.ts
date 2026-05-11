'use client'

import { useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export function usePagination(totalCount: number, pageSize = 20) {
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const page = Math.max(1, Number(sp.get('page') ?? 1))

  const meta = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
    return {
      page,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
      offset: (page - 1) * pageSize,
    }
  }, [page, totalCount, pageSize])

  const go = (next: number) => {
    const params = new URLSearchParams(sp.toString())
    params.set('page', String(next))
    router.push(`${pathname}?${params.toString()}`)
  }

  return { ...meta, go }
}
