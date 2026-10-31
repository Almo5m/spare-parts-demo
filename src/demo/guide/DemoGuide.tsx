// صفحة «جولة سريعة»: شرح بسيط لكل جزء في النظام بدل الاستخدام الفعلي،
// مع روابط تفتح الصفحة الحقيقية وتتصفح بياناتها الوهمية.

import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { GUIDE_SECTIONS, TECH_NOTES, TRY_IT_STEPS } from './guideContent'

export default function DemoGuide() {
  return (
    <div className="page-enter p-4 md:p-6 max-w-5xl mx-auto">
      <h1 className="font-display text-xl md:text-2xl font-bold text-navy-900 mb-2">جولة سريعة في النظام</h1>
      <p className="text-slate-600 leading-relaxed mb-6 max-w-3xl">
        ده نظام لإدارة مخزن قطع غيار سيارات: أكتر من مخزن، بيع وشراء بنظام الدفعات، عملاء وديون،
        مرتجعات، وتقارير. النسخة دي للعرض بس: كل البيانات وهمية، والتصفح مفتوح، لكن الحفظ والتعديل
        متعطلين، وأي ضغطة على «حفظ» بتظهر رسالة بتشرح اللي كان هيحصل في النسخة الحقيقية.
        البيانات بترجع لأصلها مع كل تحديث للصفحة.
      </p>

      <section className="card p-5 md:p-6 mb-6">
        <h2 className="font-display font-bold text-navy-900 mb-3">جرّب بنفسك</h2>
        <ol className="space-y-2">
          {TRY_IT_STEPS.map((step, index) => (
            <li key={step.to} className="flex items-start gap-3">
              <span className="font-mono-data mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs text-white">
                {index + 1}
              </span>
              <Link to={step.to} className="text-navy-900 hover:text-accent-dark hover:underline">
                {step.label}
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <h2 className="font-display font-bold text-navy-900 mb-3">أجزاء النظام</h2>
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        {GUIDE_SECTIONS.map((section) => (
          <article key={section.to} className="card p-5 flex flex-col">
            <h3 className="font-display font-bold text-navy-900 mb-1.5">{section.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{section.summary}</p>
            {section.onSave && (
              <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-sm text-navy-800 leading-relaxed">
                <span className="font-medium">عند الحفظ في النسخة الحقيقية: </span>
                {section.onSave}
              </p>
            )}
            <Link
              to={section.to}
              className="mt-4 inline-flex items-center gap-1.5 self-start text-sm font-medium text-accent-dark hover:underline"
            >
              افتح الصفحة
              <ArrowLeft size={14} />
            </Link>
          </article>
        ))}
      </div>

      <section className="card p-5 md:p-6">
        <h2 className="font-display font-bold text-navy-900 mb-3">من جوه النظام</h2>
        <ul className="space-y-2 text-sm text-slate-600 leading-relaxed list-disc pr-5">
          {TECH_NOTES.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-slate-500">
          النسخة التجريبية دي بتشتغل بالكامل في المتصفح من غير سيرفر أو قاعدة بيانات.
        </p>
      </section>
    </div>
  )
}
