import { z } from 'zod'

export const intentionSignatureRequestSchema = z.object({
  intention_record_id: z.string().uuid(),
  signer_name: z.string().min(1, '署名者名は必須です').max(100),
  signer_email: z
    .union([
      z.string().trim().email('メールアドレスの形式が正しくありません'),
      z.literal(''),
      z.null(),
      z.undefined(),
    ])
    .transform((value) => value || null),
  expires_in_days: z.number().int().min(1).max(30),
})

export type IntentionSignatureRequestValues = z.infer<
  typeof intentionSignatureRequestSchema
>
