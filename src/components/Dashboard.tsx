import React from 'react';
import {
  FileText,
  Clock,
  AlertTriangle,
  Truck,
  CheckCircle2,
  TrendingUp,
  Building,
  ArrowRight,
  ShieldCheck,
  PackageCheck,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';
import { Order, UserRole } from '../types';

interface DashboardProps {
  orders: Order[];
  currentUserRole: UserRole;
  onSelectOrder: (order: Order) => void;
  onOpenCreate: () => void;
  onOpenOrders: () => void;
  onOpenSampleInvoice: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  orders,
  currentUserRole,
  onSelectOrder,
  onOpenCreate,
  onOpenOrders,
  onOpenSampleInvoice,
}) => {
  // Stats
  const totalOrders = orders.length;
  const pendingApprovals = orders.filter((o) => o.status.startsWith('PENDING')).length;
  const urgentOrders = orders.filter(
    (o) => (o.priority === 'URGENT' || o.priority === 'EMERGENCY') && o.status.startsWith('PENDING')
  );
  const inLogistics = orders.filter(
    (o) => o.status === 'APPROVED_FOR_PO' || o.status === 'PO_ISSUED'
  ).length;
  const completedOrders = orders.filter((o) => o.status === 'DELIVERED_RECEIVED').length;

  // Workflow stage counts
  const stage1Count = orders.length; // all created
  const stage2Count = orders.length; // auto-routed
  const stage3Count = pendingApprovals; // in approvals
  const stage4Count = inLogistics; // in PO / logistics
  const stage5Count = completedOrders; // received & stocked

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6" id="dashboard-view">
      {/* Welcome & Project Header */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 sm:p-7 shadow-xs border border-slate-800 relative overflow-hidden">
        {/* Subtle decorative gold ambient accent */}
        <div className="absolute top-0 left-0 w-96 h-48 bg-amber-500/10 blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <span className="bg-amber-500 text-slate-950 text-xs font-black px-2.5 py-0.5 rounded-md">
                نظام ERP الميداني المعتمد
              </span>
              <span className="text-slate-400 text-xs font-mono">
                مشروع الجكوب للتعدين (WDM Mining ERP)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              لوحة تحكم تدفق المشتريات والخدمات اللوجستية
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
              منظومة إلكترونية موحدة للمشتريات الميدانية مع توليد الأرقام المرجعية الذكية، وضبط المواصفات الفنية،
              وروابط المشاركة المباشرة لفرق العمل بالموقع.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenCreate}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 transition shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>تقديم طلب شراء جديد</span>
            </button>

            <button
              type="button"
              onClick={onOpenSampleInvoice}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs rounded-xl flex items-center gap-2 transition border border-slate-700 cursor-pointer"
              title="معاينة طلب فاتورة الجكوب WDM-MI26002"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>معاينة نموذج الفاتورة (WDM-MI26002)</span>
            </button>
          </div>
        </div>
      </div>

      {/* SLA Escalation Alert Banner */}
      {urgentOrders.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500 text-slate-950 rounded-xl shadow-2xs shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-950 flex items-center gap-2">
                  <span>تنبيه المتابعة الميدانية والطلبات العاجلة</span>
                  <span className="bg-amber-200/90 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                    {urgentOrders.length} طلب عاجل
                  </span>
                </h3>
                <p className="text-xs text-amber-900/80 mt-0.5 leading-relaxed">
                  هناك طلبات ميدانية مصنفة كـ "عاجل" أو "طارئ" تتطلب متابعة حثيثة لضمان استمرار أعمال الحفر واستخراج الخام بالمنجم.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenOrders}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-lg shrink-0 transition cursor-pointer"
            >
              استعراض الطلبات العاجلة ➔
            </button>
          </div>
        </div>
      )}

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Orders */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold">إجمالي الطلبات</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">{totalOrders}</div>
          <div className="text-[11px] text-slate-500 mt-1">كافة الفروع والمناجم</div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-blue-700 mb-2">
            <span className="text-xs font-bold">قيد الاعتمادات</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono text-blue-900">{pendingApprovals}</div>
          <div className="text-[11px] text-blue-600 mt-1">تتطلب توقيع ومراجعة</div>
        </div>

        {/* Urgent SLA Watch */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-bold">طلبات عاجلة (24h)</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-900">
            {urgentOrders.length}
          </div>
          <div className="text-[11px] text-amber-700 mt-1">أولوية تشغيلية قصوى</div>
        </div>

        {/* In Logistics / PO */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-indigo-700 mb-2">
            <span className="text-xs font-bold">قيد التوريد والشحن</span>
            <Truck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black font-mono text-indigo-900">{inLogistics}</div>
          <div className="text-[11px] text-indigo-600 mt-1">أوامر شراء قيد التنفيذ</div>
        </div>

        {/* Completed */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-bold">مستلم بالمستودع</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-900">{completedOrders}</div>
          <div className="text-[11px] text-emerald-600 mt-1">مطابقة وأرشفة مكتملة</div>
        </div>
      </div>

      {/* Visual Automated 5-Stage Logistics Workflow Pipeline */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900">
              مسار التدفق الرقمي للطلبات (Order & Procurement Workflow Stages)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              5 مراحل مؤتمتة تقضي تماماً على التباطؤ والورقيات من لحظة إنشاء الطلب حتى استلام الصنف بالمخزن
            </p>
          </div>
          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
            مؤتمت بالكامل 100%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {/* Stage 1 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/60 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center font-mono">
                1
              </span>
              <span className="text-xs font-mono font-bold text-slate-600">{stage1Count} مسجل</span>
            </div>
            <h4 className="text-xs font-bold text-slate-900">إنشاء الطلب الرقمي</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              توليد كود ذكي (WDM-MI26002) مع منع الحقول الفارغة واختيار من الكتالوج.
            </p>
          </div>

          {/* Stage 2 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/60 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center font-mono">
                2
              </span>
              <span className="text-xs font-mono font-bold text-blue-700">توجيه فوري</span>
            </div>
            <h4 className="text-xs font-bold text-slate-900">التحقق والتوجيه الآلي</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              توجيه آلي مباشر للمسؤول بحسب الموقع والقسم مع إشعارات فورية للعواجل.
            </p>
          </div>

          {/* Stage 3 */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50/70 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center font-mono">
                3
              </span>
              <span className="text-xs font-mono font-bold text-amber-700">{stage3Count} معلق</span>
            </div>
            <h4 className="text-xs font-bold text-slate-900">دورة الاعتمادات الثلاثية</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              رئيس القسم ➔ مدير الموقع ➔ المدير العام مع التوقيع الإلكتروني والـ SLA.
            </p>
          </div>

          {/* Stage 4 */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="w-6 h-6 rounded-full bg-indigo-700 text-white text-xs font-bold flex items-center justify-center font-mono">
                4
              </span>
              <span className="text-xs font-mono font-bold text-indigo-700">{stage4Count} صادر</span>
            </div>
            <h4 className="text-xs font-bold text-slate-900">أمر الشراء والتوريد</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              تحويل الطلب المعتمد إلى أمر شراء (PO) وإرساله للمورد وتتبع الشحن.
            </p>
          </div>

          {/* Stage 5 */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center font-mono">
                5
              </span>
              <span className="text-xs font-mono font-bold text-emerald-700">
                {stage5Count} منجز
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-900">الاستلام والمخزن</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              فحص ومطابقة الاستلام الميداني وتحديث رصيد المخزون وأرشفة الطلب.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Orders & Smart Code Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Active Orders */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">
              أحدث طلبات المشتريات الميدانية المسجلة
            </h3>
            <button
              type="button"
              onClick={onOpenOrders}
              className="text-xs font-bold text-amber-700 hover:text-amber-900 transition flex items-center gap-1"
            >
              <span>عرض كافة الطلبات</span>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>

          <div className="space-y-3">
            {orders.slice(0, 4).map((order) => (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order)}
                className="p-3.5 bg-slate-50 hover:bg-amber-50/50 border border-slate-200 rounded-xl cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black font-mono tracking-wider text-slate-900 text-sm">
                      {order.referenceNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        order.priority === 'EMERGENCY'
                          ? 'bg-rose-100 text-rose-800'
                          : order.priority === 'URGENT'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {order.priority === 'EMERGENCY'
                        ? 'طارئ'
                        : order.priority === 'URGENT'
                        ? 'عاجل (24h)'
                        : 'عادي'}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-600 font-medium">
                      [{order.siteCode}] منجم الجكوب
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-1 font-medium">
                    {order.purpose}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                    {order.status === 'PENDING_DEPT_HEAD'
                      ? 'بانتظار رئيس القسم'
                      : order.status === 'PENDING_SITE_MANAGER'
                      ? 'بانتظار مدير الموقع'
                      : order.status === 'PENDING_GENERAL_MANAGER'
                      ? 'بانتظار المدير العام'
                      : order.status === 'APPROVED_FOR_PO'
                      ? 'معتمد (جاهز لـ PO)'
                      : order.status === 'PO_ISSUED'
                      ? 'أمر شراء صادر'
                      : order.status === 'DELIVERED_RECEIVED'
                      ? 'مستلم بالمستودع'
                      : 'مرفوض'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{order.orderDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Smart Code Architecture Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-800 mb-2">
              <Building className="w-5 h-5" />
              <h3 className="text-sm font-black">هيكلية الرقم المرجعي الذكي</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              تطبيق صيغة الترقيم المعتمدة في استمارة الجكوب:
            </p>

            {/* Smart Code Visual Formula */}
            <div className="my-3 p-3 bg-slate-900 text-amber-300 rounded-xl font-mono text-center text-xs font-bold border border-amber-500/30">
              [الموقع]-[القسم][السنة][التسلسل]
              <div className="text-white text-base font-black tracking-widest mt-1">
                WDM-MI26002
              </div>
            </div>

            <div className="text-xs space-y-1.5 text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-800">WDM</span>
                <span className="text-slate-600">West Desert Mine (مشروع الجكوب)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800">MI</span>
                <span className="text-slate-600">قسم العمليات التعدينية</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-800">26</span>
                <span className="text-slate-600">سنة 2026</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-800">002</span>
                <span className="text-slate-600">الرقم التسلسلي للطلب</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onOpenSampleInvoice}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition border border-slate-300"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>معاينة نموذج الفاتورة الأصلية للطلب</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
