'use server'
// actions/quote.actions.ts — Quote actions with strict auth & ownership verification
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { addQuote, removeQuote } from '@/lib/db/quotes'
import { z } from 'zod'

const addSchema = z.object({ text: z.string().min(1).max(500) })
const idSchema = z.object({ id: z.string().uuid() })

export async function addQuoteAction(input: z.infer<typeof addSchema>) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  const r = addSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }

  try {
    const quote = await addQuote(r.data.text)
    revalidatePath('/settings')
    revalidatePath('/dashboard')
    return { success: true, quote }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to add quote' }
  }
}

export async function removeQuoteAction(input: z.infer<typeof idSchema>) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  const r = idSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }

  // Verify ownership before removing
  const { data: existing, error: findError } = await supabase
    .from('quotes')
    .select('id')
    .eq('id', r.data.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (findError || !existing) {
    return { error: 'Quote not found or unauthorized' }
  }

  try {
    await removeQuote(r.data.id)
    revalidatePath('/settings')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to remove quote' }
  }
}
