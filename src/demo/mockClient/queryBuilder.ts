// بديل خفيف لـ query builder بتاع Supabase، بيقرأ من قاعدة البيانات الوهمية في الذاكرة.
// القراءة شغالة بالكامل (فلاتر، ترتيب، صفحات، جداول متداخلة). أي عملية كتابة
// (insert / update / delete / upsert) بترجّع رسالة إن النسخة للعرض فقط.

import { WRITE_BLOCKED_MESSAGE } from '../demoConfig'
import { resolveRelation } from './relations'
import {
  compareRows, matchesFilter,
  type Filter, type Operator, type OrderBy, type Row,
} from './rowFilters'
import { parseSelect, type SelectSpec } from './selectParser'

export type MockDatabase = Record<string, Row[]>

interface QueryError {
  message: string
  code: string
}

export interface MockResult {
  data: unknown
  error: QueryError | null
  count: number | null
  status: number
  statusText: string
}

type Cardinality = 'many' | 'single' | 'maybeSingle'

export class MockQueryBuilder implements PromiseLike<MockResult> {
  private isWrite = false
  private selectSpec: SelectSpec = parseSelect('*')
  private readonly filters: Filter[] = []
  private readonly orderings: OrderBy[] = []
  private rangeFrom: number | null = null
  private rangeTo: number | null = null
  private limitCount: number | null = null
  private cardinality: Cardinality = 'many'

  private readonly db: MockDatabase
  private readonly table: string

  constructor(db: MockDatabase, table: string) {
    this.db = db
    this.table = table
  }

  // ===== اختيار الأعمدة =====

  select(columns: string = '*'): this {
    this.selectSpec = parseSelect(columns)
    return this
  }

  // ===== الكتابة: معطّلة في النسخة التجريبية =====

  insert(): this { return this.markWrite() }
  update(): this { return this.markWrite() }
  delete(): this { return this.markWrite() }
  upsert(): this { return this.markWrite() }

  private markWrite(): this {
    this.isWrite = true
    return this
  }

  // ===== الفلاتر =====

  eq(column: string, value: unknown): this { return this.filter(column, 'eq', value) }
  neq(column: string, value: unknown): this { return this.filter(column, 'neq', value) }
  gt(column: string, value: unknown): this { return this.filter(column, 'gt', value) }
  gte(column: string, value: unknown): this { return this.filter(column, 'gte', value) }
  lt(column: string, value: unknown): this { return this.filter(column, 'lt', value) }
  lte(column: string, value: unknown): this { return this.filter(column, 'lte', value) }
  ilike(column: string, pattern: string): this { return this.filter(column, 'ilike', pattern) }
  in(column: string, values: unknown[]): this { return this.filter(column, 'in', values) }
  is(column: string, value: unknown): this { return this.filter(column, 'is', value) }

  private filter(column: string, operator: Operator, value: unknown): this {
    this.filters.push({ column, operator, value })
    return this
  }

  // ===== الترتيب والصفحات =====

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderings.push({ column, ascending: options?.ascending ?? true })
    return this
  }

  range(from: number, to: number): this {
    this.rangeFrom = from
    this.rangeTo = to
    return this
  }

  limit(count: number): this {
    this.limitCount = count
    return this
  }

  single(): this {
    this.cardinality = 'single'
    return this
  }

  maybeSingle(): this {
    this.cardinality = 'maybeSingle'
    return this
  }

  // ===== التنفيذ =====

  then<TResult1 = MockResult, TResult2 = never>(
    onfulfilled?: ((value: MockResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }

  private execute(): MockResult {
    if (this.isWrite) {
      return failure(WRITE_BLOCKED_MESSAGE, 'DEMO_READ_ONLY', 403)
    }

    let rows = (this.db[this.table] ?? []).filter((row) =>
      this.filters.every((f) => matchesFilter(this.valueOf(row, f.column), f))
    )

    if (this.orderings.length > 0) {
      rows = [...rows].sort((a, b) => {
        for (const { column, ascending } of this.orderings) {
          const result = compareRows(this.valueOf(a, column), this.valueOf(b, column), ascending)
          if (result !== 0) return result
        }
        return 0
      })
    }

    if (this.rangeFrom !== null && this.rangeTo !== null) {
      rows = rows.slice(this.rangeFrom, this.rangeTo + 1)
    }
    if (this.limitCount !== null) rows = rows.slice(0, this.limitCount)

    const projected = rows
      .map((row) => this.project(row, this.selectSpec, this.table))
      .filter((row): row is Row => row !== null)

    return this.shape(projected)
  }

  private shape(rows: Row[]): MockResult {
    if (this.cardinality === 'many') return success(rows)
    if (rows.length === 1) return success(rows[0])
    if (rows.length === 0 && this.cardinality === 'maybeSingle') return success(null)
    return failure('JSON object requested, multiple (or no) rows returned', 'PGRST116', 406)
  }

  // قيمة العمود، وأي عمود بصيغة "جدول_مرتبط.عمود" بيتقرأ من الصف المرتبط
  private valueOf(row: Row, column: string): unknown {
    const dot = column.indexOf('.')
    if (dot === -1) return row[column]
    const relation = resolveRelation(this.table, column.slice(0, dot))
    if (!relation) return undefined
    return this.findRelated(row, relation.table, relation.localKey)?.[column.slice(dot + 1)]
  }

  private findRelated(row: Row, targetTable: string, localKey: string): Row | undefined {
    return (this.db[targetTable] ?? []).find((target) => target.id === row[localKey])
  }

  // بيبني الصف النهائي: الأعمدة المطلوبة + الجداول المرتبطة. بيرجّع null لو
  // فيه !inner والصف المرتبط مش موجود.
  private project(row: Row, spec: SelectSpec, table: string): Row | null {
    const out: Row = spec.all
      ? { ...row }
      : Object.fromEntries(spec.columns.filter((c) => c in row).map((c) => [c, row[c]]))

    for (const embed of spec.embeds) {
      const relation = resolveRelation(table, embed.name)
      const target = relation ? this.findRelated(row, relation.table, relation.localKey) : undefined
      if (!relation || !target) {
        if (embed.inner) return null
        out[embed.name] = null
        continue
      }
      const nested = this.project(target, embed.select, relation.table)
      if (nested === null && embed.inner) return null
      out[embed.name] = nested
    }
    return out
  }
}

function success(data: unknown): MockResult {
  return { data, error: null, count: null, status: 200, statusText: 'OK' }
}

function failure(message: string, code: string, status: number): MockResult {
  return { data: null, error: { message, code }, count: null, status, statusText: 'Error' }
}
