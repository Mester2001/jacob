import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Printer,
  ChevronRight,
  Copy,
  Check,
  Download,
  Building,
  Share2,
  Flame,
  ArrowDownCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { Department, Order, PriorityLevel, Site } from '../types';
import { normalizePriority, getPriorityMeta, PRIORITY_METAS, NormalizedPriority } from '../utils/priority';
import { PriorityBadge } from './PriorityBadge';
import { OrdersReportPdfModal } from './OrdersReportPdfModal';
import { copyToClipboardSafe, generateMemberViewUrl } from '../utils/linkSharing';

interface OrdersListProps {
  orders: Order[];
  sites: Site[];
  departments: Department[];
  onSelectOrder: (order: Order) => void;
  onOpenPrintView: (order: Order) => void;
  onOpenCreate: () => void;
  onTrackOrder?: (order: Order) => void;
  onUpdatePriority?: (orderId: string, newPriority: PriorityLevel) => void;
  onOpenMemberPortal?: (order: Order) => void;
  onOpenShareModal?: (order: Order) => void;
  onShowToast?: (text: string, type?: 'success' | 'warning' | 'info') => void;
}

export const OrdersList: React.FC<OrdersListProps> = ({
  orders,
  sites,
  departments,
  onSelectOrder,
  onOpenPrintView,
  onOpenCreate,
  onTrackOrder,
  onUpdatePriority,
  onOpenMemberPortal,
  onOpenShareModal,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSite, setSelectedSite] = useState<string>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [copiedMemberLink, setCopiedMemberLink] = useState<string | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const handleCopyMemberLink = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = generateMemberViewUrl(order.referenceNumber);
    const ok = await copyToClipboardSafe(url);
    if (ok) {
      setCopiedMemberLink(order.referenceNumber);
      if (onShowToast) {
        onShowToast(`تم نسخ رابط متابعة الأعضاء للطلب ${order.referenceNumber} بنجاح!`, 'success');
      }
      setTimeout(() => setCopiedMemberLink(null), 2500);
    }
  };

  // Calculate priority counts
  const priorityCounts = useMemo(() => {
    const counts = { ALL: orders.length, HIGH: 0, MEDIUM: 0, LOW: 0 };
    orders.forEach((o) => {
      const norm = normalizePriority(o.priority);
      counts[norm] = (counts[norm] || 0) + 1;
    });
    return counts;
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRef = order.referenceNumber.toLowerCase().includes(q);
        const matchesRequester = order.requesterName.toLowerCase().includes(q);
        const matchesPurpose = order.purpose.toLowerCase().includes(q);
        const matchesItems = order.items.some(
          (it) => it.name.toLowerCase().includes(q) || it.technicalSpecs.toLowerCase().includes(q)
        );
        if (!matchesRef && !matchesRequester && !matchesPurpose && !matchesItems) {
          return false;
        }
      }

      // Site filter
      if (selectedSite !== 'ALL' && order.siteCode !== selectedSite) {
        return false;
      }

      // Dept filter
      if (selectedDept !== 'ALL' && order.departmentCode !== selectedDept) {
        return false;
      }

      // Priority filter (normalized: HIGH / MEDIUM / LOW)
      if (selectedPriority !== 'ALL') {
        const norm = normalizePriority(order.priority);
        if (norm !== selectedPriority) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'PENDING' && !order.status.startsWith('PENDING')) return false;
        if (selectedStatus === 'APPROVED' && order.status !== 'APPROVED_FOR_PO' && order.status !== 'PO_ISSUED') return false;
        if (selectedStatus === 'DELIVERED' && order.status !== 'DELIVERED_RECEIVED') return false;
        if (selectedStatus === 'REJECTED' && order.status !== 'REJECTED') return false;
      }

      return true;
    });
  }, [orders, searchQuery, selectedSite, selectedDept, selectedPriority, selectedStatus]);

  const handleCopyRef = (ref: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const exportCSV = () => {
    const headers = [
      'الرقم المرجعي',
      'تاريخ الطلب',
      'الموقع',
      'القسم',
      'مقدم الطلب',
      'الأولوية',
      'الحالة',
      'عدد الأصناف',
      'الغرض من الشراء',
    ];

    const rows = filteredOrders.map((o) => [
      o.referenceNumber,
      o.orderDate,
      o.siteCode,
      o.departmentCode,
      `"${o.requesterName}"`,
      getPriorityMeta(o.priority).label,
      o.status,
      o.items.length,
      `"${o.purpose.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WDM_Orders_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_DEPT_HEAD':
        return {
          text: 'بانتظار رئيس القسم',
          classes: 'bg-blue-100 text-blue-800 border-blue-200',
        };
      case 'PENDING_SITE_MANAGER':
        return {
          text: 'بانتظار مدير الموقع',
          classes: 'bg-amber-100 text-amber-800 border-amber-200',
        };
      case 'PENDING_GENERAL_MANAGER':
        return {
          text: 'بانتظار المدير العام',
          classes: 'bg-purple-100 text-purple-800 border-purple-200',
        };
      case 'APPROVED_FOR_PO':
        return {
          text: 'معتمد (بانتظار PO)',
          classes: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        };
      case 'PO_ISSUED':
        return {
          text: 'أمر شراء صادر (قيد الشحن)',
          classes: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        };
      case 'DELIVERED_RECEIVED':
        return {
          text: 'تم الاستلام والمخزن',
          classes: 'bg-teal-100 text-teal-800 border-teal-200',
        };
      case 'REJECTED':
        return {
          text: 'مرفوض',
          classes: 'bg-rose-100 text-rose-800 border-rose-200',
        };
      default:
        return {
          text: status,
          classes: 'bg-slate-100 text-slate-800 border-slate-200',
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6" id="orders-directory-container">
      {/* Header & Quick stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            <span>سجل ومتابعة طلبات المشتريات والتوريدات الميدانية</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            البحث الفوري بالرقم المرجعي الذكي (Smart Code) وتتبع دورة الاعتمادات ومسار الـ SLA
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Report PDF Button */}
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer border border-amber-600/30"
            title="توليد وتصدير ملف PDF يحتوي على جدول بجميع الطلبات الحالية لتسهيل الأرشفة والتقارير الدورية"
          >
            <FileText className="w-3.5 h-3.5 text-slate-950" />
            <span>تصدير التقرير (PDF)</span>
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition border border-slate-300"
            title="تصدير جدول الطلبات إلى ملف Excel/CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير تقرير CSV</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreate}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            + إنشاء طلب جديد
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-6 space-y-4">
        {/* Priority Classification Quick Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <SlidersHorizontal className="w-4 h-4 text-amber-600" />
            <span>تصنيف الطلبات حسب الأولوية:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* ALL */}
            <button
              type="button"
              onClick={() => setSelectedPriority('ALL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                selectedPriority === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span>جميع الطلبات</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedPriority === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {priorityCounts.ALL}
              </span>
            </button>

            {/* HIGH */}
            <button
              type="button"
              onClick={() => setSelectedPriority('HIGH')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                selectedPriority === 'HIGH'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-300'
                  : 'bg-rose-50/70 hover:bg-rose-100 text-rose-800 border-rose-200'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${selectedPriority === 'HIGH' ? 'text-white' : 'text-rose-600'}`} />
              <span>أولوية عالية</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedPriority === 'HIGH' ? 'bg-white/25 text-white' : 'bg-rose-200 text-rose-900'
              }`}>
                {priorityCounts.HIGH}
              </span>
            </button>

            {/* MEDIUM */}
            <button
              type="button"
              onClick={() => setSelectedPriority('MEDIUM')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                selectedPriority === 'MEDIUM'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-300'
                  : 'bg-amber-50/70 hover:bg-amber-100 text-amber-800 border-amber-200'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 ${selectedPriority === 'MEDIUM' ? 'text-white' : 'text-amber-600'}`} />
              <span>أولوية متوسطة</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedPriority === 'MEDIUM' ? 'bg-white/25 text-white' : 'bg-amber-200 text-amber-900'
              }`}>
                {priorityCounts.MEDIUM}
              </span>
            </button>

            {/* LOW */}
            <button
              type="button"
              onClick={() => setSelectedPriority('LOW')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                selectedPriority === 'LOW'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-300'
                  : 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
            >
              <ArrowDownCircle className={`w-3.5 h-3.5 ${selectedPriority === 'LOW' ? 'text-white' : 'text-emerald-600'}`} />
              <span>أولوية منخفضة</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedPriority === 'LOW' ? 'bg-white/25 text-white' : 'bg-emerald-200 text-emerald-900'
              }`}>
                {priorityCounts.LOW}
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالرقم المرجعي (مثل: WDM-MI26002) أو اسم الصنف..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
            />
          </div>

          {/* Site Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="ALL">جميع المواقع والمناجم</option>
              {sites.map((s) => (
                <option key={s.code} value={s.code}>
                  [{s.code}] {s.name.slice(0, 22)}...
                </option>
              ))}
            </select>
          </div>

          {/* Dept Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="ALL">جميع الأقسام</option>
              {departments.map((d) => (
                <option key={d.code} value={d.code}>
                  [{d.code}] {d.name.slice(0, 18)}...
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="ALL">جميع الأولويات</option>
              <option value="HIGH">🔴 أولوية عالية (High)</option>
              <option value="MEDIUM">🟡 أولوية متوسطة (Medium)</option>
              <option value="LOW">🟢 أولوية منخفضة (Low)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="ALL">جميع الحالات</option>
              <option value="PENDING">قيد الاعتمادات</option>
              <option value="APPROVED">معتمد للتوريد</option>
              <option value="DELIVERED">مستلم بالمستودع</option>
              <option value="REJECTED">مرفوض</option>
            </select>
          </div>
        </div>

        {/* Filter Counters */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <div>
            <span>تم العثور على: </span>
            <span className="font-bold text-slate-900">{filteredOrders.length} طلب</span>
          </div>

          {(searchQuery ||
            selectedSite !== 'ALL' ||
            selectedDept !== 'ALL' ||
            selectedPriority !== 'ALL' ||
            selectedStatus !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedSite('ALL');
                setSelectedDept('ALL');
                setSelectedPriority('ALL');
                setSelectedStatus('ALL');
              }}
              className="text-amber-700 hover:text-amber-900 font-bold transition text-[11px]"
            >
              إعادة ضبط الفلاتر ✕
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
              <tr>
                <th className="p-3.5">الرقم المرجعي الذكي</th>
                <th className="p-3.5">الموقع والقسم</th>
                <th className="p-3.5">التاريخ ومقدم الطلب</th>
                <th className="p-3.5">الأولوية والـ SLA</th>
                <th className="p-3.5">أبرز الأصناف المطلوبة</th>
                <th className="p-3.5">المرحلة والحالة الرقمية</th>
                <th className="p-3.5 text-center">إجراءات سريعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <p className="text-sm font-semibold">لا توجد طلبات مطابقة لمعايير البحث الحالية.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusInfo = getStatusBadge(order.status);
                  const isUrgent = order.priority === 'URGENT' || order.priority === 'EMERGENCY';

                  return (
                    <tr
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className="hover:bg-amber-50/40 cursor-pointer transition"
                    >
                      {/* Reference Code with Copy button */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black font-mono tracking-wider text-slate-950 text-sm bg-slate-100 px-2 py-1 rounded-md border border-slate-300">
                            {order.referenceNumber}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyRef(order.referenceNumber, e)}
                            className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded transition"
                            title="نسخ الرقم المرجعي"
                          >
                            {copiedRef === order.referenceNumber ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                          ID: {order.id}
                        </span>
                      </td>

                      {/* Site & Dept */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">
                          [{order.siteCode}] منجم الجكوب
                        </div>
                        <div className="text-[11px] text-slate-500">
                          قسم: {order.departmentCode} (العمليات التعدينية)
                        </div>
                      </td>

                      {/* Date & Requester */}
                      <td className="p-3.5">
                        <div className="font-mono text-slate-800">{order.orderDate}</div>
                        <div className="text-slate-600 font-medium">{order.requesterName}</div>
                      </td>

                      {/* Priority */}
                      <td className="p-3.5">
                        <div className="flex flex-col items-start gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <PriorityBadge priority={order.priority} size="sm" showSla={true} />
                          {onUpdatePriority && (
                            <div className="flex items-center gap-1 mt-0.5">
                              {(['HIGH', 'MEDIUM', 'LOW'] as NormalizedPriority[]).map((pKey) => {
                                const isCurrent = normalizePriority(order.priority) === pKey;
                                const pMeta = PRIORITY_METAS[pKey];
                                return (
                                  <button
                                    key={pKey}
                                    type="button"
                                    onClick={() => onUpdatePriority(order.id, pKey)}
                                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold border transition cursor-pointer ${
                                      isCurrent
                                        ? `${pMeta.badgeClasses} ring-1 ring-offset-0 font-black shadow-2xs`
                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                                    }`}
                                    title={`تغيير الأولوية إلى ${pMeta.fullLabel}`}
                                  >
                                    {pMeta.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="p-3.5 max-w-xs">
                        <div className="font-semibold text-slate-800 truncate">
                          {order.items[0]?.name || 'لا توجد أصناف'}
                        </div>
                        {order.items.length > 1 && (
                          <span className="text-[10px] text-amber-800 font-bold">
                            + {order.items.length - 1} أصناف إضافية
                          </span>
                        )}
                        <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                          {order.purpose}
                        </p>
                      </td>

                      {/* Status Badge */}
                      <td className="p-3.5">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusInfo.classes}`}
                        >
                          {statusInfo.text}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Copy WhatsApp / Member Read-Only Link */}
                          <button
                            type="button"
                            onClick={(e) => handleCopyMemberLink(order, e)}
                            className={`flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${
                              copiedMemberLink === order.referenceNumber
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}
                            title="نسخ رابط متابعة الأعضاء على واتساب (عرض حالة الطلب فقط دون أي صلاحيات أخرى)"
                          >
                            {copiedMemberLink === order.referenceNumber ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-white" />
                                <span>تم النسخ!</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                                <span>رابط للأعضاء</span>
                              </>
                            )}
                          </button>

                          {onOpenShareModal && (
                            <button
                              type="button"
                              onClick={() => onOpenShareModal(order)}
                              className="p-1.5 bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 rounded-lg border border-slate-300 hover:border-amber-300 transition cursor-pointer"
                              title="إدارة كافة الروابط ورمز QR والمشاركة المباشرة عبر واتساب"
                            >
                              <Share2 className="w-3.5 h-3.5 text-amber-600" />
                            </button>
                          )}

                          {onOpenMemberPortal && (
                            <button
                              type="button"
                              onClick={() => onOpenMemberPortal(order)}
                              className="p-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-lg border border-slate-300 hover:border-emerald-300 transition cursor-pointer"
                              title="معاينة ما يراه الأعضاء على الرابط (عرض فقط)"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onTrackOrder && (
                            <button
                              type="button"
                              onClick={() => onTrackOrder(order)}
                              className="flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-lg border border-amber-300 transition cursor-pointer text-xs"
                              title="تتبع مسار الطلب اللوجستي"
                            >
                              <span>تتبع</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onSelectOrder(order)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded-lg border border-blue-200 transition cursor-pointer text-xs"
                            title="تفاصيل الطلب والاعتماد"
                          >
                            اعتماد
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenPrintView(order)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition cursor-pointer"
                            title="معاينة وطباعة الاستمارة"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Report PDF Modal */}
      <OrdersReportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        orders={orders}
        filteredOrders={filteredOrders}
        sites={sites}
        departments={departments}
        onShowToast={onShowToast}
      />
    </div>
  );
};
