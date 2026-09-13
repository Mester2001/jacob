import React, { useState, useEffect } from 'react';
import {
  Share2,
  Printer,
  Copy,
  Check,
  MessageSquare,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { Order, OrderItem, OrderStatus } from '../types';
import { PriorityBadge } from './PriorityBadge';
import { getPriorityMeta } from '../utils/priority';

interface OfficialRequisitionSheetProps {
  order: Order;
  onStatusChange?: (newStatus: OrderStatus) => void;
  onUpdateOrder?: (updatedOrder: Order) => void;
  showControls?: boolean;
}

export const OfficialRequisitionSheet: React.FC<OfficialRequisitionSheetProps> = ({
  order,
  onStatusChange,
  onUpdateOrder,
  showControls = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Local draft state for editing items and metadata manually
  const [draftOrder, setDraftOrder] = useState<Order>(order);

  // Sync draft when prop order changes and not currently editing
  useEffect(() => {
    if (!isEditing) {
      setDraftOrder(order);
    }
  }, [order, isEditing]);

  // Generate deep-link url for read-only member status view
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?view=${encodeURIComponent(order.referenceNumber)}`
    : `https://aljakob-mining.com/?view=${order.referenceNumber}`;

  // Simplified Status: Only two states as requested (من غير حالات اعتماد)
  const isCompleted = order.status === 'DELIVERED_RECEIVED';
  const statusArabic = isCompleted
    ? '✅ تم التنفيذ (تم التوريد والتسليم للموقع)'
    : '⏳ قيد التنفيذ (جاري التوريد والشحن الميداني)';

  const priorityMeta = getPriorityMeta(order.priority);

  const whatsAppMessage = `📋 *طلب شراء - مشروع الجكوب للتعدين*
━━━━━━━━━━━━━━━━━
🔖 *رقم الطلب:* ${order.referenceNumber}
📅 *التاريخ:* ${order.orderDate}م
🏢 *المطلوب من:* ${order.requestedFrom || 'عطبرة'}
⚙️ *القسم:* ${order.departmentName || 'الصيانة'}
⚡ *أجل التنفيذ:* ${order.executionDays || '1 يوم'}
🚨 *تصنيف الأولوية:* ${priorityMeta.label} (${priorityMeta.slaText})
🎯 *الغرض من الشراء:* ${order.purpose}

📊 *حالة الطلب الحالية:*
${statusArabic}

🔒 *رابط متابعة حالة الطلب للأعضاء (عرض الحالة فقط دون صلاحيات):*
${shareUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCopyFullMessage = () => {
    navigator.clipboard.writeText(whatsAppMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(whatsAppMessage);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  // Manual Items Handlers
  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    setDraftOrder((prev) => {
      const newItems = [...prev.items];
      if (newItems[index]) {
        newItems[index] = { ...newItems[index], [field]: value };
      }
      return { ...prev, items: newItems };
    });
  };

  const handleAddItem = () => {
    if (draftOrder.items.length >= 15) return;
    const newItem: OrderItem = {
      id: `item-manual-${Date.now()}-${draftOrder.items.length + 1}`,
      itemNumber: draftOrder.items.length + 1,
      name: '',
      technicalSpecs: '',
      quantity: 1,
      unit: 'قطعة',
      notes: '',
    };
    setDraftOrder((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const handleDeleteItem = (index: number) => {
    setDraftOrder((prev) => {
      const filtered = prev.items.filter((_, i) => i !== index);
      const renumbered = filtered.map((item, idx) => ({
        ...item,
        itemNumber: idx + 1,
      }));
      return { ...prev, items: renumbered };
    });
  };

  const handleSaveEdits = () => {
    if (onUpdateOrder) {
      onUpdateOrder(draftOrder);
    }
    setIsEditing(false);
  };

  const handleCancelEdits = () => {
    setDraftOrder(order);
    setIsEditing(false);
  };

  // Active items and empty lines to reach 15 lines exactly as the paper form
  const totalRows = 15;
  const currentItems = isEditing ? draftOrder.items : order.items;
  const emptyRowsCount = Math.max(0, totalRows - currentItems.length);

  // Signatures (Fixed as official stamped approvals)
  const deptApproval = order.approvals?.find((a) => a.stage === 'REQUESTER' || a.stage === 'DEPT_HEAD');
  const siteApproval = order.approvals?.find((a) => a.stage === 'SITE_MANAGER');
  const gmApproval = order.approvals?.find((a) => a.stage === 'GENERAL_MANAGER');

  return (
    <div className="space-y-4">
      {/* Interactive Controls Bar */}
      {showControls && (
        <div className="no-print bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Title & Order ID */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-md">
                  استمارة طلب الشراء الرسمية
                </span>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>طلب رقم:</span>
                  <span className="font-mono text-amber-400 tracking-wider">[{order.referenceNumber}]</span>
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                إرسال الرابط للقروب لمتابعة حالة الطلب مباشرة (قيد التنفيذ / تم التنفيذ) مع إمكانية إدخال الأصناف يدوياً
              </p>
            </div>

            {/* Quick Status Switcher (Direct execution status without approval delays) */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-slate-800/90 p-1.5 sm:p-2 rounded-xl border border-slate-700 flex items-center gap-2">
                <span className="text-[11px] text-slate-300 font-bold px-1.5">الحالة:</span>
                <button
                  type="button"
                  onClick={() => onStatusChange && onStatusChange('PO_ISSUED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    !isCompleted
                      ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                  title="تعيين الحالة إلى قيد التنفيذ"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>⏳ قيد التنفيذ</span>
                </button>
                <button
                  type="button"
                  onClick={() => onStatusChange && onStatusChange('DELIVERED_RECEIVED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-md font-extrabold'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                  title="تعيين الحالة إلى تم التنفيذ"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>✅ تم التنفيذ</span>
                </button>
              </div>

              {/* Edit / Manual Items Entry Toggle */}
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>إدخال وتعديل الأصناف يدوياً</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveEdits}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer animate-pulse"
                  >
                    <Save className="w-4 h-4" />
                    <span>حفظ الأصناف بالاستمارة</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdits}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-3 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>إلغاء</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Helper banner when editing */}
          {isEditing && (
            <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-200 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  أنت الآن في وضع <strong>إدخال الأصناف يدوياً</strong>: يمكنك كتابة اسم الصنف، المواصفات، الكمية، والوحدة مباشرة في الجدول أدناه وإضافة حتى 15 صنفاً، ثم الضغط على <strong>"حفظ الأصناف بالاستمارة"</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                disabled={draftOrder.items.length >= 15}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة سطر صنف جديد</span>
              </button>
            </div>
          )}

          {/* Action Buttons: WhatsApp Share, Copy Link, Print */}
          <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-800">
            {/* Direct WhatsApp Share Button */}
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer hover:scale-[1.01]"
            >
              <MessageSquare className="w-4 h-4 fill-white" />
              <span>إرسال رابط الطلب في قروب الواتساب (WhatsApp Group)</span>
            </button>

            {/* Copy Formatted Message */}
            <button
              type="button"
              onClick={handleCopyFullMessage}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 transition flex items-center gap-2 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'تم النسخ بنجاح!' : 'نسخ نص ورابط الرسالة للقروب'}</span>
            </button>

            {/* Copy Just URL */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 transition flex items-center gap-2 cursor-pointer"
              title="نسخ رابط متابعة الأعضاء (عرض حالة الطلب فقط دون صلاحيات تعديل)"
            >
              <Share2 className="w-4 h-4 text-amber-400" />
              <span>نسخ رابط متابعة الأعضاء (عرض فقط)</span>
            </button>

            {/* Print / PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="mr-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الاستمارة (Print / PDF)</span>
            </button>
          </div>
        </div>
      )}

      {/* THE OFFICIAL DOCUMENT CONTAINER (Exact 1:1 replica of the photo) */}
      <div
        id="official-requisition-form"
        className="bg-white text-black p-4 sm:p-8 lg:p-10 shadow-2xl rounded-2xl border-2 border-black max-w-4xl mx-auto font-sans relative overflow-hidden print:p-0 print:border-none print:shadow-none"
        dir="rtl"
      >
        {/* Rubber Stamp Watermark indicating status (Simplified: قيد التنفيذ أو تم التنفيذ) */}
        <div className="absolute top-28 left-8 sm:left-14 pointer-events-none opacity-85 rotate-[-12deg] z-10 select-none">
          <div
            className={`border-4 rounded-xl px-4 py-2 text-center font-black tracking-widest shadow-sm ${
              isCompleted
                ? 'border-emerald-700 text-emerald-700 bg-emerald-50/70'
                : 'border-amber-600 text-amber-700 bg-amber-50/70'
            }`}
          >
            <div className="text-[10px] uppercase font-mono tracking-widest">
              مشروع الجكوب للتعدين • ELJAKOB
            </div>
            <div className="text-base sm:text-lg font-black my-0.5">
              {isCompleted ? '✓ تم التنفيذ بنجاح' : '⏳ قيد التنفيذ والتوريد'}
            </div>
            <div className="text-[9px] font-mono">
              REF: {order.referenceNumber} • DATE: {order.orderDate}
            </div>
          </div>
        </div>

        {/* Header: Logos and Title */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 pb-2">
          {/* Right Logo */}
          <div className="flex flex-col items-center shrink-0 w-24 sm:w-28 text-center">
            <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-xs">
              <circle cx="50" cy="50" r="46" fill="#fef3c7" stroke="#1e293b" strokeWidth="3" />
              <circle cx="50" cy="50" r="40" fill="#ffffff" stroke="#b45309" strokeWidth="2" strokeDasharray="3 2" />
              <polygon points="25,65 50,30 75,65" fill="#78350f" opacity="0.8" />
              <polygon points="40,65 60,38 82,65" fill="#d97706" opacity="0.9" />
              <polygon points="18,65 35,45 52,65" fill="#92400e" opacity="0.85" />
              <path
                d="M32 60 L45 50 L58 50 L68 62 L32 62 Z"
                fill="#f59e0b"
                stroke="#1e293b"
                strokeWidth="1.5"
              />
              <line x1="45" y1="50" x2="38" y2="40" stroke="#1e293b" strokeWidth="2.5" />
              <line x1="38" y1="40" x2="52" y2="35" stroke="#1e293b" strokeWidth="2" />
              <circle cx="48" cy="46" r="2" fill="#fbbf24" stroke="#78350f" strokeWidth="0.5" />
              <circle cx="56" cy="44" r="2.5" fill="#fbbf24" stroke="#78350f" strokeWidth="0.5" />
              <path id="curveTopR" d="M 20 50 A 30 30 0 0 1 80 50" fill="none" />
              <text fontSize="6" fontWeight="900" fill="#78350f">
                <textPath href="#curveTopR" startOffset="50%" textAnchor="middle">
                  مشروع الجكوب للتعدين
                </textPath>
              </text>
            </svg>
            <span className="text-[8px] sm:text-[9px] font-black text-slate-900 leading-tight mt-0.5">
              مشروع الجكوب للتعدين
            </span>
            <span className="text-[6px] sm:text-[7px] font-bold text-slate-600 font-mono tracking-tighter">
              ELJAKOB FOR MINING
            </span>
          </div>

          {/* Center Main Titles */}
          <div className="text-center flex-1">
            <h1 className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight font-serif">
              مشروع الجكوب للتعدين
            </h1>
            <h2 className="text-xs sm:text-base font-extrabold text-slate-900 tracking-wider font-mono uppercase mt-0.5">
              ELJAKOB FOR MINING PROJECT
            </h2>
          </div>

          {/* Left Logo */}
          <div className="flex flex-col items-center shrink-0 w-24 sm:w-28 text-center">
            <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-xs">
              <circle cx="50" cy="50" r="46" fill="#fef3c7" stroke="#1e293b" strokeWidth="3" />
              <circle cx="50" cy="50" r="40" fill="#ffffff" stroke="#b45309" strokeWidth="2" strokeDasharray="3 2" />
              <polygon points="25,65 50,30 75,65" fill="#78350f" opacity="0.8" />
              <polygon points="40,65 60,38 82,65" fill="#d97706" opacity="0.9" />
              <polygon points="18,65 35,45 52,65" fill="#92400e" opacity="0.85" />
              <path
                d="M32 60 L45 50 L58 50 L68 62 L32 62 Z"
                fill="#f59e0b"
                stroke="#1e293b"
                strokeWidth="1.5"
              />
              <line x1="45" y1="50" x2="38" y2="40" stroke="#1e293b" strokeWidth="2.5" />
              <line x1="38" y1="40" x2="52" y2="35" stroke="#1e293b" strokeWidth="2" />
              <circle cx="48" cy="46" r="2" fill="#fbbf24" stroke="#78350f" strokeWidth="0.5" />
              <circle cx="56" cy="44" r="2.5" fill="#fbbf24" stroke="#78350f" strokeWidth="0.5" />
              <path id="curveTopL" d="M 20 50 A 30 30 0 0 1 80 50" fill="none" />
              <text fontSize="6" fontWeight="900" fill="#78350f">
                <textPath href="#curveTopL" startOffset="50%" textAnchor="middle">
                  مشروع الجكوب للتعدين
                </textPath>
              </text>
            </svg>
            <span className="text-[8px] sm:text-[9px] font-black text-slate-900 leading-tight mt-0.5">
              مشروع الجكوب للتعدين
            </span>
            <span className="text-[6px] sm:text-[7px] font-bold text-slate-600 font-mono tracking-tighter">
              ELJAKOB FOR MINING
            </span>
          </div>
        </div>

        {/* Yellow Sub-Banner: "طـــــلـــــب شــــــــــــــراء" */}
        <div className="my-2 border-2 border-black bg-[#fef08a] py-1.5 text-center">
          <h2 className="text-base sm:text-xl font-black text-black tracking-[0.3em] sm:tracking-[0.5em]">
            طــــــــــــلــــــــــــب شــــــــــــــــــــــــــــراء
          </h2>
        </div>

        {/* Metadata Table */}
        <div className="border-2 border-black mb-3 text-xs sm:text-sm font-sans">
          {/* Row 1: Date & Order Number */}
          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-2 sm:col-span-2 bg-[#fef08a] border-l border-black p-1.5 font-bold flex items-center justify-start">
              <span>التـــــــــــــــــاريخ:</span>
            </div>
            <div className="col-span-4 sm:col-span-4 border-l border-black p-1.5 font-bold font-mono text-center flex items-center justify-center">
              {isEditing ? (
                <input
                  type="text"
                  value={draftOrder.orderDate}
                  onChange={(e) => setDraftOrder({ ...draftOrder, orderDate: e.target.value })}
                  className="w-full text-center border border-amber-400 rounded px-1 py-0.5 font-mono text-xs font-bold"
                />
              ) : (
                <span>{order.orderDate}م</span>
              )}
            </div>
            <div className="col-span-2 sm:col-span-2 bg-[#fef08a] border-l border-black p-1.5 font-bold flex items-center justify-start">
              <span>رقم الطلب:</span>
            </div>
            <div className="col-span-4 sm:col-span-4 p-1.5 font-black font-mono text-center text-sm sm:text-base flex items-center justify-center tracking-wider bg-slate-50">
              <span>{order.referenceNumber}</span>
            </div>
          </div>

          {/* Row 2: Department & Requested From */}
          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-2 sm:col-span-2 bg-[#fef08a] border-l border-black p-1.5 font-bold flex items-center justify-start">
              <span>القســـــــــــــــــــم:</span>
            </div>
            <div className="col-span-4 sm:col-span-4 border-l border-black p-1.5 font-bold text-center flex items-center justify-center">
              {isEditing ? (
                <input
                  type="text"
                  value={draftOrder.departmentName || ''}
                  onChange={(e) => setDraftOrder({ ...draftOrder, departmentName: e.target.value })}
                  placeholder="مثال: الصيانة"
                  className="w-full text-center border border-amber-400 rounded px-1 py-0.5 text-xs font-bold"
                />
              ) : (
                <span>{order.departmentName || 'الصيانة'}</span>
              )}
            </div>
            <div className="col-span-2 sm:col-span-2 bg-[#fef08a] border-l border-black p-1.5 font-bold flex items-center justify-start">
              <span>مطلوب من:</span>
            </div>
            <div className="col-span-4 sm:col-span-4 p-1.5 font-bold text-center flex items-center justify-center">
              {isEditing ? (
                <input
                  type="text"
                  value={draftOrder.requestedFrom || ''}
                  onChange={(e) => setDraftOrder({ ...draftOrder, requestedFrom: e.target.value })}
                  placeholder="مثال: عطبرة"
                  className="w-full text-center border border-amber-400 rounded px-1 py-0.5 text-xs font-bold"
                />
              ) : (
                <span>{order.requestedFrom || 'عطبرة'}</span>
              )}
            </div>
          </div>

          {/* Row 3: Execution Period & Pages Count */}
          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-2 sm:col-span-2 bg-[#fef08a] border-l border-black p-1.5 font-bold flex items-center justify-start">
              <span>أجل التنفيذ:</span>
            </div>
            <div className="col-span-4 sm:col-span-4 border-l border-black p-1.5 font-bold text-center flex items-center justify-center">
              {isEditing ? (
                <input
                  type="text"
                  value={draftOrder.executionDays || ''}
                  onChange={(e) => setDraftOrder({ ...draftOrder, executionDays: e.target.value })}
                  placeholder="مثال: 1 يوم"
                  className="w-full text-center border border-amber-400 rounded px-1 py-0.5 text-xs font-bold"
                />
              ) : (
                <span>{order.executionDays || '1 يوم'}</span>
              )}
            </div>
            <div className="col-span-2 sm:col-span-2 bg-[#fef08a] border-l border-black p-1.5 font-bold flex items-center justify-start">
              <span>عدد الصفحات بالطلب:</span>
            </div>
            <div className="col-span-4 sm:col-span-4 p-1.5 font-bold text-center flex items-center justify-center font-mono">
              <span>{order.pagesCount || 1}</span>
            </div>
          </div>

          {/* Row 4: Purchase Purpose */}
          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-3 sm:col-span-2 bg-[#fef08a] border-l border-black p-1.5 font-bold flex items-center justify-start">
              <span>الغرض من الشراء:</span>
            </div>
            <div className="col-span-9 sm:col-span-10 p-1.5 font-bold flex items-center justify-start text-slate-900 pr-3">
              {isEditing ? (
                <input
                  type="text"
                  value={draftOrder.purpose}
                  onChange={(e) => setDraftOrder({ ...draftOrder, purpose: e.target.value })}
                  placeholder="الغرض من الشراء..."
                  className="w-full border border-amber-400 rounded px-2 py-1 text-xs font-bold"
                />
              ) : (
                <span>{order.purpose}</span>
              )}
            </div>
          </div>

          {/* Row 5: Prominent Direct Order Status (قيد التنفيذ أو تم التنفيذ فقط - من غير حالات اعتماد) */}
          <div className="grid grid-cols-12 bg-amber-50/50">
            <div className="col-span-3 sm:col-span-2 bg-[#fef08a] border-l border-black p-2 font-black flex items-center justify-start text-slate-950">
              <span>حالة الطلب الحالية:</span>
            </div>
            <div className="col-span-9 sm:col-span-10 p-2 flex items-center justify-between gap-3 pr-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs sm:text-sm font-black border-2 ${
                    isCompleted
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-600'
                      : 'bg-amber-100 text-amber-950 border-amber-500'
                  }`}
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>✅ تم التنفيذ (تم التوريد والتسليم للموقع)</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-amber-700 animate-spin shrink-0" />
                      <span>⏳ قيد التنفيذ (جاري التوريد والشحن الميداني)</span>
                    </>
                  )}
                </span>
                <PriorityBadge priority={order.priority} size="sm" showSla={true} />
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  (محدث لحظياً ومباشر للقروب)
                </span>
              </div>

              {/* Direct WhatsApp Share button right inside the metadata */}
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="no-print bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-md transition flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                title="مشاركة رابط هذا الطلب في القروب"
              >
                <MessageSquare className="w-3 h-3" />
                <span>إرسال للقروب</span>
              </button>
            </div>
          </div>
        </div>

        {/* Items Table Header with Manual Add Button */}
        {isEditing && (
          <div className="flex items-center justify-between mb-2 no-print">
            <span className="text-xs font-bold text-slate-700">
              أصناف الطلب ({currentItems.length} من 15 صف):
            </span>
            <button
              type="button"
              onClick={handleAddItem}
              disabled={currentItems.length >= 15}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة صنف يدوي</span>
            </button>
          </div>
        )}

        {/* Items Table (15 rows exactly as the paper form) */}
        <div className="border-2 border-black mb-4">
          <table className="w-full text-right text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-[#fef08a] text-black font-black border-b-2 border-black text-center">
                <th className="p-1 sm:p-2 border-l border-black w-8 sm:w-10">م</th>
                <th className="p-1 sm:p-2 border-l border-black w-28 sm:w-36">الصنف</th>
                <th className="p-1 sm:p-2 border-l border-black w-32 sm:w-44">المواصفات</th>
                <th className="p-1 sm:p-2 border-l border-black w-14 sm:w-16">الكمية</th>
                <th className="p-1 sm:p-2 border-l border-black w-16 sm:w-20">الوحدة</th>
                <th className="p-1 sm:p-2">ملاحظات</th>
                {isEditing && <th className="p-1 sm:p-2 w-10 text-center no-print">حذف</th>}
              </tr>
            </thead>
            <tbody>
              {/* Existing / Editable items */}
              {currentItems.map((item, idx) => (
                <tr key={item.id || idx} className="border-b border-black text-center font-bold">
                  <td className="p-1 sm:p-1.5 border-l border-black font-mono">{idx + 1}</td>

                  {/* الصنف */}
                  <td className="p-1 sm:p-1.5 border-l border-black text-center text-slate-950 font-bold">
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        placeholder="اسم الصنف..."
                        className="w-full text-center border border-amber-400 rounded px-1 py-0.5 text-xs font-bold"
                      />
                    ) : (
                      <span>{item.name}</span>
                    )}
                  </td>

                  {/* المواصفات */}
                  <td className="p-1 sm:p-1.5 border-l border-black text-center font-mono font-bold tracking-wider">
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.technicalSpecs}
                        onChange={(e) => handleItemChange(idx, 'technicalSpecs', e.target.value)}
                        placeholder="المواصفات أو رقم القطعة..."
                        className="w-full text-center border border-amber-400 rounded px-1 py-0.5 text-xs font-mono font-bold"
                      />
                    ) : (
                      <span>{item.technicalSpecs}</span>
                    )}
                  </td>

                  {/* الكمية */}
                  <td className="p-1 sm:p-1.5 border-l border-black text-center font-mono text-sm sm:text-base font-black">
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value) || 1)}
                        className="w-full text-center border border-amber-400 rounded px-1 py-0.5 text-xs font-mono font-black"
                      />
                    ) : (
                      <span>{item.quantity}</span>
                    )}
                  </td>

                  {/* الوحدة */}
                  <td className="p-1 sm:p-1.5 border-l border-black text-center">
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        placeholder="الوحدة..."
                        className="w-full text-center border border-amber-400 rounded px-1 py-0.5 text-xs"
                      />
                    ) : (
                      <span>{item.unit}</span>
                    )}
                  </td>

                  {/* ملاحظات */}
                  <td className="p-1 sm:p-1.5 text-center text-[11px] sm:text-xs text-slate-800 font-semibold">
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                        placeholder="ملاحظات أو اسم المعدة..."
                        className="w-full text-center border border-amber-400 rounded px-1 py-0.5 text-xs"
                      />
                    ) : (
                      <span>{item.notes || '-'}</span>
                    )}
                  </td>

                  {/* Action: Delete Row */}
                  {isEditing && (
                    <td className="p-1 border-black text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(idx)}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                        title="حذف هذا الصنف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}

              {/* Empty rows up to 15 to match the paper form exactly */}
              {Array.from({ length: emptyRowsCount }).map((_, idx) => {
                const rowNumber = currentItems.length + idx + 1;
                return (
                  <tr key={`empty-${rowNumber}`} className="border-b border-black text-center h-6 sm:h-7">
                    <td className="p-1 border-l border-black font-mono text-slate-400 text-xs">
                      {rowNumber}
                    </td>
                    <td className="border-l border-black"></td>
                    <td className="border-l border-black"></td>
                    <td className="border-l border-black"></td>
                    <td className="border-l border-black"></td>
                    <td></td>
                    {isEditing && <td className="no-print"></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Signatures & Approvals Table (Permanent official certified format) */}
        <div className="border-2 border-black text-xs sm:text-sm font-sans">
          {/* Header Row: Approvers */}
          <div className="grid grid-cols-12 border-b border-black bg-[#fef08a] font-black text-center">
            <div className="col-span-3 sm:col-span-2 p-1.5 border-l border-black">
              {/* Labels Column Header */}
            </div>
            <div className="col-span-3 sm:col-span-3 p-1.5 border-l border-black">
              <span>اعتماد رئيس القسم</span>
            </div>
            <div className="col-span-3 sm:col-span-4 p-1.5 border-l border-black">
              <span>اعتماد مدير الموقع</span>
            </div>
            <div className="col-span-3 sm:col-span-3 p-1.5">
              <span>تصديق المدير العام</span>
            </div>
          </div>

          {/* Row 1: Name (الإســـــــــــــــــــــــم) */}
          <div className="grid grid-cols-12 border-b border-black text-center font-bold">
            <div className="col-span-3 sm:col-span-2 bg-[#fef08a] border-l border-black p-1.5 flex items-center justify-center font-black">
              <span>الإســـــــــــــــــــــــم</span>
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-black p-1.5 flex items-center justify-center">
              <span>{deptApproval?.approverName || 'مصطفى يعقوب'}</span>
            </div>
            <div className="col-span-3 sm:col-span-4 border-l border-black p-1.5 flex items-center justify-center">
              <span>{siteApproval?.approverName || 'أحمد الناير'}</span>
            </div>
            <div className="col-span-3 sm:col-span-3 p-1.5 flex items-center justify-center">
              <span>{gmApproval?.approverName || 'طارق صالح'}</span>
            </div>
          </div>

          {/* Row 2: Title / Job (الوظيفـــــــــــــــــــة) */}
          <div className="grid grid-cols-12 border-b border-black text-center font-bold">
            <div className="col-span-3 sm:col-span-2 bg-[#fef08a] border-l border-black p-1.5 flex items-center justify-center font-black">
              <span>الوظيفـــــــــــــــــــة</span>
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-black p-1.5 flex items-center justify-center text-xs">
              <span>فني صيانة</span>
            </div>
            <div className="col-span-3 sm:col-span-4 border-l border-black p-1.5 flex items-center justify-center text-xs">
              <span>مدير الموقع المكلف</span>
            </div>
            <div className="col-span-3 sm:col-span-3 p-1.5 flex items-center justify-center text-xs">
              <span>المدير العام</span>
            </div>
          </div>

          {/* Row 3: Date (التاريـــــــــــــــــــــخ) */}
          <div className="grid grid-cols-12 border-b border-black text-center font-mono font-bold text-xs sm:text-sm">
            <div className="col-span-3 sm:col-span-2 bg-[#fef08a] border-l border-black p-1.5 flex items-center justify-center font-black font-sans">
              <span>التاريـــــــــــــــــــــخ</span>
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-black p-1.5 flex items-center justify-center">
              <span>{order.orderDate}م</span>
            </div>
            <div className="col-span-3 sm:col-span-4 border-l border-black p-1.5 flex items-center justify-center">
              <span>{order.orderDate}م</span>
            </div>
            <div className="col-span-3 sm:col-span-3 p-1.5 flex items-center justify-center">
              <span>2026/09/08م</span>
            </div>
          </div>

          {/* Row 4: Signature (التوقيـــــــــــــــــــــع) */}
          <div className="grid grid-cols-12 text-center h-20 sm:h-24">
            <div className="col-span-3 sm:col-span-2 bg-[#fef08a] border-l border-black p-1.5 flex items-center justify-center font-black">
              <span>التوقيـــــــــــــــــــــع</span>
            </div>

            {/* Dept Head Signature (MUSTAFS) */}
            <div className="col-span-3 sm:col-span-3 border-l border-black p-2 flex flex-col items-center justify-center">
              <span className="font-mono text-base sm:text-lg font-black tracking-widest text-slate-800">
                MUSTAFS
              </span>
              <span className="text-[9px] text-slate-500 mt-1">توقيع معتمد</span>
            </div>

            {/* Site Manager Signature (Handwritten Ahmed Thayer) */}
            <div className="col-span-3 sm:col-span-4 border-l border-black p-2 flex flex-col items-center justify-center">
              <svg viewBox="0 0 160 60" className="w-28 sm:w-36 h-12">
                <path
                  d="M15,45 Q30,10 45,35 T75,25 Q95,50 115,20 T145,35"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M25,25 L50,45 M65,15 Q80,45 105,40"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <text x="35" y="55" fontSize="14" fontStyle="italic" fontWeight="bold" fill="#0f172a" fontFamily="cursive">
                  Ahmed Thayer
                </text>
              </svg>
            </div>

            {/* GM Signature & Stamp */}
            <div className="col-span-3 sm:col-span-3 p-2 flex flex-col items-center justify-center">
              <div className="border border-slate-700 rounded px-2 py-0.5 text-[10px] font-bold text-slate-800 bg-slate-50">
                مصدق - الإدارة العامة
              </div>
              <span className="text-xs font-serif font-bold text-slate-900 mt-1">
                طارق صالح
              </span>
            </div>
          </div>
        </div>

        {/* Footer info & Direct Link URL */}
        <div className="mt-4 pt-2 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-600 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold">مشروع الجكوب للتعدين • نظام إدارة الطلبات ERP</span>
            <span>•</span>
            <span className="font-mono font-bold">كود المتابعة: {order.referenceNumber}</span>
          </div>

          <div className="flex items-center gap-1 font-mono text-[9px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <span className="text-slate-500">رابط المشاركة المباشر:</span>
            <span className="text-slate-800 font-bold truncate max-w-xs">{shareUrl}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
