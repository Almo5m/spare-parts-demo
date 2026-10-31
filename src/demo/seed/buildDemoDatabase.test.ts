import { describe, expect, it } from 'vitest'
import { round2 } from '../../lib/money'
import { PRODUCT_TEMPLATES } from './catalog'
import { buildDemoDatabase } from './buildDemoDatabase'

// تواريخ مختلفة عشان نتأكد إن البيانات سليمة في أي وقت (بداية اليوم، يوم الجمعة، آخر اليوم)
const NOW_SAMPLES = [
  new Date('2026-10-26T00:30:00'),
  new Date('2026-10-23T13:00:00'), // جمعة
  new Date('2026-10-26T23:50:00'),
]

describe.each(NOW_SAMPLES.map((now) => [now.toISOString(), now] as const))('البيانات الوهمية عند %s', (_label, now) => {
  const db = buildDemoDatabase(now)
  const near = (a: number, b: number) => Math.abs(a - b) < 0.011

  it('فيها بيانات كفاية لكل صفحات الموقع', () => {
    expect(db.products).toHaveLength(PRODUCT_TEMPLATES.length)
    expect(db.warehouses).toHaveLength(2)
    expect(db.customers.length).toBeGreaterThan(5)
    expect(db.sales_invoices.length).toBeGreaterThan(80)
    expect(db.orders.length).toBeGreaterThan(8)
    expect(db.sales_returns.length).toBeGreaterThan(0)
    expect(db.payments.length).toBeGreaterThan(0)
    expect(db.activity_log.length).toBeGreaterThan(20)
    expect(db.company_settings).toHaveLength(1)
    expect(db.users.length).toBeGreaterThan(1)
  })

  it('مفيش أي حدث في المستقبل', () => {
    const times = [
      ...db.sales_invoices.map((r) => r.created_at),
      ...db.orders.map((r) => r.created_at),
      ...db.sales_returns.map((r) => r.created_at),
      ...db.payments.map((r) => r.created_at),
      ...db.activity_log.map((r) => r.created_at),
      ...db.inventory_lots.map((r) => r.created_at),
    ]
    expect(times.every((t) => t <= now.toISOString())).toBe(true)
  })

  it('إجمالي كل فاتورة = مجموع بنودها ناقص الخصم، والمدفوع مش أكبر من الإجمالي', () => {
    for (const inv of db.sales_invoices) {
      const items = db.sales_invoice_items.filter((i) => i.invoice_id === inv.id)
      expect(items.length).toBeGreaterThan(0)
      const gross = items.reduce((s, i) => s + i.line_total, 0)
      expect(near(gross - inv.discount_amount, inv.total_amount)).toBe(true)
      expect(inv.paid_amount).toBeLessThanOrEqual(inv.total_amount + 0.01)
      expect(inv.paid_amount).toBeGreaterThanOrEqual(0)
    }
  })

  it('حالة الدفع متطابقة مع المبلغ المدفوع، والعميل النقدي بيدفع كامل', () => {
    for (const inv of db.sales_invoices) {
      const expected = inv.paid_amount >= inv.total_amount ? 'paid' : inv.paid_amount > 0 ? 'partial' : 'unpaid'
      expect(inv.payment_status).toBe(expected)
      if (!inv.customer_id) expect(inv.payment_status).toBe('paid')
    }
  })

  it('أرقام الفواتير والطلبيات فريدة ومتسلسلة، والإعدادات جاهزة للرقم التالي', () => {
    const saleNumbers = db.sales_invoices.map((i) => i.invoice_number)
    expect(new Set(saleNumbers).size).toBe(saleNumbers.length)
    expect(saleNumbers[0]).toBe('S-000001')
    expect(db.company_settings[0].next_sales_invoice_number).toBe(db.sales_invoices.length + 1)
    expect(db.company_settings[0].next_order_number).toBe(db.orders.length + 1)
  })

  it('رصيد المخزون = مجموع المتبقي في الدفعات، ومفيش كميات سالبة', () => {
    for (const row of db.inventory) {
      const remaining = db.inventory_lots
        .filter((l) => l.product_id === row.product_id && l.warehouse_id === row.warehouse_id)
        .reduce((s, l) => s + l.quantity_remaining, 0)
      expect(row.quantity).toBe(remaining)
      expect(row.quantity).toBeGreaterThanOrEqual(0)
    }
    for (const lot of db.inventory_lots) {
      expect(lot.quantity_remaining).toBeGreaterThanOrEqual(0)
      expect(lot.quantity_remaining).toBeLessThanOrEqual(lot.quantity_received)
    }
  })

  it('تكلفة كل بند = مجموع استهلاكه من الدفعات (FIFO)، والكمية المسحوبة = الكمية المباعة بالقطعة', () => {
    const cartonSizes = new Map(db.product_units.map((u) => [u.product_id, u.conversion_factor]))
    for (const item of db.sales_invoice_items) {
      const usages = db.sale_item_lot_usage.filter((u) => u.sale_invoice_item_id === item.id)
      const factor = item.unit_name === 'كرتونة' ? cartonSizes.get(item.product_id) ?? 1 : 1
      expect(usages.reduce((s, u) => s + u.quantity, 0)).toBe(item.quantity * factor)
      expect(near(usages.reduce((s, u) => s + u.quantity * u.unit_cost, 0), item.actual_cost)).toBe(true)
    }
  })

  it('رصيد كل عميل بيطابق كشف الحساب (نفس معادلة صفحة كشف الحساب)', () => {
    for (const customer of db.customers) {
      const invoices = db.sales_invoices
        .filter((i) => i.customer_id === customer.id)
        .reduce((s, i) => s + i.total_amount - i.paid_amount, 0)
      const payments = db.payments
        .filter((p) => p.party_id === customer.id)
        .reduce((s, p) => s + (p.direction === 'out' ? p.amount : -p.amount), 0)
      const returns = db.sales_returns
        .filter((r) => r.customer_id === customer.id)
        .reduce((s, r) => s - r.total_amount + r.cash_refund, 0)
      expect(near(customer.balance, round2(invoices + payments + returns))).toBe(true)
    }
  })

  it('العملاء النقديين مالهمش رصيد، والمرتجع النقدي بيرجّع الفلوس كاملة', () => {
    for (const ret of db.sales_returns) {
      const invoice = db.sales_invoices.find((i) => i.id === ret.sales_invoice_id)
      expect(invoice).toBeDefined()
      expect(ret.cash_refund).toBe(invoice?.customer_id ? 0 : ret.total_amount)
    }
  })

  it('كل المراجع بين الجداول سليمة (مفيش صف بيشاور على صف مش موجود)', () => {
    const has = (rows: { id: string }[]) => new Set(rows.map((r) => r.id))
    const products = has(db.products)
    const warehouses = has(db.warehouses)
    const invoices = has(db.sales_invoices)
    const returns = has(db.sales_returns)
    const orders = has(db.orders)
    const lots = has(db.inventory_lots)
    const items = has(db.sales_invoice_items)

    expect(db.sales_invoice_items.every((i) => invoices.has(i.invoice_id) && products.has(i.product_id) && warehouses.has(i.warehouse_id))).toBe(true)
    expect(db.sale_item_lot_usage.every((u) => items.has(u.sale_invoice_item_id) && lots.has(u.lot_id))).toBe(true)
    expect(db.sales_return_items.every((i) => returns.has(i.return_id) && products.has(i.product_id))).toBe(true)
    expect(db.order_items.every((i) => orders.has(i.order_id) && products.has(i.product_id))).toBe(true)
    expect(db.inventory.every((r) => products.has(r.product_id) && warehouses.has(r.warehouse_id))).toBe(true)
    expect(db.inventory_lots.every((l) => products.has(l.product_id) && warehouses.has(l.warehouse_id))).toBe(true)
  })

  it('الأرباح منطقية: الإيراد أكبر من التكلفة الفعلية', () => {
    const revenue = db.sales_invoice_items.reduce((s, i) => s + i.line_total, 0)
    const cost = db.sales_invoice_items.reduce((s, i) => s + i.actual_cost, 0)
    expect(cost).toBeGreaterThan(0)
    expect(revenue).toBeGreaterThan(cost)
  })

  it('فيه أصناف وصلت لحد التنبيه عشان الإشعارات والتقارير تبان', () => {
    expect(db.notifications.length).toBeGreaterThan(0)
  })
})

describe('خصائص عامة', () => {
  const now = new Date('2026-10-26T12:00:00')

  it('نفس الوقت = نفس البيانات بالظبط (ثابتة ومش عشوائية)', () => {
    expect(buildDemoDatabase(now)).toEqual(buildDemoDatabase(now))
  })

  it('مفيش أي اسم من بيانات العميل الحقيقي في الأصناف أو العملاء أو الإعدادات', () => {
    const banned = ['ديزاير', 'سياز', 'بالينو', 'ماروتي', 'CIAZ', 'DEZIRE', 'Baleno', 'Maruti']
    const db = buildDemoDatabase(now)
    const text = JSON.stringify([db.products, db.customers, db.company_settings, db.categories, db.warehouses])
    for (const word of banned) expect(text).not.toContain(word)
  })

  it('أرقام التليفونات الوهمية بصيغة واضحة مش أرقام حقيقية عشوائية', () => {
    const db = buildDemoDatabase(now)
    const phones = [...db.customers.map((c) => c.phone), ...db.users.map((u) => u.phone)].filter(Boolean)
    expect(phones.every((p) => /^0100000\d{4}$/.test(p ?? ''))).toBe(true)
  })
})
