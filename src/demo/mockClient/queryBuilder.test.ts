import { describe, expect, it } from 'vitest'
import { createMockSupabase } from './createMockSupabase'
import { MockQueryBuilder, type MockDatabase } from './queryBuilder'
import { WRITE_BLOCKED_MESSAGE } from '../demoConfig'
import type { DemoDatabase } from '../seed/types'

const fixture = (): MockDatabase => ({
  warehouses: [
    { id: 'w1', name: 'الرئيسي' },
    { id: 'w2', name: 'الفرعي' },
  ],
  products: [
    { id: 'p1', name: 'فلتر زيت', part_number: 'P-1', price: 50, note: null },
    { id: 'p2', name: 'فلتر هواء', part_number: 'P-2', price: 80, note: 'x' },
    { id: 'p3', name: 'خصم 100% تجريبي', part_number: 'P-3', price: 80, note: null },
    { id: 'p4', name: 'مساعد_أمامي', part_number: 'P-4', price: 900, note: 'y' },
  ],
  inventory: [
    { product_id: 'p1', warehouse_id: 'w1', quantity: 10 },
    { product_id: 'p2', warehouse_id: 'w1', quantity: 0 },
    { product_id: 'p4', warehouse_id: 'w2', quantity: 3 },
    { product_id: 'p9', warehouse_id: 'w1', quantity: 7 },
  ],
  sales_invoices: [
    { id: 'i1', invoice_number: 'S-1', created_at: '2026-01-10T10:00:00.000Z', total_amount: 100 },
    { id: 'i2', invoice_number: 'S-2', created_at: '2026-02-10T10:00:00.000Z', total_amount: 200 },
  ],
  sales_invoice_items: [
    { id: 'a', invoice_id: 'i1', product_id: 'p1', quantity: 1 },
    { id: 'b', invoice_id: 'i2', product_id: 'p2', quantity: 2 },
    { id: 'c', invoice_id: 'missing', product_id: 'p2', quantity: 5 },
  ],
  sale_item_lot_usage: [{ id: 'u1', sale_invoice_item_id: 'a', quantity: 1 }],
})

const query = (table: string, db: MockDatabase = fixture()) => new MockQueryBuilder(db, table)
const ids = (result: { data: unknown }) => (result.data as { id: string }[]).map((r) => r.id)

describe('MockQueryBuilder: القراءة والفلاتر', () => {
  it('select * بيرجّع كل الصفوف، والجدول غير الموجود بيرجّع قايمة فاضية', async () => {
    expect(ids(await query('products'))).toEqual(['p1', 'p2', 'p3', 'p4'])
    expect((await query('no_such_table')).data).toEqual([])
  })

  it('بيرجّع الأعمدة المطلوبة بس', async () => {
    const { data } = await query('products').select('id, name').eq('id', 'p1')
    expect(data).toEqual([{ id: 'p1', name: 'فلتر زيت' }])
  })

  it('eq / neq / gt / gte / lt / lte / in / is', async () => {
    expect(ids(await query('products').eq('price', 80))).toEqual(['p2', 'p3'])
    expect(ids(await query('products').neq('price', 80))).toEqual(['p1', 'p4'])
    expect(ids(await query('products').gt('price', 80))).toEqual(['p4'])
    expect(ids(await query('products').gte('price', 80))).toEqual(['p2', 'p3', 'p4'])
    expect(ids(await query('products').lt('price', 80))).toEqual(['p1'])
    expect(ids(await query('products').lte('price', 80))).toEqual(['p1', 'p2', 'p3'])
    expect(ids(await query('products').in('id', ['p1', 'p4']))).toEqual(['p1', 'p4'])
    expect(ids(await query('products').is('note', null))).toEqual(['p1', 'p3'])
  })

  it('المقارنات مع null بترفض الصف بدل ما تطلع نتيجة غلط', async () => {
    expect(ids(await query('products').gt('note', 'a'))).toEqual(['p2', 'p4'])
    expect(ids(await query('products').lt('note', 'z'))).toEqual(['p2', 'p4'])
  })

  it('ilike: بحث جزئي وبدون حساسية لحالة الحروف', async () => {
    expect(ids(await query('products').ilike('part_number', '%p-1%'))).toEqual(['p1'])
    expect(ids(await query('products').ilike('name', 'فلتر%'))).toEqual(['p1', 'p2'])
  })

  it('ilike: علامة % و _ المهرّبة بـ \\ بتتعامل كحروف عادية', async () => {
    expect(ids(await query('products').ilike('name', '%100\\%%'))).toEqual(['p3'])
    expect(ids(await query('products').ilike('name', '%مساعد\\_أمامي%'))).toEqual(['p4'])
    // من غير تهريب، _ بتطابق أي حرف، فنطابق «مساعد_أمامي» برضه
    expect(ids(await query('products').ilike('name', 'مساعد_أمامي'))).toEqual(['p4'])
  })

  it('رموز regex في البحث متتفسرش (بتتعامل كنص عادي)', async () => {
    expect((await query('products').ilike('name', '%(%')).data).toEqual([])
    expect((await query('products').ilike('name', '.*')).data).toEqual([])
  })
})

describe('MockQueryBuilder: الترتيب والصفحات', () => {
  it('الترتيب التصاعدي بيحط الـ null في الآخر، والتنازلي في الأول', async () => {
    expect(ids(await query('products').order('note'))).toEqual(['p2', 'p4', 'p1', 'p3'])
    expect(ids(await query('products').order('note', { ascending: false }))).toEqual(['p1', 'p3', 'p4', 'p2'])
  })

  it('ترتيب متعدد بالتسلسل', async () => {
    const result = await query('products').order('price', { ascending: false }).order('id', { ascending: false })
    expect(ids(result)).toEqual(['p4', 'p3', 'p2', 'p1'])
  })

  it('range شاملة الطرفين، وlimit بتقص النتيجة', async () => {
    expect(ids(await query('products').order('id').range(1, 2))).toEqual(['p2', 'p3'])
    expect(ids(await query('products').order('id').range(10, 20))).toEqual([])
    expect(ids(await query('products').order('id').limit(2))).toEqual(['p1', 'p2'])
  })
})

describe('MockQueryBuilder: single و maybeSingle', () => {
  it('single بيرجّع الصف مباشرة لو واحد بس', async () => {
    const { data, error } = await query('products').eq('id', 'p2').single()
    expect(error).toBeNull()
    expect(data).toMatchObject({ id: 'p2' })
  })

  it('single بيرجّع خطأ لو مفيش صف أو أكتر من صف', async () => {
    const none = await query('products').eq('id', 'zzz').single()
    const many = await query('products').single()
    expect(none.data).toBeNull()
    expect(none.error?.code).toBe('PGRST116')
    expect(many.error?.code).toBe('PGRST116')
  })

  it('maybeSingle بيرجّع null من غير خطأ لو مفيش صف، وخطأ لو أكتر من صف', async () => {
    const none = await query('products').eq('id', 'zzz').maybeSingle()
    expect(none).toMatchObject({ data: null, error: null })
    expect((await query('products').maybeSingle()).error?.code).toBe('PGRST116')
  })
})

describe('MockQueryBuilder: الجداول المرتبطة (embeds)', () => {
  it('بيجيب الصف المرتبط كـ object', async () => {
    const { data } = await query('inventory').select('quantity, products(name)').eq('product_id', 'p1')
    expect(data).toEqual([{ quantity: 10, products: { name: 'فلتر زيت' } }])
  })

  it('لو الصف المرتبط مش موجود بيبقى null من غير ما الصف الأساسي يختفي', async () => {
    const { data } = await query('inventory').select('quantity, products(name)').eq('product_id', 'p9')
    expect(data).toEqual([{ quantity: 7, products: null }])
  })

  it('!inner بيشيل الصفوف اللي مالهاش صف مرتبط', async () => {
    const result = await query('sales_invoice_items').select('id, sales_invoices!inner(invoice_number)')
    expect(ids(result)).toEqual(['a', 'b'])
  })

  it('فلتر على عمود في الجدول المرتبط مع !inner', async () => {
    const result = await query('sales_invoice_items')
      .select('id, sales_invoices!inner(invoice_number)')
      .gte('sales_invoices.created_at', '2026-02-01T00:00:00.000Z')
    expect(ids(result)).toEqual(['b'])
  })

  it('embed متداخل على أكتر من مستوى (استخدام الدفعات -> بند فاتورة -> فاتورة)', async () => {
    const { data } = await query('sale_item_lot_usage').select(
      'quantity, sales_invoice_items(product_id, sales_invoices(invoice_number))'
    )
    expect(data).toEqual([
      { quantity: 1, sales_invoice_items: { product_id: 'p1', sales_invoices: { invoice_number: 'S-1' } } },
    ])
  })

  it('* مع embed بيرجّع كل الأعمدة والصف المرتبط معاهم', async () => {
    const { data } = await query('sales_invoice_items').select('*, sales_invoices(invoice_number)').eq('id', 'a')
    expect(data).toEqual([
      { id: 'a', invoice_id: 'i1', product_id: 'p1', quantity: 1, sales_invoices: { invoice_number: 'S-1' } },
    ])
  })
})

describe('الكتابة معطّلة في النسخة التجريبية', () => {
  const blocked = { data: null, error: { message: WRITE_BLOCKED_MESSAGE, code: 'DEMO_READ_ONLY' } }

  it('insert / update / delete / upsert بترجّع رسالة العرض التجريبي وبتسيب البيانات زي ما هي', async () => {
    const db = fixture()
    for (const run of [
      () => query('products', db).insert(),
      () => query('products', db).update().eq('id', 'p1'),
      () => query('products', db).delete().eq('id', 'p1'),
      () => query('products', db).upsert(),
    ]) {
      expect(await run()).toMatchObject(blocked)
    }
    expect(db.products).toHaveLength(4)
  })

  it('السلاسل اللي بتكمّل بعد الكتابة (select + single) برضه بترجّع الرسالة', async () => {
    const result = await query('products').insert().select('id').single()
    expect(result).toMatchObject(blocked)
  })
})

describe('createMockSupabase: الدخول والدوال والإشعارات', () => {
  const client = createMockSupabase(fixture() as unknown as DemoDatabase)

  it('الجلسة جاهزة تلقائيًا (من غير شاشة دخول)', async () => {
    const { data } = await client.auth.getSession()
    expect(data.session?.user.id).toBeTruthy()
  })

  it('العمليات اللي بتشتغل في الخلفية بتعدّي بصمت', async () => {
    expect(await client.rpc('log_activity')).toMatchObject({ error: null })
    expect(await client.rpc('cleanup_old_notifications')).toMatchObject({ error: null })
  })

  it('كل عملية حقيقية بترجّع شرح اللي كان هيحصل، والعملية المجهولة بترجّع الرسالة العامة', async () => {
    const sale = await client.rpc('create_sale_invoice')
    expect(sale.error?.message).toContain('FIFO')
    const unknown = await client.rpc('something_new' as never)
    expect(unknown.error?.message).toBe(WRITE_BLOCKED_MESSAGE)
  })

  it('إدارة المستخدمين وتغيير كلمة المرور معطّلين', async () => {
    expect((await client.functions.invoke('manage-users')).error?.message).toBeTruthy()
    expect((await client.auth.updateUser({ password: 'x' })).error?.message).toBe(WRITE_BLOCKED_MESSAGE)
  })

  it('القناة اللحظية بترجّع كائن آمن يتسلسل عليه on و subscribe', async () => {
    const channel = client.channel('x').on('postgres_changes', { event: '*', schema: 'public' }, () => {}).subscribe()
    expect(channel).toBeTruthy()
    await expect(client.removeChannel(channel)).resolves.toBeTruthy()
  })

  it('Promise.all بتشتغل مع نتايج الاستعلامات', async () => {
    const [warehouses, products] = await Promise.all([
      client.from('warehouses').select('id'),
      client.from('products').select('id').limit(1),
    ])
    expect(warehouses.data).toHaveLength(2)
    expect(products.data).toHaveLength(1)
  })
})
