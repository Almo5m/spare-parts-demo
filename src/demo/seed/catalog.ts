// البيانات الثابتة للنسخة التجريبية: أصناف وعملاء وأسماء وهمية بالكامل.
// مفيش هنا أي اسم عميل حقيقي أو منتج من بيانات فعلية.

export const CATEGORY_NAMES = [
  'فلاتر', 'فرامل', 'تعليق وعفشة', 'كهرباء',
  'إضاءة', 'زيوت وسوائل', 'محرك', 'هيكل وإكسسوارات',
] as const

export type CategoryName = (typeof CATEGORY_NAMES)[number]

export interface ProductTemplate {
  name: string
  category: CategoryName
  salePrice: number
  // لو الصنف بيتباع بالكرتونة: كام قطعة في الكرتونة
  cartonSize?: number
  // حد التنبيه لنقص المخزون (غير محدد = بدون تنبيه)
  minStock?: number
}

export const PRODUCT_TEMPLATES: readonly ProductTemplate[] = [
  { name: 'فلتر زيت كورولا', category: 'فلاتر', salePrice: 85, minStock: 15 },
  { name: 'فلتر هواء كورولا', category: 'فلاتر', salePrice: 120, minStock: 10 },
  { name: 'فلتر بنزين لانسر', category: 'فلاتر', salePrice: 95, minStock: 10 },
  { name: 'فلتر مكيف النترا', category: 'فلاتر', salePrice: 140, minStock: 8 },
  { name: 'فلتر زيت سيراتو', category: 'فلاتر', salePrice: 80, minStock: 15 },
  { name: 'فلتر هواء سنترا', category: 'فلاتر', salePrice: 110, minStock: 10 },

  { name: 'طقم تيل فرامل أمامي كورولا', category: 'فرامل', salePrice: 420, minStock: 6 },
  { name: 'طقم تيل فرامل خلفي لانسر', category: 'فرامل', salePrice: 360, minStock: 6 },
  { name: 'قرص فرامل أمامي النترا', category: 'فرامل', salePrice: 650, minStock: 4 },
  { name: 'طمبورة فرامل خلفي لوجان', category: 'فرامل', salePrice: 520, minStock: 4 },
  { name: 'سلك فرامل يد سيراتو', category: 'فرامل', salePrice: 150 },
  { name: 'خرطوم فرامل أمامي سنترا', category: 'فرامل', salePrice: 130 },

  { name: 'مساعد أمامي كورولا', category: 'تعليق وعفشة', salePrice: 980, minStock: 4 },
  { name: 'مساعد خلفي لانسر', category: 'تعليق وعفشة', salePrice: 760, minStock: 4 },
  { name: 'مفصلة عفشة سفلية النترا', category: 'تعليق وعفشة', salePrice: 310, minStock: 6 },
  { name: 'بلية كاوتش عفشة سيراتو', category: 'تعليق وعفشة', salePrice: 90 },
  { name: 'رولمان عجلة أمامي لوجان', category: 'تعليق وعفشة', salePrice: 270, minStock: 6 },
  { name: 'طقم كراسي مساعد سنترا', category: 'تعليق وعفشة', salePrice: 340 },

  { name: 'بوجيه كورولا (طقم 4)', category: 'كهرباء', salePrice: 260, cartonSize: 10, minStock: 10 },
  { name: 'كويل إشعال لانسر', category: 'كهرباء', salePrice: 450, minStock: 5 },
  { name: 'دينامو شحن النترا', category: 'كهرباء', salePrice: 2100, minStock: 2 },
  { name: 'بطارية 70 أمبير', category: 'كهرباء', salePrice: 2600, minStock: 3 },
  { name: 'حساس أكسجين سيراتو', category: 'كهرباء', salePrice: 880, minStock: 3 },
  { name: 'سلف سنترا', category: 'كهرباء', salePrice: 1900, minStock: 2 },

  { name: 'فانوس أمامي يمين كورولا', category: 'إضاءة', salePrice: 1500, minStock: 2 },
  { name: 'فانوس أمامي شمال كورولا', category: 'إضاءة', salePrice: 1500, minStock: 2 },
  { name: 'فانوس خلفي يمين لانسر', category: 'إضاءة', salePrice: 640, minStock: 3 },
  { name: 'لمبة H4 زنون', category: 'إضاءة', salePrice: 90, cartonSize: 10, minStock: 20 },
  { name: 'كشاف ضباب النترا', category: 'إضاءة', salePrice: 520 },
  { name: 'لمبة ليد مؤشر داخلي', category: 'إضاءة', salePrice: 35, cartonSize: 50 },

  { name: 'زيت محرك 5W-30 لتر', category: 'زيوت وسوائل', salePrice: 210, cartonSize: 12, minStock: 24 },
  { name: 'زيت محرك 10W-40 أربعة لتر', category: 'زيوت وسوائل', salePrice: 780, cartonSize: 4, minStock: 8 },
  { name: 'زيت فتيس أوتوماتيك لتر', category: 'زيوت وسوائل', salePrice: 260, cartonSize: 12, minStock: 12 },
  { name: 'سائل تبريد أخضر أربعة لتر', category: 'زيوت وسوائل', salePrice: 190, cartonSize: 6, minStock: 12 },
  { name: 'زيت فرامل 500 مل', category: 'زيوت وسوائل', salePrice: 70, cartonSize: 24, minStock: 24 },
  { name: 'شحم عفشة 400 جم', category: 'زيوت وسوائل', salePrice: 85, cartonSize: 12 },

  { name: 'سير مواتير كورولا', category: 'محرك', salePrice: 380, minStock: 5 },
  { name: 'طقم جوانات محرك لانسر', category: 'محرك', salePrice: 1100, minStock: 3 },
  { name: 'طلمبة مياه النترا', category: 'محرك', salePrice: 720, minStock: 3 },
  { name: 'ثرموستات سيراتو', category: 'محرك', salePrice: 160, minStock: 6 },
  { name: 'طلمبة بنزين لوجان', category: 'محرك', salePrice: 850, minStock: 3 },
  { name: 'سير دينامو سنترا', category: 'محرك', salePrice: 210 },

  { name: 'ماسح زجاج أمامي 24 بوصة', category: 'هيكل وإكسسوارات', salePrice: 120, cartonSize: 12, minStock: 12 },
  { name: 'مرايا جانبية يمين كورولا', category: 'هيكل وإكسسوارات', salePrice: 900, minStock: 2 },
  { name: 'مقبض باب خارجي لانسر', category: 'هيكل وإكسسوارات', salePrice: 210 },
  { name: 'دعامة كبوت النترا', category: 'هيكل وإكسسوارات', salePrice: 140 },
  { name: 'غطاء خزان وقود سيراتو', category: 'هيكل وإكسسوارات', salePrice: 95 },
  { name: 'بخاخ مياه مساحات سنترا', category: 'هيكل وإكسسوارات', salePrice: 60 },
]

export const CARTON_UNIT_NAME = 'كرتونة'
export const BASE_UNIT_NAME = 'قطعة'

export const WAREHOUSE_NAMES = { main: 'المخزن الرئيسي', branch: 'مخزن الفرع' } as const

export const CUSTOMER_TEMPLATES = [
  { name: 'ورشة الأمل للسيارات', address: 'القاهرة - مدينة نصر' },
  { name: 'مركز النور لصيانة السيارات', address: 'الجيزة - الهرم' },
  { name: 'ورشة المعلم حسن', address: 'القاهرة - شبرا' },
  { name: 'كراج الأمانة', address: 'القاهرة - المرج' },
  { name: 'مركز الصفوة', address: 'الجيزة - فيصل' },
  { name: 'ورشة السلام', address: 'القليوبية - بنها' },
  { name: 'سيارات الدلتا للتجارة', address: 'الغربية - طنطا' },
  { name: 'ورشة الفتح', address: 'القاهرة - عين شمس' },
  { name: 'مركز التميز لقطع الغيار', address: 'الإسكندرية - سموحة' },
  { name: 'أحمد سمير (ميكانيكي)', address: null },
  { name: 'محمود فتحي', address: null },
  { name: 'عمرو إبراهيم', address: null },
] as const

// أسماء لعملاء نقديين (بيتكتب اسمهم على الفاتورة بعلامة «نقدي»)
export const CASH_CUSTOMER_NAMES = [
  'أستاذ كريم', 'م. هشام', 'أستاذ وليد', 'الحاج صبحي', 'أستاذ ياسر',
] as const

export const DEMO_USERS = [
  { full_name: 'مدير النظام (تجريبي)', username: 'demo', role: 'owner' },
  { full_name: 'مسؤول المبيعات', username: 'sales1', role: 'sales' },
  { full_name: 'المحاسب', username: 'accountant1', role: 'accountant' },
] as const

export const COMPANY_NAME = 'شركة النخبة لقطع الغيار (عرض تجريبي)'
