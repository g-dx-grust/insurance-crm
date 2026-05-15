import { z } from 'zod'
import { contactHistoryTypes } from '@/lib/validations/contact-history'

export const meetingRecordTemplateSchema = z.object({
  title: z.string().min(1, 'テンプレート名は必須です').max(80),
  type: z.enum(contactHistoryTypes),
  content: z.string().min(1, '本文は必須です').max(2000),
  next_action: z.string().max(200).nullable().optional(),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0).max(999),
})

export type MeetingRecordTemplateFormValues = z.infer<typeof meetingRecordTemplateSchema>
