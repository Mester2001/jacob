import React, { useState, useRef, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  X,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  ShieldCheck,
  Layers,
  Loader2,
  Sparkles,
  Filter,
  Check,
} from 'lucide-react';
import { Order, Site, Department, OrderStatus } from '../types';
import { getPriorityMeta, normalizePriority } from '../utils/priority';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

interface OrdersReportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  filteredOrders: Order[];
  sites: Site[];
  departments: Department[];
  onShowToast?: (text: string, type?: 'success' | 'warning' | 'info') => void;
}

export const OrdersReportPdfModal: React.FC<OrdersReportPdfModalProps> = ({
  isOpen,
  onClose,
  orders,
  filteredOrders,
  sites,
  departments,
  onShowToast,
}) => {
  const [reportScope, setReportScope] = useState<'ALL' | 'FILTERED'>('ALL');
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Selected orders based on scope
  const targetOrders = useMemo(() => {
    return reportScope === 'FILTERED' ? filteredOrders : orders;
  }, [reportScope, filteredOrders, orders]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let highPriorityCount = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let deliveredCount = 0;
    let totalItems = 0;

    targetOrders.forEach((ord) => {
      const normPri = normalizePriority(ord.priority);
      if (normPri === 'HIGH') highPriorityCount++;

      if (ord.status.startsWith('PENDING') || ord.status === 'DRAFT') {
        pendingCount++;
      } else if (ord.status === 'APPROVED_FOR_PO' || ord.status === 'PO_ISSUED') {
        approvedCount++;
      } else if (ord.status === 'DELIVERED_RECEIVED') {
        deliveredCount++;
      }

      totalItems += ord.items?.length || 0;
    });

    return {
      totalOrders: targetOrders.length,
      highPriorityCount,
      pendingCount,
      approvedCount,
      deliveredCount,
      totalItems,
    };
  }, [targetOrders]);

  // Generation timestamp
  const generationDate = useMemo(() => {
    const now = new Date();
    return {
      date: now.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: now.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      isoDate: now.toISOString().split('T')[0],
      code: `RPT-WDM-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
    };
  }, [isOpen]);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING_DEPT_HEAD':
        return { label: 'بانتظار رئيس القسم', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'PENDING_SITE_MANAGER':
        return { label: 'بانتظار مدير الموقع', color: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'PENDING_GENERAL_MANAGER':
        return { label: 'بانتظار المدير العام', color: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'APPROVED_FOR_PO':
        return { label: 'معتمد (بانتظار PO)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'PO_ISSUED':
        return { label: 'أمر شراء صادر (قيد التوريد)', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
      case 'DELIVERED_RECEIVED':
        return { label: 'تم الاستلام والتوريد', color: 'bg-teal-100 text-teal-800 border-teal-300' };
      case 'REJECTED':
        return { label: 'مرفوض', color: 'bg-rose-100 text-rose-800 border-rose-300' };
      case 'MODIFICATION_REQUESTED':
        return { label: 'مطلوب تعديل', color: 'bg-orange-100 text-orange-800 border-orange-300' };
      default:
        return { label: status, color: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  const getSiteName = (code: string) => {
    return sites.find((s) => s.code === code)?.name || code;
  };

  const getDeptName = (code: string, fallback?: string) => {
    return departments.find((d) => d.code === code)?.name || fallback || code;
  };

  // Generate & Download PDF using html2canvas & jsPDF
  const handleGeneratePdf = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    setDownloadSuccess(false);

    try {
      const element = reportRef.current;

      // Ensure fonts are completely ready before generating canvas
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // Render the report element at 2x scale for crisp, sharp text
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1280,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          const reportEl = clonedDoc.getElementById('printable-orders-report');
          if (reportEl) {
            reportEl.style.fontFamily = "'Cairo', 'Segoe UI', Tahoma, sans-serif";
            const allElements = reportEl.querySelectorAll('*');
            allElements.forEach((node) => {
              const el = node as HTMLElement;
              el.style.letterSpacing = '0px';
              if (!el.classList.contains('font-mono')) {
                el.style.fontFamily = "'Cairo', 'Segoe UI', Tahoma, sans-serif";
              }
            });
          }
        },
      });

      // A4 Landscape: 297mm x 210mm
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = 297;
      const pdfHeight = 210;
      const margin = 6;
      const printWidth = pdfWidth - margin * 2;
      const printHeight = pdfHeight - margin * 2;

      // Pixel height corresponding to one PDF page's printable height:
      const pageCanvasHeight = Math.floor((canvas.width * printHeight) / printWidth);
      const totalPages = Math.ceil(canvas.height / pageCanvasHeight) || 1;

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        const sourceY = i * pageCanvasHeight;
        const sourceHeight = Math.min(pageCanvasHeight, canvas.height - sourceY);

        // Create a temporary canvas for this page slice
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;

        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            sourceY,
            canvas.width,
            sourceHeight,
            0,
            0,
            canvas.width,
            sourceHeight
          );
        }

        const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.98);
        const sliceMmHeight = (sourceHeight * printWidth) / canvas.width;

        pdf.addImage(
          pageImgData,
          'JPEG',
          margin,
          margin,
          printWidth,
          sliceMmHeight,
          undefined,
          'FAST'
        );
      }

      const filename = `تقرير_طلبات_الشراء_الميدانية_${generationDate.isoDate}.pdf`;
      pdf.save(filename);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);

      if (onShowToast) {
        onShowToast(`تم بنجاح توليد وتحميل ملف PDF: ${filename}`, 'success');
      }
    } catch (err) {
      console.error('Error generating PDF report:', err);
      // Fallback: trigger browser print with landscape orientation
      handlePrint();
      if (onShowToast) {
        onShowToast('تم فتح نافذة الطباعة والحفظ كـ PDF للمتصفح كبديل فوري', 'info');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Native Print / Save as PDF
  const handlePrint = () => {
    // Dynamically inject print landscape style for the orders ledger
    const styleId = 'report-print-page-style';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = '@media print { @page { size: landscape; margin: 6mm; } }';

    window.print();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto animate-fadeIn print:static print:inset-auto print:bg-transparent print:backdrop-blur-none print:p-0 print:m-0 print:overflow-visible print:z-auto"
      dir="rtl"
      id="orders-report-pdf-modal"
    >
      <div className="bg-slate-100 rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col border border-slate-700 print:max-h-none print:h-auto print:overflow-visible print:bg-transparent print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none">
        {/* Top Control Bar (Non-printable) */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-white">
                  تقرير حصر وأرشفة طلبات الشراء (PDF)
                </span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                  جاهز للتصدير
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                توليد ملف PDF رسمي يحتوي على جدول بجميع الطلبات الحالية لتسهيل الأرشفة والتقارير الدورية
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Scope Filter Switcher */}
            <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setReportScope('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  reportScope === 'ALL'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                جميع الطلبات ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setReportScope('FILTERED')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  reportScope === 'FILTERED'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                الطلبات المفلترة ({filteredOrders.length})
              </button>
            </div>

            {/* Print / Save as PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              title="طباعة أو حفظ عبر نافذة طباعة المتصفح (حفظ كـ PDF)"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>طباعة / حفظ PDF</span>
            </button>

            {/* Generate & Download PDF Button */}
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGeneratePdf}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
              title="توليد وتنزيل ملف PDF رسمي فوري للأرشفة"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري التوليد...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-950 stroke-[3]" />
                  <span>تم التنزيل!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>تنزيل ملف PDF</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
              title="إغلاق المعاينة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container with Printable Document Preview */}
        <div className="p-3 sm:p-6 overflow-y-auto bg-slate-200/90 flex-1 print:p-0 print:bg-transparent print:overflow-visible">
          {/* Printable A4 Landscape Document */}
          <div
            ref={reportRef}
            id="orders-report-printable-area"
            className="bg-white text-slate-900 rounded-xl shadow-lg p-6 sm:p-8 mx-auto border border-slate-300 print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none min-w-[980px] max-w-5xl print:min-w-0 print:w-full print:max-w-none"
            style={{ width: '100%' }}
          >
            {/* Document Header */}
            <div className="border-b-2 border-slate-900 pb-5 mb-5">
              <div className="flex items-start justify-between gap-4">
                {/* Right: Company Logo & Details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-xs">
                      WDM
                    </div>
                    <div>
                      <h1 className="text-base font-black text-slate-900 leading-tight">
                        شركة الجكوب للتعدين المحدودة
                      </h1>
                      <p className="text-[11px] font-bold text-slate-600">
                        مشروع منجم الجكوب للذهب والتعدين الميداني
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 pr-1">
                    إدارة المشتريات وسلاسل الإمداد والتوريدات الميدانية • ولاية نهر النيل / عطبرة
                  </p>
                </div>

                {/* Center: Title */}
                <div className="text-center px-4">
                  <span className="inline-block bg-slate-900 text-amber-400 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider mb-1">
                    وثيقة أرشفة وتقارير دورية رسمية
                  </span>
                  <h2 className="text-lg font-black text-slate-900">
                    تقرير حصر ومتابعة طلبات الشراء والتوريدات
                  </h2>
                  <p className="text-[11px] font-mono text-slate-600 tracking-wide">
                    PURCHASE REQUISITIONS & LOGISTICS TRACKING REPORT
                  </p>
                </div>

                {/* Left: Metadata & Stamp */}
                <div className="text-left font-mono text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200 shrink-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 text-[10px] font-sans">كود التقرير:</span>
                    <strong className="text-slate-900 text-[11px]">{generationDate.code}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 text-[10px] font-sans">تاريخ الإصدار:</span>
                    <span className="text-slate-800 text-[11px]">{generationDate.date}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 text-[10px] font-sans">وقت التوليد:</span>
                    <span className="text-slate-800 text-[11px]">{generationDate.time}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 text-[10px] font-sans">نطاق الحصر:</span>
                    <span className="font-sans font-bold text-amber-700 text-[10px] bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                      {reportScope === 'ALL' ? 'كافة طلبات المنظومة' : 'الطلبات المفلترة'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Executive Summary Metrics Grid */}
            <div className="grid grid-cols-6 gap-2.5 mb-6 text-center">
              <div className="bg-slate-100/90 p-2.5 rounded-xl border border-slate-300">
                <span className="text-[10px] font-bold text-slate-600 block">إجمالي الطلبات</span>
                <span className="text-xl font-black text-slate-900 font-mono">
                  {metrics.totalOrders}
                </span>
              </div>

              <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                <span className="text-[10px] font-bold text-rose-800 block">أولوية عالية / طارئة</span>
                <span className="text-xl font-black text-rose-700 font-mono">
                  {metrics.highPriorityCount}
                </span>
              </div>

              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                <span className="text-[10px] font-bold text-amber-800 block">قيد دورة الاعتمادات</span>
                <span className="text-xl font-black text-amber-700 font-mono">
                  {metrics.pendingCount}
                </span>
              </div>

              <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-200">
                <span className="text-[10px] font-bold text-indigo-800 block">معتمد / قيد التوريد</span>
                <span className="text-xl font-black text-indigo-700 font-mono">
                  {metrics.approvedCount}
                </span>
              </div>

              <div className="bg-teal-50 p-2.5 rounded-xl border border-teal-200">
                <span className="text-[10px] font-bold text-teal-800 block">تم الاستلام بالمخزن</span>
                <span className="text-xl font-black text-teal-700 font-mono">
                  {metrics.deliveredCount}
                </span>
              </div>

              <div className="bg-slate-100/90 p-2.5 rounded-xl border border-slate-300">
                <span className="text-[10px] font-bold text-slate-600 block">إجمالي بنود الأصناف</span>
                <span className="text-xl font-black text-slate-900 font-mono">
                  {metrics.totalItems}
                </span>
              </div>
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-300 mb-6">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black text-[11px]">
                    <th className="py-2.5 px-2 text-center border-l border-slate-800 w-10">م</th>
                    <th className="py-2.5 px-2.5 border-l border-slate-800">الرقم المرجعي</th>
                    <th className="py-2.5 px-2.5 border-l border-slate-800">التاريخ</th>
                    <th className="py-2.5 px-2.5 border-l border-slate-800">الموقع / المنجم</th>
                    <th className="py-2.5 px-2.5 border-l border-slate-800">القسم الطالب</th>
                    <th className="py-2.5 px-2.5 border-l border-slate-800">مقدم الطلب</th>
                    <th className="py-2.5 px-3 border-l border-slate-800">الغرض من الشراء والملاحظات</th>
                    <th className="py-2.5 px-2 text-center border-l border-slate-800 w-16">الأصناف</th>
                    <th className="py-2.5 px-2.5 border-l border-slate-800 text-center">الأولوية</th>
                    <th className="py-2.5 px-2.5 text-center">الحالة التنفيذية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {targetOrders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-400 font-bold">
                        لا توجد طلبات متطابقة مع شروط التقرير المحددة.
                      </td>
                    </tr>
                  ) : (
                    targetOrders.map((order, index) => {
                      const priorityMeta = getPriorityMeta(order.priority);
                      const statusMeta = getStatusBadge(order.status);
                      const isEven = index % 2 === 0;

                      return (
                        <tr
                          key={order.id || order.referenceNumber}
                          className={`${isEven ? 'bg-white' : 'bg-slate-50/80'} hover:bg-amber-50/40 transition`}
                        >
                          {/* Sequence Number */}
                          <td className="py-2 px-2 text-center font-mono font-bold text-slate-500 border-l border-slate-200">
                            {index + 1}
                          </td>

                          {/* Reference Number */}
                          <td className="py-2 px-2.5 font-mono font-black text-slate-900 border-l border-slate-200 whitespace-nowrap">
                            {order.referenceNumber}
                          </td>

                          {/* Order Date */}
                          <td className="py-2 px-2.5 font-mono text-slate-700 border-l border-slate-200 whitespace-nowrap text-[11px]">
                            {order.orderDate}
                          </td>

                          {/* Site */}
                          <td className="py-2 px-2.5 border-l border-slate-200 whitespace-nowrap text-[11px]">
                            <span className="font-bold text-slate-800">
                              {getSiteName(order.siteCode)}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              ({order.siteCode})
                            </span>
                          </td>

                          {/* Department */}
                          <td className="py-2 px-2.5 border-l border-slate-200 whitespace-nowrap text-[11px]">
                            <span className="font-bold text-slate-800">
                              {getDeptName(order.departmentCode, order.departmentName)}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              ({order.departmentCode})
                            </span>
                          </td>

                          {/* Requester */}
                          <td className="py-2 px-2.5 font-bold text-slate-800 border-l border-slate-200 whitespace-nowrap text-[11px]">
                            {order.requesterName}
                          </td>

                          {/* Purpose */}
                          <td className="py-2 px-3 text-slate-700 border-l border-slate-200 max-w-xs text-[11px] leading-snug">
                            <div className="line-clamp-2" title={order.purpose}>
                              {order.purpose}
                            </div>
                          </td>

                          {/* Items count */}
                          <td className="py-2 px-2 text-center font-bold font-mono text-slate-800 border-l border-slate-200 text-[11px]">
                            <span className="inline-block bg-slate-200 px-2 py-0.5 rounded-md">
                              {order.items?.length || 0}
                            </span>
                          </td>

                          {/* Priority */}
                          <td className="py-2 px-2.5 border-l border-slate-200 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black border ${
                                priorityMeta.badgeClasses || 'bg-slate-100 text-slate-800 border-slate-200'
                              }`}
                            >
                              {priorityMeta.label}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-2 px-2.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusMeta.color}`}
                            >
                              {statusMeta.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Official Signatures & Archiving Footer */}
            <div className="border-t-2 border-slate-900 pt-5 mt-4">
              <div className="grid grid-cols-3 gap-6 text-center text-xs">
                {/* 1. Logistics Officer */}
                <div className="border border-slate-300 rounded-xl p-3 bg-slate-50">
                  <span className="font-black text-slate-900 block mb-1">
                    إعداد ومتابعة المشتريات
                  </span>
                  <span className="text-[11px] text-slate-500 block mb-4">
                    مسؤول التوريدات وسلاسل الإمداد الميداني
                  </span>
                  <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1 text-slate-400 text-[10px]">
                    [التوقيع والختم الإلكتروني]
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">التاريخ: {generationDate.date}</span>
                </div>

                {/* 2. Site Manager */}
                <div className="border border-slate-300 rounded-xl p-3 bg-slate-50">
                  <span className="font-black text-slate-900 block mb-1">
                    تدقيق ومطابقة العمليات
                  </span>
                  <span className="text-[11px] text-slate-500 block mb-4">
                    مدير الموقع والعمليات التعدينية الميدانية
                  </span>
                  <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1 text-slate-400 text-[10px]">
                    [التوقيع والختم الإلكتروني]
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">التاريخ: {generationDate.date}</span>
                </div>

                {/* 3. General Manager / Auditor */}
                <div className="border border-slate-300 rounded-xl p-3 bg-slate-50">
                  <span className="font-black text-slate-900 block mb-1">
                    الاعتماد والأرشفة الرسمية
                  </span>
                  <span className="text-[11px] text-slate-500 block mb-4">
                    المدير العام / التدقيق والرقابة المالية
                  </span>
                  <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1 text-slate-400 text-[10px]">
                    [التوقيع والختم الإلكتروني]
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">التاريخ: {generationDate.date}</span>
                </div>
              </div>

              {/* Legal & Archival Disclaimer */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تم توليد هذا التقرير آلياً وموثق بقاعدة بيانات Firebase - مشروع منجم الجكوب</span>
                </div>
                <div className="font-mono text-[10px] text-slate-400 mt-1 sm:mt-0">
                  REF: {generationDate.code} • PAGE 1 OF 1 • A4 LANDSCAPE ARCHIVE
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
