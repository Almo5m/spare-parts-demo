// بيحدد إزاي جدول بيرتبط بجدول تاني في الـ select المتداخل
// (مثلًا بنود الفاتورة -> الفاتورة عن طريق invoice_id).
//
// القاعدة العامة: اسم الجدول المرتبط بصيغة الجمع + _id في الصف الأساسي
// (products -> product_id). الاستثناءات اللي الاسم فيها مختلف متسجلة تحت.

export interface Relation {
  table: string
  // العمود في الصف الأساسي اللي بيشاور على id الصف المرتبط
  localKey: string
}

const SPECIAL_RELATIONS: Record<string, Record<string, Relation>> = {
  sales_invoice_items: {
    sales_invoices: { table: 'sales_invoices', localKey: 'invoice_id' },
  },
  sales_returns: {
    sales_invoices: { table: 'sales_invoices', localKey: 'sales_invoice_id' },
  },
  sales_return_items: {
    sales_returns: { table: 'sales_returns', localKey: 'return_id' },
  },
  order_return_items: {
    order_returns: { table: 'order_returns', localKey: 'return_id' },
  },
  sale_item_lot_usage: {
    sales_invoice_items: { table: 'sales_invoice_items', localKey: 'sale_invoice_item_id' },
    inventory_lots: { table: 'inventory_lots', localKey: 'lot_id' },
  },
}

export function resolveRelation(table: string, embedName: string): Relation | null {
  const special = SPECIAL_RELATIONS[table]?.[embedName]
  if (special) return special
  if (!embedName.endsWith('s')) return null
  return { table: embedName, localKey: `${embedName.slice(0, -1)}_id` }
}
