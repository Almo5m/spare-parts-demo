// نقطة الدخول لتوليد قاعدة البيانات الوهمية بالكامل في الذاكرة.
// بتتنفذ مرة واحدة وقت فتح الموقع، وأي تحديث للصفحة بيرجّع البيانات لأصلها.

import { DEMO_USER_ID } from '../demoConfig'
import { LotBook } from './lotBook'
import { createRandom } from './random'
import { seedCompanySettings, seedReferenceData } from './referenceData'
import { seedOpeningStock, simulateActivity } from './simulation'
import {
  applyCustomerBalances, seedActivityLog, seedInventoryRows, seedNotifications, seedStocktakes,
} from './derivedData'
import { createEmptyDatabase, type DemoDatabase, type SeedContext } from './types'

const SEED = 20260101

export function buildDemoDatabase(now: Date = new Date()): DemoDatabase {
  const rng = createRandom(SEED)
  const ctx: SeedContext = {
    rng,
    now,
    db: createEmptyDatabase(),
    lots: new LotBook(),
    mainWarehouseId: rng.id(),
    branchWarehouseId: rng.id(),
    cartonSizes: new Map(),
    unitCosts: new Map(),
    customerBalances: new Map(),
    productWeights: new Map(),
    demoUserId: DEMO_USER_ID,
    salesUserId: rng.id(),
  }

  seedReferenceData(ctx)
  seedOpeningStock(ctx)
  simulateActivity(ctx)

  seedInventoryRows(ctx)
  applyCustomerBalances(ctx)
  seedStocktakes(ctx)
  seedActivityLog(ctx)
  seedNotifications(ctx)
  seedCompanySettings(ctx)

  return ctx.db
}
