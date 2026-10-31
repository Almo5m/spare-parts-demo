// دفاتر الدفعات (Lots) للمخزون الوهمي: كل دخول للمخزن بيتسجل كدفعة،
// وكل بيع بيسحب من أقدم دفعة الأول (FIFO) زي النظام الحقيقي بالظبط،
// فالتكلفة والربح في الأرقام الوهمية بيطلعوا منطقيين ومتسقين.

import type { TableRow } from './types'

type Lot = TableRow<'inventory_lots'>

export interface LotUsage {
  lotId: string
  quantity: number
  unitCost: number
}

export class LotBook {
  readonly lots: Lot[] = []

  add(lot: Lot): void {
    this.lots.push(lot)
  }

  // الدفعات بتتضاف بترتيب زمني، فترتيب المصفوفة هو ترتيب الأقدم أولًا
  private openLots(productId: string, warehouseId: string): Lot[] {
    return this.lots.filter(
      (l) => l.product_id === productId && l.warehouse_id === warehouseId && l.quantity_remaining > 0
    )
  }

  available(productId: string, warehouseId: string): number {
    return this.openLots(productId, warehouseId).reduce((sum, l) => sum + l.quantity_remaining, 0)
  }

  // بيسحب الكمية من الأقدم للأحدث، ويرجّع كل دفعة اتسحب منها وبكام
  consume(productId: string, warehouseId: string, quantity: number): LotUsage[] {
    const usages: LotUsage[] = []
    let left = quantity
    for (const lot of this.openLots(productId, warehouseId)) {
      if (left <= 0) break
      const taken = Math.min(lot.quantity_remaining, left)
      lot.quantity_remaining -= taken
      left -= taken
      usages.push({ lotId: lot.id, quantity: taken, unitCost: lot.unit_cost })
    }
    return usages
  }
}
