import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  HelpCircle,
  Flame,
  ArrowDownCircle,
} from 'lucide-react';
import { CatalogItem, Department, Order, OrderItem, PriorityLevel, Site } from '../types';
import { formatSmartReference, getNextSequence } from '../utils/referenceCode';
import { normalizePriority, getPriorityMeta, PRIORITY_METAS, NormalizedPriority } from '../utils/priority';

interface OrderCreateViewProps {
  sites: Site[];
  departments: Department[];
  catalogItems: CatalogItem[];
  existingOrders: Order[];
  onSubmitOrder: (newOrder: Order) => void;
  onCancel: () => void;
  defaultRequesterName?: string;
  defaultRequesterEmail?: string;
}

export const OrderCreateView: React.FC<OrderCreateViewProps> = ({
  sites,
  departments,
  catalogItems,
  existingOrders,
  onSubmitOrder,
  onCancel,
  defaultRequesterName,
  defaultRequesterEmail,
}) => {
  // Form State
  const [selectedSite, setSelectedSite] = useState<string>('WDM');
  const [selectedDept, setSelectedDept] = useState<string>('MN'); // Maintenance by default matching sheet
  const [year] = useState<string>('26'); // 2026
  const [orderDate, setOrderDate] = useState<string>(
    new Date().toISOString().split('T')[0] || '2026-09-10'
  );
  const [requestedFrom, setRequestedFrom] = useState<string>('عطبرة');
  const [executionDays, setExecutionDays] = useState<string>('1 يوم');
  const [initialStatus, setInitialStatus] = useState<'PO_ISSUED' | 'DELIVERED_RECEIVED'>('PO_ISSUED');
  const [requesterName, setRequesterName] = useState<string>(defaultRequesterName || 'مصطفى يعقوب');
  const [requesterEmail, setRequesterEmail] = useState<string>(
    defaultRequesterEmail || 'maintenance@aljakob-mining.com'
  );
  const [purpose, setPurpose] = useState<string>('غيار فلاتر لودر ومولدات عاجل للموقع');
  const [priority, setPriority] = useState<PriorityLevel>('URGENT');
  const [pagesCount, setPagesCount] = useState<number>(1);

  // Dynamic next sequence number
  const nextSeq = useMemo(() => {
    return getNextSequence(existingOrders, selectedSite, selectedDept, year);
  }, [existingOrders, selectedSite, selectedDept, year]);

  // Generated Reference Code
  const generatedReferenceCode = useMemo(() => {
    return formatSmartReference(selectedSite, selectedDept, year, nextSeq);
  }, [selectedSite, selectedDept, year, nextSeq]);

  // Items State - 100% Manual Item Entry
  const [items, setItems] = useState<OrderItem[]>([
    {
      id: 'new-1',
      itemNumber: 1,
      name: 'فلتر جاز لودر XCMG',
      technicalSpecs: 'رقم القطعة: 1000964807',
      quantity: 4,
      unit: 'قطعة',
      notes: 'لودر ZL50GN الورشة المركزية',
      estimatedUnitPrice: 0,
    },
    {
      id: 'new-2',
      itemNumber: 2,
      name: 'فلتر هواء ماكينة ويشاي WEICHAI',
      technicalSpecs: 'موديل WD10G220E23',
      quantity: 2,
      unit: 'طقم',
      notes: 'عاجل للموقع',
      estimatedUnitPrice: 0,
    },
  ]);

  // Validation Errors
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Handle Catalog Selection
  const handleCatalogSelect = (itemIndex: number, catalogId: string) => {
    const selectedCatalog = catalogItems.find((c) => c.id === catalogId);
    if (!selectedCatalog) return;

    setItems((prev) =>
      prev.map((it, idx) =>
        idx === itemIndex
          ? {
              ...it,
              catalogId: selectedCatalog.id,
              name: selectedCatalog.name,
              technicalSpecs: selectedCatalog.standardSpecs,
              unit: selectedCatalog.standardUnit,
              estimatedUnitPrice: selectedCatalog.estimatedUnitPrice,
            }
          : it
      )
    );
  };

  // Update item field
  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  // Add new row
  const addNewItem = () => {
    const nextItemNumber = items.length + 1;
    setItems((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}-${nextItemNumber}`,
        itemNumber: nextItemNumber,
        catalogId: '',
        name: '',
        technicalSpecs: '',
        quantity: 1,
        unit: 'قطعة',
        notes: '',
        estimatedUnitPrice: 0,
      },
    ]);
  };

  // Remove row
  const removeItem = (index: number) => {
    if (items.length <= 1) {
      alert('يجب أن يحتوي الطلب على صنف واحد على الأقل.');
      return;
    }
    setItems((prev) =>
      prev
        .filter((_, idx) => idx !== index)
        .map((item, idx) => ({ ...item, itemNumber: idx + 1 }))
    );
  };

  // Validate and Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];

    if (!purpose.trim()) {
      errors.push('يرجى تحديد الغرض من الشراء والمبرر الفني للطلب.');
    }

    if (!requesterName.trim()) {
      errors.push('يرجى كتابة اسم مقدم الطلب.');
    }

    if (items.length === 0) {
      errors.push('يجب إضافة صنف واحد على الأقل للطلب.');
    }

    items.forEach((item, idx) => {
      const rowNum = idx + 1;
      if (!item.name.trim()) {
        errors.push(`الصنف #${rowNum}: يجب تحديد اسم الصنف من الكتالوج أو الدليل.`);
      }
      if (!item.technicalSpecs.trim()) {
        errors.push(`الصنف #${rowNum}: المواصفات الفنية التفصيلية إلزامية لمنع أخطاء التوريد.`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`الصنف #${rowNum}: الكمية المطلوبة يجب أن تكون أكبر من الصفر.`);
      }
      if (!item.unit.trim()) {
        errors.push(`الصنف #${rowNum}: وحدة القياس إلزامية.`);
      }
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setValidationErrors([]);

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      referenceNumber: generatedReferenceCode,
      siteCode: selectedSite,
      departmentCode: selectedDept,
      departmentName: currentDeptObj?.name || 'الصيانة',
      requestedFrom: requestedFrom || 'عطبرة',
      executionDays: executionDays || '1 يوم',
      year,
      sequenceNumber: nextSeq,
      orderDate,
      requesterName,
      requesterEmail,
      purpose,
      priority,
      pagesCount,
      status: initialStatus,
      urgencyAlertSent: priority === 'URGENT' || priority === 'EMERGENCY',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      items: items.map((it, idx) => ({
        ...it,
        itemNumber: idx + 1,
      })),
      approvals: [
        {
          stage: 'REQUESTER',
          roleName: 'اعتماد رئيس القسم',
          approverName: requesterName || 'مصطفى يعقوب',
          status: 'APPROVED',
          timestamp: new Date().toISOString(),
          signatureDataUrl: 'MUSTAFS',
          comments: 'تم تدقيق الاحتياج والمواصفات الفنية ومطابقة الاستهلاك الميداني.',
        },
        {
          stage: 'DEPT_HEAD',
          roleName: 'رئيس القسم المختص',
          approverName: requesterName || 'مصطفى يعقوب',
          status: 'APPROVED',
          timestamp: new Date().toISOString(),
          signatureDataUrl: 'MUSTAFS',
        },
        {
          stage: 'SITE_MANAGER',
          roleName: 'اعتماد مدير الموقع',
          approverName: 'أحمد الناير',
          status: 'APPROVED',
          timestamp: new Date().toISOString(),
          signatureDataUrl: 'Ahmed Thayer',
        },
        {
          stage: 'GENERAL_MANAGER',
          roleName: 'تصديق المدير العام',
          approverName: 'طارق صالح',
          status: 'APPROVED',
          timestamp: new Date().toISOString(),
          signatureDataUrl: 'مصدق - الإدارة العامة',
        },
      ],
    };

    onSubmitOrder(newOrder);
  };

  const currentSiteObj = sites.find((s) => s.code === selectedSite);
  const currentDeptObj = departments.find((d) => d.code === selectedDept);

  // Calculate estimated total
  const estimatedTotal = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.estimatedUnitPrice || 0),
    0
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6" id="order-create-container">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="bg-amber-100 text-amber-950 text-xs font-black px-2.5 py-0.5 rounded-md border border-amber-300">
                النموذج الرقمي المعتمد
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">
                استبدال الاستمارات الورقية بنظام رقمي موثق
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900">
              إنشاء طلب مواد ومشتريات جديد (Purchase Requisition)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              توليد تلقائي للرقم المرجعي الذكي مع التحقق الصارم من المواصفات الفنية والوحدات
            </p>
          </div>

          {/* Smart Reference Live Box */}
          <div className="bg-slate-950 text-white p-4 rounded-xl shadow-xs border border-slate-800 shrink-0">
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                الرقم المرجعي التلقائي الذكي
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                Auto-Generated
              </span>
            </div>

            <div className="text-2xl font-black font-mono tracking-wider text-amber-300 text-center py-1.5 px-4 bg-slate-900 rounded-lg border border-slate-800">
              {generatedReferenceCode}
            </div>

            {/* Breakdown Anatomy */}
            <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] text-slate-300">
              <span className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-amber-200">
                {selectedSite} (الموقع)
              </span>
              <span>-</span>
              <span className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-emerald-300">
                {selectedDept} (القسم)
              </span>
              <span className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-cyan-300">
                {year} (السنة)
              </span>
              <span className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-pink-300">
                {String(nextSeq).padStart(3, '0')} (التسلسل)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Errors Notice */}
      {validationErrors.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 mb-6 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-900 mb-1">
                تنبيه: تعذر إرسال الطلب لوجود بيانات ناقصة أو غير مكتملة
              </h4>
              <p className="text-xs text-rose-700 mb-2">
                وفقاً لسياسة الجودة، يمنع النظام تمرير أي طلب يفتقر للمواصفات الفنية الدقيقة أو الكميات أو المبرر:
              </p>
              <ul className="list-disc list-inside text-xs text-rose-800 space-y-1 font-medium">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Order Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 pb-3 mb-4 border-b border-slate-100 flex items-center justify-between">
            <span>1. بيانات الطلب الأساسية (Order Header)</span>
            <span className="text-xs font-normal text-slate-500">الحقول المميزة بـ (*) إلزامية</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Site / Mine */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الموقع / المنجم الميداني *
              </label>
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                {sites.map((s) => (
                  <option key={s.code} value={s.code}>
                    [{s.code}] {s.name}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {currentSiteObj?.region}
              </span>
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الجهة / القسم الطالب *
              </label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                {departments.map((d) => (
                  <option key={d.code} value={d.code}>
                    [{d.code}] {d.name}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {currentDeptObj?.englishName}
              </span>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ تقديم الطلب *
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Requested From (مطلوب من) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                مطلوب من (المورد / المدينة) *
              </label>
              <input
                type="text"
                value={requestedFrom}
                onChange={(e) => setRequestedFrom(e.target.value)}
                placeholder="مثال: عطبرة، الخرطوم، الميناء..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Execution Period (أجل التنفيذ) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                أجل التنفيذ المطلوب *
              </label>
              <input
                type="text"
                value={executionDays}
                onChange={(e) => setExecutionDays(e.target.value)}
                placeholder="مثال: 1 يوم، عاجل، 48 ساعة..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Initial Order Status (قيد التنفيذ / تم التنفيذ - من غير حالات اعتماد) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                حالة الطلب * (من غير مراحل اعتماد)
              </label>
              <select
                value={initialStatus}
                onChange={(e) => setInitialStatus(e.target.value as 'PO_ISSUED' | 'DELIVERED_RECEIVED')}
                className="w-full bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-sm font-black text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="PO_ISSUED">⏳ قيد التنفيذ (جاري التوريد والشحن الميداني)</option>
                <option value="DELIVERED_RECEIVED">✅ تم التنفيذ (تم التوريد والتسليم للموقع)</option>
              </select>
            </div>

            {/* Requester Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم مقدم الطلب والصفة الوظيفية *
              </label>
              <input
                type="text"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="مثال: مصطفى يعقوب (فني صيانة)"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Requester Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                البريد الإلكتروني المؤسسي
              </label>
              <input
                type="email"
                value={requesterEmail}
                onChange={(e) => setRequesterEmail(e.target.value)}
                placeholder="maintenance@aljakob-mining.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Priority Classification Selector */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                تصنيف أولوية الطلب والمهلة الزمنية (SLA) *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* HIGH */}
                <button
                  type="button"
                  onClick={() => setPriority('HIGH')}
                  className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between gap-2 ${
                    normalizePriority(priority) === 'HIGH'
                      ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/50 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-rose-200 hover:bg-rose-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-rose-700 font-extrabold text-xs">
                      <Flame className="w-4 h-4 text-rose-600 animate-pulse" />
                      <span>أولوية عالية (High)</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      24 ساعة SLA
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    طارئ وعاجل لتفادي توقف الإنتاج أو المعدات - تصعيد فوري
                  </p>
                </button>

                {/* MEDIUM */}
                <button
                  type="button"
                  onClick={() => setPriority('MEDIUM')}
                  className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between gap-2 ${
                    normalizePriority(priority) === 'MEDIUM'
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/50 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-amber-200 hover:bg-amber-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-700 font-extrabold text-xs">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>أولوية متوسطة (Medium)</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      48-72 ساعة
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    تشغيل اعتيادي ومستلزمات صيانة دورية مجدولة
                  </p>
                </button>

                {/* LOW */}
                <button
                  type="button"
                  onClick={() => setPriority('LOW')}
                  className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between gap-2 ${
                    normalizePriority(priority) === 'LOW'
                      ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/50 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-extrabold text-xs">
                      <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
                      <span>أولوية منخفضة (Low)</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      حسب الخطة
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    تخزين استراتيجي ومواد غير حرجة وفق برنامج المشتريات
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* SLA Notice for High Priority */}
          {normalizePriority(priority) === 'HIGH' && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-xs text-rose-900 font-medium">
              <Flame className="w-5 h-5 text-rose-600 shrink-0 animate-pulse" />
              <div>
                <span className="font-bold">تفعيل مراقبة المهلة الزمنية الفورية (SLA 24h):</span>
                <span>
                  {' '}
                  الطلبات ذات الأولوية العالية تُرسل إشعاراً فورياً مع تصعيد تلقائي للمدير العام في حال عدم الاعتماد خلال 24 ساعة لمنع توقف العمليات الميدانية.
                </span>
              </div>
            </div>
          )}

          {/* Purpose / Justification */}
          <div className="mt-4">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الغرض من الشراء والمبرر الفني والتشغيلي *
            </label>
            <textarea
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="وضح بالتفصيل سبب طلب هذه المواد، ومكان استخدامها في المنجم أو الكسارة أو الورشة..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Section 2: Items Table with Catalog Selection */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                2. جدول تفاصيل الأصناف والمواصفات الفنية (Order Items)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                اختر الصنف من دليل الأصناف القياسي الموحد لتوحيد المسميات والوحدات وتفادي الأخطاء اليدوية
              </p>
            </div>

            <button
              type="button"
              onClick={addNewItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold transition shadow-2xs self-start"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صنف آخر (+)</span>
            </button>
          </div>

          {/* Items Rows */}
          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 transition hover:border-slate-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center font-mono">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      الصنف رقم ({index + 1})
                    </span>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-rose-600 hover:text-rose-800 text-xs flex items-center gap-1 p-1 hover:bg-rose-50 rounded transition"
                      title="حذف هذا الصنف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  )}
                </div>

                {/* Catalog Picker & Name */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
                  <div className="md:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <span>اختيار من الكتالوج الموحد (Item Master Catalog)</span>
                      <span className="text-amber-600 font-normal text-[10px]">(يوصى به)</span>
                    </label>
                    <select
                      value={item.catalogId || ''}
                      onChange={(e) => handleCatalogSelect(index, e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="">-- اختر صنفاً معتمداً من الكتالوج القياسي --</option>
                      {catalogItems.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          [{cat.code}] {cat.name} ({cat.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-7">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      اسم الصنف الرسمي *
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      placeholder="مثال: لقم حفر صخري كربيد التنجستن 89 مم"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Technical Specs & Details */}
                <div className="mb-3">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                    <span>المواصفات الفنية التفصيلية (Technical Specifications) *</span>
                    <span className="text-[10px] text-amber-700 font-normal">
                      إلزامية لمنع توريد أصناف غير مطابقة للاحتياج الميداني
                    </span>
                  </label>
                  <textarea
                    rows={2}
                    value={item.technicalSpecs}
                    onChange={(e) => updateItem(index, 'technicalSpecs', e.target.value)}
                    placeholder="المقاس، الأبعاد، الموديل، نوع المعدة، الضغط، الجهد، رقم الجزء Part Number إن وجد..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>

                {/* Quantity, Unit, Price & Notes */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      الكمية المطلوبة *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity || ''}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-center focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      وحدة القياس *
                    </label>
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="قطعة">قطعة (Piece)</option>
                      <option value="صندوق">صندوق (Box)</option>
                      <option value="دستة">دستة (Dozen)</option>
                      <option value="برميل">برميل (Barrel - 208L)</option>
                      <option value="لتر">لتر (Litre)</option>
                      <option value="طن">طن (Ton)</option>
                      <option value="متر">متر (Metre)</option>
                      <option value="طقم">طقم (Set)</option>
                      <option value="زوج">زوج (Pair)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      السعر التقديري للوحدة ($)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={item.estimatedUnitPrice || ''}
                      onChange={(e) =>
                        updateItem(index, 'estimatedUnitPrice', parseFloat(e.target.value) || 0)
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-center focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      ملاحظات تشغيلية
                    </label>
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={(e) => updateItem(index, 'notes', e.target.value)}
                      placeholder="رقم المعدة أو الأولوية الميدانية..."
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Table Summary Footer */}
          <div className="mt-4 p-3 bg-slate-100 rounded-xl flex flex-wrap items-center justify-between text-xs text-slate-700">
            <div>
              <span>عدد الأصناف: </span>
              <span className="font-bold text-slate-900">{items.length} صنف</span>
            </div>
            <div>
              <span>إجمالي الكميات: </span>
              <span className="font-bold text-slate-900">
                {items.reduce((s, i) => s + (i.quantity || 0), 0)} وحدة
              </span>
            </div>
            <div>
              <span>التكلفة التقديرية الإجمالية: </span>
              <span className="font-bold font-mono text-emerald-800 text-sm">
                ${estimatedTotal.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Digital Workflow & Approvals Flow preview */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 pb-3 mb-4 border-b border-slate-100 flex items-center justify-between">
            <span>3. مسار الاعتماد الرقمي التلقائي (Approval Workflow)</span>
            <span className="text-xs text-blue-700 font-semibold">توجيه آلي حسب الموقع والقسم</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-1.5 font-bold">
                1
              </div>
              <div className="font-bold text-emerald-900">مقدم الطلب</div>
              <div className="text-[11px] text-emerald-700">{requesterName}</div>
              <div className="text-[10px] text-emerald-600 mt-1 font-semibold flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                توقيع إلكتروني فوري
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-1.5 font-bold">
                2
              </div>
              <div className="font-bold text-blue-900">رئيس القسم</div>
              <div className="text-[11px] text-blue-700">رئيس إدارة {currentDeptObj?.name}</div>
              <div className="text-[10px] text-blue-600 mt-1">فحص الجدوى والمواصفات</div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center mx-auto mb-1.5 font-bold">
                3
              </div>
              <div className="font-bold text-amber-900">مدير الموقع</div>
              <div className="text-[11px] text-amber-700">مدير {currentSiteObj?.name}</div>
              <div className="text-[10px] text-amber-600 mt-1">مطابقة أولويات الإنتاج</div>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
              <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center mx-auto mb-1.5 font-bold">
                4
              </div>
              <div className="font-bold text-purple-900">المدير العام</div>
              <div className="text-[11px] text-purple-700">المصادقة والاعتماد المالي</div>
              <div className="text-[10px] text-purple-600 mt-1">إصدار أمر الشراء PO</div>
            </div>
          </div>
        </div>

        {/* Actions Bottom Bar */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-sm transition"
          >
            إلغاء والعودة
          </button>

          <button
            type="submit"
            className="px-8 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black rounded-xl text-sm shadow-md flex items-center gap-2 transition hover:scale-[1.01]"
          >
            <Send className="w-4 h-4" />
            <span>حفظ الطلب وتمريره للاعتماد الرقمي</span>
          </button>
        </div>
      </form>
    </div>
  );
};
