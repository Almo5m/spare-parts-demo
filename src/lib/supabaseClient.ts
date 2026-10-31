// النسخة التجريبية: بدل الاتصال بـ Supabase الحقيقي، الموقع بيشتغل على قاعدة بيانات
// وهمية بتتولّد في الذاكرة وقت فتح الصفحة (بيانات وهمية بالكامل، من غير أي اتصال بالإنترنت).
// باقي الصفحات بتستورد `supabase` من هنا زي ما هي من غير أي تعديل.

import { createMockSupabase } from '../demo/mockClient/createMockSupabase'
import { buildDemoDatabase } from '../demo/seed/buildDemoDatabase'

export const supabase = createMockSupabase(buildDemoDatabase())
