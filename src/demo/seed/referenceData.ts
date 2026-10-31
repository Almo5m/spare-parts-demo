// البيانات الأساسية الثابتة: مخازن، تصنيفات، أصناف، وحدات، عملاء، مستخدمين، إعدادات الشركة.
// الأرصدة والفواتير بتتولّد بعدها في simulation.ts.

import { round2 } from '../../lib/money'
import {
  BASE_UNIT_NAME, CARTON_UNIT_NAME, CATEGORY_NAMES, COMPANY_NAME, CUSTOMER_TEMPLATES,
  DEMO_USERS, PRODUCT_TEMPLATES, WAREHOUSE_NAMES,
} from './catalog'
import { DEMO_HISTORY_DAYS } from '../demoConfig'
import { daysAgoAt, padNumber } from './timeHelpers'
import type { SeedContext } from './types'

// تاريخ إنشاء البيانات الأساسية: قبل أول نشاط وهمي بفترة
const DEMO_DAYS_BEFORE_START = DEMO_HISTORY_DAYS + 20

// الأرقام دي وهمية بشكل واضح، عشان محدش يتصل برقم حقيقي بالغلط
function fakePhone(index: number): string {
  return `0100000${padNumber(index, 4)}`
}

export function seedReferenceData(ctx: SeedContext): void {
  seedUsers(ctx)
  seedWarehouses(ctx)
  const categoryIds = seedCategories(ctx)
  seedProducts(ctx, categoryIds)
  seedCustomers(ctx)
}

function seedUsers(ctx: SeedContext): void {
  const createdAt = daysAgoAt(ctx.now, DEMO_DAYS_BEFORE_START, 9, 0).toISOString()
  const ids = [ctx.demoUserId, ctx.salesUserId, ctx.rng.id()]
  DEMO_USERS.forEach((u, i) => {
    ctx.db.users.push({
      id: ids[i],
      full_name: u.full_name,
      username: u.username,
      role: u.role,
      phone: i === 0 ? fakePhone(1) : null,
      is_active: true,
      default_warehouse_id: null,
      created_at: createdAt,
    })
  })
}

function seedWarehouses(ctx: SeedContext): void {
  const createdAt = daysAgoAt(ctx.now, DEMO_DAYS_BEFORE_START, 9, 5).toISOString()
  ctx.db.warehouses.push(
    {
      id: ctx.mainWarehouseId, name: WAREHOUSE_NAMES.main, address: 'القاهرة',
      is_active: true, is_default: true, created_at: createdAt,
    },
    {
      id: ctx.branchWarehouseId, name: WAREHOUSE_NAMES.branch, address: 'الجيزة',
      is_active: true, is_default: false,
      created_at: daysAgoAt(ctx.now, DEMO_DAYS_BEFORE_START, 9, 6).toISOString(),
    }
  )
}

function seedCategories(ctx: SeedContext): Map<string, string> {
  const ids = new Map<string, string>()
  for (const name of CATEGORY_NAMES) {
    const id = ctx.rng.id()
    ids.set(name, id)
    ctx.db.categories.push({ id, name })
  }
  return ids
}

function seedProducts(ctx: SeedContext, categoryIds: Map<string, string>): void {
  PRODUCT_TEMPLATES.forEach((template, index) => {
    const id = ctx.rng.id()
    // التكلفة بين 62% و78% من سعر البيع، بثبات لكل صنف عشان الأرباح تبان منطقية
    const unitCost = round2(template.salePrice * (0.62 + ctx.rng.next() * 0.16))
    ctx.unitCosts.set(id, unitCost)
    // الأصناف الأكتر طلبًا (ذات الأسعار الصغيرة غالبًا) ليها وزن بيع أعلى
    ctx.productWeights.set(id, 1 / Math.pow(index + 1, 0.45))

    ctx.db.products.push({
      id,
      part_number: `P-${padNumber(index + 1, 5)}`,
      name: template.name,
      barcode: ctx.rng.chance(0.5) ? `6220${padNumber(ctx.rng.int(0, 99999999), 8)}` : null,
      category_id: categoryIds.get(template.category) ?? null,
      base_unit: BASE_UNIT_NAME,
      cost_price: unitCost,
      sale_price: template.salePrice,
      min_stock_alert: template.minStock ?? null,
      is_active: true,
      created_at: daysAgoAt(ctx.now, DEMO_DAYS_BEFORE_START, 10, 0).toISOString(),
    })

    if (template.cartonSize) {
      ctx.cartonSizes.set(id, template.cartonSize)
      ctx.db.product_units.push({
        id: ctx.rng.id(), product_id: id, unit_name: CARTON_UNIT_NAME,
        conversion_factor: template.cartonSize, barcode: null,
      })
    }
  })
}

function seedCustomers(ctx: SeedContext): void {
  const createdAt = daysAgoAt(ctx.now, DEMO_DAYS_BEFORE_START, 11, 0).toISOString()
  CUSTOMER_TEMPLATES.forEach((c, i) => {
    const id = ctx.rng.id()
    ctx.customerBalances.set(id, 0)
    ctx.db.customers.push({
      id, name: c.name, address: c.address, phone: fakePhone(100 + i), balance: 0, created_at: createdAt,
    })
  })
}

export function seedCompanySettings(ctx: SeedContext): void {
  const nextSale = ctx.db.sales_invoices.length + 1
  const nextOrder = ctx.db.orders.length + 1
  ctx.db.company_settings.push({
    id: true,
    company_name: COMPANY_NAME,
    phone: fakePhone(1),
    invoice_footer_message: 'شكرًا لتعاملكم معنا. هذه فاتورة من نسخة تجريبية.',
    logo_data_url: null,
    next_sales_invoice_number: nextSale,
    next_order_number: nextOrder,
    notify_low_stock: true,
    notify_debts: true,
  })
}
