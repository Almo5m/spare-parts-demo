// مقارنات الصفوف: الفلاتر (eq / gte / ilike ...) والترتيب، بنفس سلوك قاعدة البيانات
// في الحالات اللي الواجهة بتستخدمها (نصوص، أرقام، تواريخ ISO، قيم null).

export type Row = Record<string, unknown>
export type Operator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'ilike' | 'in' | 'is'

export interface Filter {
  column: string
  operator: Operator
  value: unknown
}

export interface OrderBy {
  column: string
  ascending: boolean
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// % أي عدد حروف، _ حرف واحد، وعلامة \ قبل أي رمز بتلغي معناه الخاص
function likeToRegExp(pattern: string): RegExp {
  let source = ''
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]
    if (ch === '\\' && i + 1 < pattern.length) {
      source += escapeRegExp(pattern[++i])
    } else if (ch === '%') {
      source += '.*'
    } else if (ch === '_') {
      source += '.'
    } else {
      source += escapeRegExp(ch)
    }
  }
  return new RegExp(`^${source}$`, 'is')
}

// التواريخ بصيغة ISO فالمقارنة النصية كفاية لها
export function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  const left = String(a)
  const right = String(b)
  return left < right ? -1 : left > right ? 1 : 0
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  return String(a) === String(b)
}

export function matchesFilter(actual: unknown, filter: Filter): boolean {
  const { operator, value } = filter
  switch (operator) {
    case 'eq': return sameValue(actual, value)
    case 'neq': return !sameValue(actual, value)
    case 'is': return value === null ? actual == null : actual === value
    case 'in': return Array.isArray(value) && value.some((v) => sameValue(actual, v))
    case 'ilike': return actual != null && likeToRegExp(String(value)).test(String(actual))
    case 'gt': return actual != null && compareValues(actual, value) > 0
    case 'gte': return actual != null && compareValues(actual, value) >= 0
    case 'lt': return actual != null && compareValues(actual, value) < 0
    case 'lte': return actual != null && compareValues(actual, value) <= 0
  }
}

// الترتيب التصاعدي بيحط الـ null في الآخر، والتنازلي في الأول (زي PostgreSQL)
export function compareRows(a: unknown, b: unknown, ascending: boolean): number {
  if (a == null && b == null) return 0
  if (a == null) return ascending ? 1 : -1
  if (b == null) return ascending ? -1 : 1
  const result = compareValues(a, b)
  return ascending ? result : -result
}
