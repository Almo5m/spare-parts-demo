// مولّد أرقام عشوائية ثابت (نفس البذرة = نفس البيانات)، عشان النسخة التجريبية
// تظهر بنفس الشكل كل مرة تتفتح فيها، من غير ما نحتاج ملفات بيانات جاهزة.

export interface Random {
  next: () => number
  int: (min: number, max: number) => number
  pick: <T>(items: readonly T[]) => T
  chance: (probability: number) => boolean
  id: () => string
}

export function createRandom(seed: number): Random {
  let state = seed >>> 0

  // mulberry32: بسيط وسريع وكفاية جدًا لبيانات تجريبية
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))
  const hex = (digits: number) =>
    Array.from({ length: digits }, () => int(0, 15).toString(16)).join('')

  return {
    next,
    int,
    pick: (items) => items[int(0, items.length - 1)],
    chance: (probability) => next() < probability,
    // شكل UUID عشان الروابط والمعرّفات تبان زي الحقيقية
    id: () => `${hex(8)}-${hex(4)}-4${hex(3)}-8${hex(3)}-${hex(12)}`,
  }
}
