'use server'
// actions/quote.actions.ts
import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/auth/session'
import { addQuote, removeQuote } from '@/lib/db/quotes'
import { z } from 'zod'

const addSchema = z.object({ text: z.string().min(1).max(500) })
const idSchema = z.object({ id: z.string().uuid() })

export async function addQuoteAction(input: z.infer<typeof addSchema>) {
  if (!(await verifySession())) return { error: 'Unauthorized' }
  const r = addSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }
  try {
    const quote = await addQuote(r.data.text)
    revalidatePath('/settings')
    revalidatePath('/')
    return { success: true, quote }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

export async function removeQuoteAction(input: z.infer<typeof idSchema>) {
  if (!(await verifySession())) return { error: 'Unauthorized' }
  const r = idSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }
  try {
    await removeQuote(r.data.id)
    revalidatePath('/settings')
    revalidatePath('/')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}
