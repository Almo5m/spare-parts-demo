// إعدادات النسخة التجريبية في مكان واحد: المستخدم الوهمي، ورسائل منع الحفظ،
// وشرح اللي كانت كل عملية هتعمله في النسخة الحقيقية.

export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001'
export const DEMO_USER_EMAIL = 'demo@example.com'

// عدد الأيام اللي بيتولّد ليها نشاط وهمي (مبيعات وطلبيات ومرتجعات) لحد النهارده
export const DEMO_HISTORY_DAYS = 75

export const WRITE_BLOCKED_MESSAGE =
  'نسخة تجريبية للتصفح فقط: التعديل والحفظ غير متاحين هنا.'

export const USER_MANAGEMENT_BLOCKED_MESSAGE =
  'نسخة تجريبية: إدارة المستخدمين معطّلة. في النسخة الحقيقية بتتم عبر دالة سيرفر آمنة.'

// عمليات بتتنادى في الخلفية وبتعدّي بصمت من غير ما نعرض رسالة للزائر
export const SILENT_RPCS = new Set(['log_activity', 'cleanup_old_notifications'])

const DEMO_PREFIX = 'نسخة تجريبية: '

// الرسالة بتظهر مكان الخطأ في الواجهة، فبنستغلها نشرح فيها اللي كان هيحصل فعلًا
export const RPC_EXPLANATIONS: Record<string, string> = {
  create_sale_invoice:
    DEMO_PREFIX + 'في النسخة الحقيقية الفاتورة بتتحفظ، والمخزون بيتخصم من أقدم دفعة (FIFO)، ورصيد العميل بيتحدّث.',
  create_order:
    DEMO_PREFIX + 'في النسخة الحقيقية الطلبية بتتسجل وبيتفتح لها دفعة جديدة في المخزن بتكلفتها.',
  create_sales_return:
    DEMO_PREFIX + 'في النسخة الحقيقية المرتجع بيرجّع الكمية للمخزن ويخصم قيمته من رصيد العميل.',
  create_order_return:
    DEMO_PREFIX + 'في النسخة الحقيقية مرتجع الطلبية بيخصم الكمية من المخزن بنفس تكلفتها.',
  void_sale_invoice:
    DEMO_PREFIX + 'في النسخة الحقيقية الإلغاء بيرجّع المخزون ويعدّل رصيد العميل، وبتتحفظ لقطة من الفاتورة الملغاة.',
  void_order:
    DEMO_PREFIX + 'في النسخة الحقيقية إلغاء الطلبية بيشيل دفعتها من المخزن (لو لسه ما اتباعش منها).',
  record_payment:
    DEMO_PREFIX + 'في النسخة الحقيقية الدفعة بتتسجل وبتنقص من مديونية العميل.',
  apply_stocktake:
    DEMO_PREFIX + 'في النسخة الحقيقية الجرد بيعدّل أرصدة المخزن للكميات المعدودة ويسجّل الفروقات.',
  set_default_warehouse:
    DEMO_PREFIX + 'في النسخة الحقيقية المخزن ده بيبقى الافتراضي في شاشة البيع.',
  set_invoice_numbering:
    DEMO_PREFIX + 'في النسخة الحقيقية الترقيم بيتغيّر مع حماية من تكرار الأرقام.',
}
