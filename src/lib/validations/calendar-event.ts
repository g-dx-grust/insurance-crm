import { z } from 'zod'
import { EVENT_CATEGORIES } from '@/lib/constants/calendar'

export const calendarEventSchema = z
  .object({
    title: z.string().min(1, 'タイトルは必須です').max(100),
    type: z.enum(EVENT_CATEGORIES),
    start_at: z.string().min(1, '開始日時は必須です'),
    end_at: z.string().min(1, '終了日時は必須です'),
    all_day: z.boolean(),
    related_customer_id: z.string().uuid().nullable().optional(),
    related_opportunity_id: z.string().uuid().nullable().optional(),
    assigned_to: z.string().uuid().nullable().optional(),
    location: z.string().max(200).nullable().optional(),
    note: z.string().max(2000).nullable().optional(),
  })
  .refine((d) => new Date(d.end_at).getTime() >= new Date(d.start_at).getTime(), {
    message: '終了日時は開始日時以降にしてください',
    path: ['end_at'],
  })

export type CalendarEventFormValues = z.infer<typeof calendarEventSchema>
