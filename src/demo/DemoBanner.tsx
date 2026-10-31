// شريط ثابت أعلى الصفحة بيوضّح إن ده عرض تجريبي، وبيودّي لصفحة الشرح.

import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'

export default function DemoBanner() {
  return (
    <div className="no-print flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-accent/30 bg-accent/15 px-4 md:px-6 py-2 text-sm text-navy-900">
      <Info size={16} className="shrink-0 text-accent-dark" />
      <span>نسخة تجريبية للعرض: كل البيانات وهمية، والحفظ والتعديل متعطلين.</span>
      <Link to="/demo-guide" className="font-medium text-accent-dark hover:underline">
        جولة سريعة في النظام
      </Link>
    </div>
  )
}
