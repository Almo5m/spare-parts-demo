// أنواع البيانات الوهمية: نفس شكل صفوف قاعدة البيانات الحقيقية،
// فأي عمود ناقص أو غلط يتكشف وقت الـ build مش وقت التشغيل.

import type { Database } from '../../lib/database.types'
import type { Random } from './random'
import type { LotBook } from './lotBook'

export type TableName = keyof Database['public']['Tables']
export type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row']
export type DemoDatabase = { [T in TableName]: TableRow<T>[] }

// كل الأدوات المشتركة بين خطوات توليد البيانات
export interface SeedContext {
  rng: Random
  now: Date
  db: DemoDatabase
  lots: LotBook
  mainWarehouseId: string
  branchWarehouseId: string
  // عدد القطع في الكرتونة لكل صنف بيتباع بالكرتونة
  cartonSizes: Map<string, number>
  // تكلفة القطعة الواحدة لكل صنف
  unitCosts: Map<string, number>
  // رصيد كل عميل بيتحدّث مع كل فاتورة ودفعة ومرتجع (موجب = عليه فلوس)
  customerBalances: Map<string, number>
  // أصناف أكتر طلبًا بتتباع أكتر (وزن لكل صنف)
  productWeights: Map<string, number>
  demoUserId: string
  salesUserId: string
}

export function createEmptyDatabase(): DemoDatabase {
  return {
    activity_log: [], audit_log: [], cancelled_documents: [], car_models: [],
    categories: [], company_settings: [], customers: [], inventory: [],
    inventory_lots: [], inventory_movements: [], notifications: [],
    order_items: [], order_return_items: [], order_returns: [], orders: [],
    payments: [], product_car_compatibility: [], product_units: [], products: [],
    sale_item_lot_usage: [], sales_invoice_items: [], sales_invoices: [],
    sales_return_items: [], sales_returns: [], stocktake_items: [], stocktakes: [],
    treasury_transactions: [], users: [], warehouse_transfer_items: [],
    warehouse_transfers: [], warehouses: [],
  }
}
