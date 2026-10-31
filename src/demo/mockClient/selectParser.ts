// بيفهم نص الـ select بتاع Supabase زي:
//   "*, sales_invoices!inner(created_at, total_amount)"
// ويحوّله لهيكل بسيط: أعمدة مطلوبة + جداول مرتبطة (embeds) متداخلة لأي عمق.

export interface EmbedSpec {
  name: string
  // inner = لو مفيش صف مرتبط، الصف الأساسي نفسه يتشال من النتيجة
  inner: boolean
  select: SelectSpec
}

export interface SelectSpec {
  all: boolean
  columns: string[]
  embeds: EmbedSpec[]
}

// بيقسم النص على الفواصل اللي برا الأقواس بس
function splitTopLevel(input: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of input) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  parts.push(current)
  return parts.map((p) => p.trim()).filter(Boolean)
}

export function parseSelect(input: string): SelectSpec {
  const spec: SelectSpec = { all: false, columns: [], embeds: [] }

  for (const part of splitTopLevel(input)) {
    const open = part.indexOf('(')
    if (open === -1) {
      if (part === '*') spec.all = true
      else spec.columns.push(part)
      continue
    }
    const rawName = part.slice(0, open).trim()
    const inner = rawName.endsWith('!inner')
    spec.embeds.push({
      name: rawName.replace('!inner', ''),
      inner,
      select: parseSelect(part.slice(open + 1, part.lastIndexOf(')'))),
    })
  }
  return spec
}
