// بيحاكي شغل المخزن يوم بيوم: طلبيات شراء بتزوّد المخزون، فواتير بيع بتسحب منه (FIFO)،
// مرتجعات ودفعات عملاء. كل رقم بيتحسب بنفس قواعد النظام الحقيقي (الخصم، التكلفة، الرصيد)
// عشان الداشبورد والتقارير وكشف الحساب تطلع أرقام متسقة مع بعضها.

import { lineTotal, netRatio, round2 } from '../../lib/money'
import { DEMO_HISTORY_DAYS } from '../demoConfig'
import { BASE_UNIT_NAME, CARTON_UNIT_NAME, CASH_CUSTOMER_NAMES } from './catalog'
import { daysAgoAt, isFriday, padNumber } from './timeHelpers'
import type { SeedContext, TableRow } from './types'

type Product = TableRow<'products'>
type PaymentStatus = TableRow<'sales_invoices'>['payment_status']

const ORDER_EVERY_N_DAYS = 5
const RETURN_REASONS = ['عيب في الصنف', 'مقاس غير مناسب', 'العميل غيّر رأيه'] as const
const PAYMENT_NOTES = [null, 'تحصيل نقدي', 'دفعة على الحساب'] as const

interface DraftLine {
  product: Product
  warehouseId: string
  quantity: number
  factor: number
  unitName: string
  unitPrice: number
}

// الكميات بتتناسب عكسيًا مع السعر: القطع الرخيصة بتتباع وتتشترى بكميات أكبر
function saleQuantityRange(salePrice: number): [number, number] {
  if (salePrice >= 1500) return [1, 2]
  if (salePrice >= 500) return [1, 3]
  if (salePrice >= 150) return [1, 5]
  return [2, 12]
}

function restockQuantityRange(salePrice: number): [number, number] {
  if (salePrice >= 1500) return [2, 5]
  if (salePrice >= 500) return [4, 12]
  if (salePrice >= 150) return [8, 24]
  return [15, 48]
}

// ===== المخزون الافتتاحي =====

export function seedOpeningStock(ctx: SeedContext): void {
  const createdAt = daysAgoAt(ctx.now, DEMO_HISTORY_DAYS + 5, 12, 0).toISOString()
  for (const product of ctx.db.products) {
    const [min, max] = restockQuantityRange(product.sale_price)
    addOpeningLot(ctx, product, ctx.mainWarehouseId, ctx.rng.int(min * 2, max * 2), createdAt)
    if (ctx.rng.chance(0.4)) {
      addOpeningLot(ctx, product, ctx.branchWarehouseId, ctx.rng.int(min, max), createdAt)
    }
  }
}

function addOpeningLot(
  ctx: SeedContext, product: Product, warehouseId: string, quantity: number, createdAt: string
): void {
  ctx.lots.add({
    id: ctx.rng.id(),
    product_id: product.id,
    warehouse_id: warehouseId,
    source_type: 'stocktake',
    source_id: null,
    unit_cost: ctx.unitCosts.get(product.id) ?? product.cost_price,
    quantity_received: quantity,
    quantity_remaining: quantity,
    default_sale_price: null,
    created_at: createdAt,
  })
}

// ===== المحاكاة اليومية =====

export function simulateActivity(ctx: SeedContext): void {
  const returnedItemIds = new Set<string>()

  for (let daysAgo = DEMO_HISTORY_DAYS; daysAgo >= 0; daysAgo--) {
    const day = daysAgoAt(ctx.now, daysAgo, 12, 0)

    if (daysAgo % ORDER_EVERY_N_DAYS === 3) {
      runIfPast(ctx, daysAgoAt(ctx.now, daysAgo, 9, ctx.rng.int(0, 59)), (when) => createOrder(ctx, when))
    }

    const salesCount = isFriday(day) ? ctx.rng.int(0, 1) : ctx.rng.int(2, 5)
    const saleTimes = Array.from({ length: salesCount }, () =>
      daysAgoAt(ctx.now, daysAgo, ctx.rng.int(10, 19), ctx.rng.int(0, 59))
    ).sort((a, b) => a.getTime() - b.getTime())
    for (const when of saleTimes) runIfPast(ctx, when, (t) => createSaleInvoice(ctx, t))

    if (daysAgo <= 60 && ctx.rng.chance(0.07)) {
      runIfPast(ctx, daysAgoAt(ctx.now, daysAgo, 20, 10), (t) => createSalesReturn(ctx, t, returnedItemIds))
    }
    if (ctx.rng.chance(0.18)) {
      runIfPast(ctx, daysAgoAt(ctx.now, daysAgo, 20, 40), (t) => createCustomerPayment(ctx, t))
    }
  }
}

// أحداث اليوم الحالي اللي ميعادها لسه ما جاش بنتخطاها بدل ما نولّد حاجة في المستقبل
function runIfPast(ctx: SeedContext, when: Date, action: (when: Date) => void): void {
  if (when.getTime() <= ctx.now.getTime()) action(when)
}

// ===== طلبيات الشراء =====

function createOrder(ctx: SeedContext, when: Date): void {
  const warehouseId = ctx.rng.chance(0.8) ? ctx.mainWarehouseId : ctx.branchWarehouseId
  const orderId = ctx.rng.id()
  const createdAt = when.toISOString()
  let subtotal = 0

  for (const product of pickLowStockProducts(ctx, warehouseId, ctx.rng.int(3, 6))) {
    const cartonSize = ctx.cartonSizes.get(product.id)
    const useCarton = cartonSize !== undefined && ctx.rng.chance(0.5)
    const factor = useCarton && cartonSize ? cartonSize : 1
    const [min, max] = restockQuantityRange(product.sale_price)
    const quantity = useCarton ? ctx.rng.int(1, 3) : ctx.rng.int(min, max)
    const baseCost = ctx.unitCosts.get(product.id) ?? product.cost_price
    const unitCost = round2(baseCost * factor)
    const total = lineTotal(quantity, unitCost)
    subtotal += total

    ctx.db.order_items.push({
      id: ctx.rng.id(),
      order_id: orderId,
      product_id: product.id,
      quantity,
      unit_name: useCarton ? CARTON_UNIT_NAME : BASE_UNIT_NAME,
      unit_cost: unitCost,
      line_total: total,
      default_sale_price: round2(product.sale_price * factor),
    })
    ctx.lots.add({
      id: ctx.rng.id(),
      product_id: product.id,
      warehouse_id: warehouseId,
      source_type: 'order',
      source_id: orderId,
      unit_cost: baseCost,
      quantity_received: quantity * factor,
      quantity_remaining: quantity * factor,
      default_sale_price: product.sale_price,
      created_at: createdAt,
    })
  }

  const discount = ctx.rng.chance(0.2) ? Math.round(subtotal * 0.03) : 0
  ctx.db.orders.push({
    id: orderId,
    order_number: `O-${padNumber(ctx.db.orders.length + 1, 6)}`,
    warehouse_id: warehouseId,
    status: 'received',
    total_cost: round2(subtotal - discount),
    discount_amount: discount,
    notes: ctx.rng.chance(0.3) ? 'طلبية دورية' : null,
    created_at: createdAt,
    created_by: ctx.demoUserId,
  })
}

// الطلبية بتركّز على الأصناف اللي مخزونها قليل، زي ما أي مسؤول مشتريات بيعمل
function pickLowStockProducts(ctx: SeedContext, warehouseId: string, count: number): Product[] {
  return ctx.db.products
    .map((product) => ({
      product,
      score: ctx.lots.available(product.id, warehouseId) + ctx.rng.int(0, 25),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map((entry) => entry.product)
}

// ===== فواتير البيع =====

function createSaleInvoice(ctx: SeedContext, when: Date): void {
  const lines = draftInvoiceLines(ctx)
  if (lines.length === 0) return

  const invoiceId = ctx.rng.id()
  const createdAt = when.toISOString()
  let gross = 0

  for (const line of lines) {
    const itemId = ctx.rng.id()
    const usages = ctx.lots.consume(line.product.id, line.warehouseId, line.quantity * line.factor)
    const total = lineTotal(line.quantity, line.unitPrice)
    gross += total

    ctx.db.sales_invoice_items.push({
      id: itemId,
      invoice_id: invoiceId,
      product_id: line.product.id,
      warehouse_id: line.warehouseId,
      quantity: line.quantity,
      unit_name: line.unitName,
      unit_price: line.unitPrice,
      line_total: total,
      actual_cost: round2(usages.reduce((sum, u) => sum + u.quantity * u.unitCost, 0)),
    })
    for (const usage of usages) {
      ctx.db.sale_item_lot_usage.push({
        id: ctx.rng.id(),
        lot_id: usage.lotId,
        sale_invoice_item_id: itemId,
        quantity: usage.quantity,
        unit_cost: usage.unitCost,
        created_at: createdAt,
      })
    }
  }

  const customer = ctx.rng.chance(0.55) ? ctx.rng.pick(ctx.db.customers) : null
  const discount = ctx.rng.chance(0.18) ? Math.round(gross * 0.05) : 0
  const total = round2(gross - discount)
  // العميل النقدي بيدفع كامل، والعميل المسجّل ممكن يدفع جزء أو يأجّل
  const paid = customer ? pickPaidAmount(ctx, total) : total
  const status: PaymentStatus = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid'

  ctx.db.sales_invoices.push({
    id: invoiceId,
    invoice_number: `S-${padNumber(ctx.db.sales_invoices.length + 1, 6)}`,
    warehouse_id: lines[0].warehouseId,
    customer_id: customer?.id ?? null,
    customer_name: !customer && ctx.rng.chance(0.6) ? ctx.rng.pick(CASH_CUSTOMER_NAMES) : null,
    discount_amount: discount,
    total_amount: total,
    paid_amount: paid,
    payment_status: status,
    created_at: createdAt,
    created_by: ctx.rng.chance(0.5) ? ctx.demoUserId : ctx.salesUserId,
  })

  if (customer) addToCustomerBalance(ctx, customer.id, total - paid)
}

function pickPaidAmount(ctx: SeedContext, total: number): number {
  const roll = ctx.rng.next()
  if (roll < 0.3) return total
  if (roll < 0.75) return round2(total * (ctx.rng.int(30, 70) / 100))
  return 0
}

function draftInvoiceLines(ctx: SeedContext): DraftLine[] {
  const lines: DraftLine[] = []
  const usedProductIds = new Set<string>()
  const lineCount = ctx.rng.int(1, 4)

  for (let i = 0; i < lineCount; i++) {
    const line = draftLine(ctx, usedProductIds)
    if (line) {
      lines.push(line)
      usedProductIds.add(line.product.id)
    }
  }
  return lines
}

function draftLine(ctx: SeedContext, usedProductIds: Set<string>): DraftLine | null {
  const sellable = ctx.db.products.filter(
    (p) => !usedProductIds.has(p.id) && totalAvailable(ctx, p.id) > 0
  )
  if (sellable.length === 0) return null

  const product = pickWeighted(ctx, sellable)
  const warehouseId = pickWarehouseWithStock(ctx, product.id)
  const available = ctx.lots.available(product.id, warehouseId)

  const cartonSize = ctx.cartonSizes.get(product.id)
  if (cartonSize && available >= cartonSize && ctx.rng.chance(0.15)) {
    return {
      product, warehouseId, quantity: 1, factor: cartonSize, unitName: CARTON_UNIT_NAME,
      // سعر الكرتونة أقل شوية من مجموع قطعها (خصم الكمية)
      unitPrice: round2(product.sale_price * cartonSize * 0.95),
    }
  }

  const [min, max] = saleQuantityRange(product.sale_price)
  return {
    product, warehouseId, factor: 1, unitName: BASE_UNIT_NAME, unitPrice: product.sale_price,
    quantity: Math.min(available, ctx.rng.int(min, max)),
  }
}

function totalAvailable(ctx: SeedContext, productId: string): number {
  return ctx.lots.available(productId, ctx.mainWarehouseId) + ctx.lots.available(productId, ctx.branchWarehouseId)
}

function pickWarehouseWithStock(ctx: SeedContext, productId: string): string {
  const main = ctx.lots.available(productId, ctx.mainWarehouseId)
  const branch = ctx.lots.available(productId, ctx.branchWarehouseId)
  if (main > 0 && branch > 0) return ctx.rng.chance(0.75) ? ctx.mainWarehouseId : ctx.branchWarehouseId
  return main > 0 ? ctx.mainWarehouseId : ctx.branchWarehouseId
}

function pickWeighted(ctx: SeedContext, products: Product[]): Product {
  const weights = products.map((p) => ctx.productWeights.get(p.id) ?? 1)
  let roll = ctx.rng.next() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < products.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return products[i]
  }
  return products[products.length - 1]
}

// ===== المرتجعات =====

function createSalesReturn(ctx: SeedContext, when: Date, returnedItemIds: Set<string>): void {
  const oneDayMs = 24 * 60 * 60 * 1000
  const invoicesById = new Map(ctx.db.sales_invoices.map((inv) => [inv.id, inv]))
  const eligible = ctx.db.sales_invoice_items.filter((item) => {
    const invoice = invoicesById.get(item.invoice_id)
    return !returnedItemIds.has(item.id) && invoice !== undefined &&
      when.getTime() - new Date(invoice.created_at).getTime() > oneDayMs
  })
  if (eligible.length === 0) return

  const item = ctx.rng.pick(eligible)
  const invoice = invoicesById.get(item.invoice_id)
  if (!invoice) return
  returnedItemIds.add(item.id)

  const factor = item.unit_name === CARTON_UNIT_NAME ? ctx.cartonSizes.get(item.product_id) ?? 1 : 1
  const quantity = 1
  const costPerUnit = item.actual_cost / item.quantity
  // قيمة المرتجع بعد نصيبه من خصم الفاتورة، زي ما بيتحسب في النظام الحقيقي
  const total = round2(item.unit_price * quantity * netRatio(invoice.total_amount, invoice.discount_amount))
  const costAmount = round2(costPerUnit * quantity)
  // العميل النقدي بياخد فلوسه فورًا، والعميل المسجّل بتتخصم من رصيده
  const cashRefund = invoice.customer_id ? 0 : total
  const returnId = ctx.rng.id()
  const createdAt = when.toISOString()

  ctx.db.sales_returns.push({
    id: returnId,
    sales_invoice_id: invoice.id,
    customer_id: invoice.customer_id,
    total_amount: total,
    cash_refund: cashRefund,
    cost_amount: costAmount,
    notes: ctx.rng.pick(RETURN_REASONS),
    created_at: createdAt,
    created_by: ctx.demoUserId,
  })
  ctx.db.sales_return_items.push({
    id: ctx.rng.id(),
    return_id: returnId,
    product_id: item.product_id,
    warehouse_id: item.warehouse_id,
    unit_name: item.unit_name,
    quantity,
    unit_price: item.unit_price,
    line_total: lineTotal(quantity, item.unit_price),
    cost_amount: costAmount,
  })
  ctx.lots.add({
    id: ctx.rng.id(),
    product_id: item.product_id,
    warehouse_id: item.warehouse_id,
    source_type: 'return',
    source_id: returnId,
    unit_cost: round2(costPerUnit / factor),
    quantity_received: quantity * factor,
    quantity_remaining: quantity * factor,
    default_sale_price: null,
    created_at: createdAt,
  })

  if (invoice.customer_id) addToCustomerBalance(ctx, invoice.customer_id, -total + cashRefund)
}

// ===== تحصيل من العملاء =====

function createCustomerPayment(ctx: SeedContext, when: Date): void {
  const debtors = ctx.db.customers.filter((c) => (ctx.customerBalances.get(c.id) ?? 0) > 100)
  if (debtors.length === 0) return

  const customer = ctx.rng.pick(debtors)
  const balance = round2(ctx.customerBalances.get(customer.id) ?? 0)
  const partial = Math.max(50, Math.round((balance * ctx.rng.int(30, 70)) / 100 / 10) * 10)
  const amount = ctx.rng.chance(0.4) ? balance : Math.min(balance, partial)

  ctx.db.payments.push({
    id: ctx.rng.id(),
    party_type: 'customer',
    party_id: customer.id,
    direction: 'in',
    amount,
    notes: ctx.rng.pick(PAYMENT_NOTES),
    related_invoice_id: null,
    created_at: when.toISOString(),
    created_by: ctx.demoUserId,
  })
  addToCustomerBalance(ctx, customer.id, -amount)
}

function addToCustomerBalance(ctx: SeedContext, customerId: string, delta: number): void {
  ctx.customerBalances.set(customerId, round2((ctx.customerBalances.get(customerId) ?? 0) + delta))
}
