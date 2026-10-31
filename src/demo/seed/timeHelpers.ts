// دوال تواريخ صغيرة مشتركة في توليد البيانات الوهمية.

export function daysAgoAt(now: Date, daysAgo: number, hour: number, minute: number): Date {
  const d = new Date(now)
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, minute, 0, 0)
  return d
}

// الجمعة إجازة تقريبًا في السوق المصري، فالمبيعات فيها أقل
export function isFriday(d: Date): boolean {
  return d.getDay() === 5
}

export function padNumber(n: number, width: number): string {
  return String(n).padStart(width, '0')
}
