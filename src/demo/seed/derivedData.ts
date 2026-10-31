// بيانات بتتحسب من نتيجة المحاكاة بعد ما تخلص: أرصدة المخزون، أرصدة العملاء،
// جردات سابقة، سجل العمليات، والإشعارات.

import { round2 } from '../../lib/money'
import { daysAgoAt } from './timeHelpers'
import type { SeedContext, TableRow } from './types'

export function seedInventoryRows(ctx: SeedContext): void {
  const quantities = new Map<string, number>()
  for (const lot of ctx.lots.lots) {
    const key = `${lot.product_id}|${lot.warehouse_id}`
    quantities.set(key, (quantities.get(key) ?? 0) + lot.quantity_remaining)
  }
  for (const [key, quantity] of quantities) {
    const [productId, warehouseId] = key.split('|')
    ctx.db.inventory.push({
      product_id: productId, warehouse_id: warehouseId, quantity, updated_at: ctx.now.toISOString(),
    })
  }
  ctx.db.inventory_lots.push(...ctx.lots.lots)
}

export function applyCustomerBalances(ctx: SeedContext): void {
  for (const customer of ctx.db.customers) {
    customer.balance = round2(ctx.customerBalances.get(customer.id) ?? 0)
  }
}

export function seedStocktakes(ctx: SeedContext): void {
  const plans = [
    { warehouseId: ctx.mainWarehouseId, daysAgo: 40, itemCount: 6, notes: 'جرد شهري' },
    { warehouseId: ctx.branchWarehouseId, daysAgo: 15, itemCount: 4, notes: null },
  ]
  for (const plan of plans) {
    const stocktakeId = ctx.rng.id()
    ctx.db.stocktakes.push({
      id: stocktakeId,
      warehouse_id: plan.warehouseId,
      notes: plan.notes,
      created_at: daysAgoAt(ctx.now, plan.daysAgo, 17, 0).toISOString(),
      created_by: ctx.demoUserId,
    })

    const rows = ctx.db.inventory.filter((r) => r.warehouse_id === plan.warehouseId).slice(0, plan.itemCount)
    for (const row of rows) {
      const counted = Math.max(0, row.quantity + ctx.rng.int(-2, 1))
      ctx.db.stocktake_items.push({
        id: ctx.rng.id(),
        stocktake_id: stocktakeId,
        product_id: row.product_id,
        system_quantity: row.quantity,
        counted_quantity: counted,
        difference: counted - row.quantity,
      })
    }
  }
}

type ActivityRow = TableRow<'activity_log'>

export function seedActivityLog(ctx: SeedContext): void {
  const userNames = new Map(ctx.db.users.map((u) => [u.id, u.full_name]))
  const entries: Omit<ActivityRow, 'id' | 'is_read'>[] = []
  const add = (action: string, createdAt: string, userId: string | null) =>
    entries.push({ action, created_at: createdAt, user_id: userId, user_name: userNames.get(userId ?? '') ?? null })

  for (const inv of ctx.db.sales_invoices) add(`إنشاء فاتورة بيع ${inv.invoice_number}`, inv.created_at, inv.created_by)
  for (const order of ctx.db.orders) add(`إنشاء طلبية شراء ${order.order_number}`, order.created_at, order.created_by)
  for (const ret of ctx.db.sales_returns) add('تسجيل مرتجع بيع', ret.created_at, ret.created_by)
  for (const pay of ctx.db.payments) add(`تحصيل دفعة ${pay.amount} من عميل`, pay.created_at, pay.created_by)
  for (let daysAgo = 0; daysAgo < 10; daysAgo++) {
    add('تسجيل دخول للنظام', daysAgoAt(ctx.now, daysAgo, 9, 30).toISOString(), ctx.demoUserId)
  }

  entries.sort((a, b) => b.created_at.localeCompare(a.created_at))
  // آخر 150 عملية بس كفاية للعرض، وأحدث 3 غير مقروءة عشان الإشعار يبان
  entries
    .filter((e) => e.created_at <= ctx.now.toISOString())
    .slice(0, 150)
    .forEach((entry, index) => {
      ctx.db.activity_log.push({ id: ctx.rng.id(), is_read: index >= 3, ...entry })
    })
}

export function seedNotifications(ctx: SeedContext): void {
  const productsById = new Map(ctx.db.products.map((p) => [p.id, p]))
  const warehousesById = new Map(ctx.db.warehouses.map((w) => [w.id, w]))

  const lowStock = ctx.db.inventory
    .map((row) => ({ row, product: productsById.get(row.product_id) }))
    .filter(({ row, product }) => product?.min_stock_alert != null && row.quantity <= (product.min_stock_alert ?? 0))
    .slice(0, 4)

  lowStock.forEach(({ row, product }, index) => {
    ctx.db.notifications.push({
      id: ctx.rng.id(),
      message: `نقص مخزون: «${product?.name ?? ''}» في «${warehousesById.get(row.warehouse_id)?.name ?? ''}» (المتبقي ${row.quantity})`,
      created_at: daysAgoAt(ctx.now, index, 8, 15).toISOString(),
      created_by: null,
    })
  })

  const topDebtor = [...ctx.db.customers].sort((a, b) => b.balance - a.balance)[0]
  if (topDebtor && topDebtor.balance > 0) {
    ctx.db.notifications.push({
      id: ctx.rng.id(),
      message: `مديونية العميل «${topDebtor.name}» وصلت ${topDebtor.balance}`,
      created_at: daysAgoAt(ctx.now, 1, 12, 0).toISOString(),
      created_by: null,
    })
  }
  ctx.db.notifications.sort((a, b) => b.created_at.localeCompare(a.created_at))
}
