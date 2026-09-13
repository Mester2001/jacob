import React, { useState } from 'react';
import {
  X,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  Truck,
  PackageCheck,
  PenTool,
  ShieldCheck,
  Send,
  Building,
  User,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Order, UserRole, RoleDefinition, AppUser } from '../types';
import { DigitalSignaturePad } from './DigitalSignaturePad';
import { hasUserPermission, DEFAULT_ROLES } from '../data/permissionsData';
import { PriorityBadge } from './PriorityBadge';

interface OrderDetailsModalProps {
  order: Order;
  currentUserRole: UserRole;
  roles?: RoleDefinition[];
  activeUser?: AppUser;
  onNavigateToPermissions?: () => void;
  onClose: () => void;
  onApprove: (
    orderId: string,
    stage: 'DEPT_HEAD' | 'SITE_MANAGER' | 'GENERAL_MANAGER',
    approverName: string,
    signatureData: string,
    comments?: string
  ) => void;
  onReject: (orderId: string, reason: string) => void;
  onRequestModification: (orderId: string, note: string) => void;
  onIssuePO: (
    orderId: string,
    poData: { poNumber: string; vendor: string; shippingMethod: string; slaDays: number }
  ) => void;
  onReceiveDelivery: (orderId: string, receivedBy: string, receivingNotes: string) => void;
  onOpenPrintView: (order: Order) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  currentUserRole,
  roles = DEFAULT_ROLES,
  activeUser,
  onNavigateToPermissions,
  onClose,
  onApprove,
  onReject,
  onRequestModification,
  onIssuePO,
  onReceiveDelivery,
  onOpenPrintView,
}) => {
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [activeStageToSign, setActiveStageToSign] = useState<
    'DEPT_HEAD' | 'SITE_MANAGER' | 'GENERAL_MANAGER' | null
  >(null);
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);

  // PO issuance local form state
  const [poNumber, setPoNumber] = useState(`PO-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [vendor, setVendor] = useState('');
  const [shippingMethod, setShippingMethod] = useState('نقل بري سريع - شاحنة مغلقة');
  const [slaDays, setSlaDays] = useState(5);
  const [showPOForm, setShowPOForm] = useState(false);

  // Receiving local state
  const [receiverName, setReceiverName] = useState('أمين المستودع: عادل منصور');
  const [receivingNotes, setReceivingNotes] = useState(
    'تم مطابقة الأصناف والمواصفات الفنية مع الاستمارة وتم التخزين في المستودع الميداني.'
  );
  const [showReceivingForm, setShowReceivingForm] = useState(false);

  // Determine current approval stage
  const pendingApproval = order.approvals.find((a) => a.status === 'PENDING');

  // RBAC Permission checks
  const canApproveDept = hasUserPermission(currentUserRole, 'orders:approve_dept', roles, activeUser?.customPermissions);
  const canApproveSite = hasUserPermission(currentUserRole, 'orders:approve_site', roles, activeUser?.customPermissions);
  const canApproveGM = hasUserPermission(currentUserRole, 'orders:approve_gm', roles, activeUser?.customPermissions);
  const canReject = hasUserPermission(currentUserRole, 'orders:reject', roles, activeUser?.customPermissions);
  const canRequestMod = hasUserPermission(currentUserRole, 'orders:request_mod', roles, activeUser?.customPermissions);
  const canIssuePO = hasUserPermission(currentUserRole, 'logistics:issue_po', roles, activeUser?.customPermissions);
  const canReceiveDelivery = hasUserPermission(currentUserRole, 'logistics:warehouse_receive', roles, activeUser?.customPermissions);

  // Can the current user role approve this pending stage?
  const canApprove =
    currentUserRole === 'ADMIN' ||
    (pendingApproval?.stage === 'DEPT_HEAD' && canApproveDept) ||
    (pendingApproval?.stage === 'SITE_MANAGER' && canApproveSite) ||
    (pendingApproval?.stage === 'GENERAL_MANAGER' && canApproveGM);

  const handleStartSign = (stage: 'DEPT_HEAD' | 'SITE_MANAGER' | 'GENERAL_MANAGER') => {
    setActiveStageToSign(stage);
    setShowSignaturePad(true);
  };

  const handleCompleteSign = (signatureData: string) => {
    if (!activeStageToSign) return;
    const approverName =
      currentUserRole === 'DEPT_HEAD'
        ? 'د. م. أحمد صبري (مدير إدارة التعدين)'
        : currentUserRole === 'SITE_MANAGER'
        ? 'المهندس طارق رضوان (مدير مشروع الجكوب)'
        : currentUserRole === 'GENERAL_MANAGER'
        ? 'د. محمود الشرقاوي (المدير العام التنفيذي)'
        : 'مسؤول النظام المعتمد';

    onApprove(order.id, activeStageToSign, approverName, signatureData, approvalComments);
    setShowSignaturePad(false);
    setActiveStageToSign(null);
    setApprovalComments('');
  };

  const handlePOIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor.trim()) {
      alert('يرجى تحديد اسم المورد المعتمد.');
      return;
    }
    onIssuePO(order.id, { poNumber, vendor, shippingMethod, slaDays });
    setShowPOForm(false);
  };

  const handleReceiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onReceiveDelivery(order.id, receiverName, receivingNotes);
    setShowReceivingForm(false);
  };

  // 5 stages status calculation
  const getStageStatus = (stageIndex: number) => {
    // 0: Created
    // 1: Routed
    // 2: Approvals (Dept Head, Site Manager, GM)
    // 3: PO Issued
    // 4: Received
    if (stageIndex === 0) return 'COMPLETED';
    if (stageIndex === 1) return 'COMPLETED';

    if (stageIndex === 2) {
      if (
        order.status === 'APPROVED_FOR_PO' ||
        order.status === 'PO_ISSUED' ||
        order.status === 'DELIVERED_RECEIVED'
      )
        return 'COMPLETED';
      if (order.status === 'REJECTED') return 'REJECTED';
      return 'IN_PROGRESS';
    }

    if (stageIndex === 3) {
      if (order.status === 'PO_ISSUED' || order.status === 'DELIVERED_RECEIVED') return 'COMPLETED';
      if (order.status === 'APPROVED_FOR_PO') return 'READY';
      return 'WAITING';
    }

    if (stageIndex === 4) {
      if (order.status === 'DELIVERED_RECEIVED') return 'COMPLETED';
      if (order.status === 'PO_ISSUED') return 'READY';
      return 'WAITING';
    }

    return 'WAITING';
  };

  const estimatedTotal = order.items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.estimatedUnitPrice || 0),
    0
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto no-print"
      id="order-details-modal"
    >
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center font-mono font-black text-sm shadow-md">
              {order.siteCode}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black font-mono tracking-wider text-amber-400">
                  {order.referenceNumber}
                </span>
                <PriorityBadge priority={order.priority} size="sm" showSla={true} />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تاريخ الطلب: {order.orderDate} • مقدم الطلب: {order.requesterName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenPrintView(order)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition shadow-xs"
              title="طباعة الاستمارة الرسمية كفاتورة وطلب شراء"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة الاستمارة الرسمية</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Urgent / Escalation Banner */}
          {order.urgencyAlertSent && order.status.startsWith('PENDING') && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-start justify-between gap-3 text-amber-900 text-xs">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-amber-950">
                    تنبيه أولوية عاجلة ومتابعة دورة الاعتماد (SLA Active)
                  </h4>
                  <p className="mt-0.5 text-amber-800">
                    تم توجيه هذا الطلب بأولوية قصوى وتفعيل مهلة الـ 24 ساعة. في حال تجاوز المهلة،
                    يقوم النظام بالتصعيد الآلي للمستوى الإداري الأعلى لضمان عدم توقف العمليات الميدانية.
                  </p>
                </div>
              </div>
              <span className="bg-amber-200 text-amber-900 text-[10px] font-mono font-bold px-2 py-1 rounded">
                SLA: 24h
              </span>
            </div>
          )}

          {/* 5-Stage Visual Workflow Stepper */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
              مسار عمل الطلب الرقمي المؤتمت (5-Stage Logistics Workflow)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
              {/* Step 1 */}
              <div
                className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                  getStageStatus(0) === 'COMPLETED'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">1. إنشاء الطلب</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {order.referenceNumber}
                </span>
              </div>

              {/* Step 2 */}
              <div
                className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                  getStageStatus(1) === 'COMPLETED'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">2. التحقق والتوجيه</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-[10px] text-slate-500">توجيه آلي للأقسام</span>
              </div>

              {/* Step 3 */}
              <div
                className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                  getStageStatus(2) === 'COMPLETED'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : getStageStatus(2) === 'IN_PROGRESS'
                    ? 'bg-blue-50 border-blue-300 text-blue-900 ring-2 ring-blue-400'
                    : getStageStatus(2) === 'REJECTED'
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">3. دورة الاعتمادات</span>
                  {getStageStatus(2) === 'COMPLETED' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <span className="text-[10px] text-slate-500">
                  {order.status === 'PENDING_DEPT_HEAD'
                    ? 'بانتظار رئيس القسم'
                    : order.status === 'PENDING_SITE_MANAGER'
                    ? 'بانتظار مدير الموقع'
                    : order.status === 'PENDING_GENERAL_MANAGER'
                    ? 'بانتظار المدير العام'
                    : 'تم اعتمادها بالكامل'}
                </span>
              </div>

              {/* Step 4 */}
              <div
                className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                  getStageStatus(3) === 'COMPLETED'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : getStageStatus(3) === 'READY'
                    ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-400'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">4. أمر الشراء (PO)</span>
                  <Truck className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-[10px] text-slate-500">
                  {order.logistics?.poNumber || 'بانتظار إصدار أمر الشراء'}
                </span>
              </div>

              {/* Step 5 */}
              <div
                className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                  getStageStatus(4) === 'COMPLETED'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : getStageStatus(4) === 'READY'
                    ? 'bg-cyan-50 border-cyan-300 text-cyan-900 ring-2 ring-cyan-400'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">5. الاستلام والمخزن</span>
                  <PackageCheck className="w-4 h-4 text-cyan-600" />
                </div>
                <span className="text-[10px] text-slate-500">
                  {order.logistics?.receivedDate ? 'تم الاستلام وإدخال المخزن' : 'قيد الشحن والتوريد'}
                </span>
              </div>
            </div>
          </div>

          {/* Details Overview Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-semibold flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  الموقع / المنجم:
                </span>
                <span className="font-bold text-slate-900">
                  [{order.siteCode}] منجم الصحراء الغربية (مشروع الجكوب)
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-semibold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  القسم الطالب:
                </span>
                <span className="font-bold text-slate-900">
                  [{order.departmentCode}] العمليات التعدينية والتجهيز
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-semibold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  مقدم الطلب:
                </span>
                <span className="font-bold text-slate-900">{order.requesterName}</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div>
                <span className="font-semibold text-slate-600 block mb-1">
                  الغرض من الشراء والمبرر الفني:
                </span>
                <p className="text-slate-800 leading-relaxed font-medium bg-white p-2.5 rounded-lg border border-slate-200">
                  {order.purpose}
                </p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800">
                قائمة الأصناف والمواصفات الفنية المطلوبة ({order.items.length})
              </h4>
              <span className="text-xs font-mono font-bold text-emerald-800">
                الإجمالي التقديري: ${estimatedTotal.toLocaleString()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">اسم الصنف (كتالوج)</th>
                    <th className="p-3">المواصفات الفنية المعتمدة</th>
                    <th className="p-3 text-center w-24">الكمية</th>
                    <th className="p-3 text-center w-20">الوحدة</th>
                    <th className="p-3 text-center w-28">السعر التقديري</th>
                    <th className="p-3">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="p-3 text-center font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="p-3 font-bold text-slate-900">
                        <div>{item.name}</div>
                        {item.catalogId && (
                          <span className="text-[10px] text-amber-700 font-mono">
                            {item.catalogId}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 font-mono text-[11px] max-w-xs leading-relaxed">
                        {item.technicalSpecs}
                      </td>
                      <td className="p-3 text-center font-bold text-sm text-slate-900 font-mono">
                        {item.quantity}
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                          {item.unit}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-slate-700">
                        ${item.estimatedUnitPrice?.toLocaleString() || '0'}
                      </td>
                      <td className="p-3 text-slate-500 text-[11px]">{item.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: 4-Level Digital Approval Chain */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  <span>دورة التوقيعات والاعتمادات الرقمية (Digital Approvals Chain)</span>
                </h4>
                <p className="text-xs text-slate-500">
                  مقدم الطلب ➔ رئيس القسم ➔ مدير الموقع ➔ المدير العام
                </p>
              </div>

              <div className="text-xs">
                <span className="text-slate-500">دورك الحالي: </span>
                <span className="font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {currentUserRole}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {order.approvals.map((appr, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-4 text-xs flex flex-col justify-between transition ${
                    appr.status === 'APPROVED'
                      ? 'bg-emerald-50/60 border-emerald-300'
                      : appr.status === 'REJECTED'
                      ? 'bg-rose-50 border-rose-300'
                      : appr.status === 'PENDING' && pendingApproval?.stage === appr.stage
                      ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/50'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-900">{appr.roleName}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          appr.status === 'APPROVED'
                            ? 'bg-emerald-200 text-emerald-900'
                            : appr.status === 'REJECTED'
                            ? 'bg-rose-200 text-rose-900'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {appr.status === 'APPROVED'
                          ? 'معتمد وموقّع'
                          : appr.status === 'REJECTED'
                          ? 'مرفوض'
                          : 'قيد الاعتماد'}
                      </span>
                    </div>

                    <div className="text-slate-700 font-medium mb-2">{appr.approverName}</div>

                    {appr.comments && (
                      <div className="bg-white/80 p-2 rounded-md border border-slate-200 text-[11px] text-slate-600 mb-2 italic">
                        "{appr.comments}"
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/80">
                    {appr.status === 'APPROVED' ? (
                      <div className="flex items-center justify-between text-[11px] text-emerald-800">
                        <span className="flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ختم موثق إلكترونياً
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {appr.timestamp?.split('T')[0]}
                        </span>
                      </div>
                    ) : appr.status === 'PENDING' && pendingApproval?.stage === appr.stage ? (
                      <div>
                        {canApprove ? (
                          <button
                            type="button"
                            onClick={() => handleStartSign(appr.stage as any)}
                            className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                            <span>توقيع واعتماد بصفتي {appr.roleName}</span>
                          </button>
                        ) : (
                          <div className="text-center text-amber-800 text-[11px] py-1.5 px-2 bg-amber-100/70 border border-amber-200/80 rounded-lg font-medium space-y-1">
                            <div>بانتظار اعتماد {appr.roleName}</div>
                            <div className="text-[10px] text-slate-500">
                              (يتطلب صلاحية: {appr.stage === 'DEPT_HEAD' ? 'اعتماد رئيس القسم' : appr.stage === 'SITE_MANAGER' ? 'اعتماد مدير الموقع' : 'الاعتماد المالي للمدير العام'})
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 text-center py-1">
                        بانتظار المراحل السابقة
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Active Signing Pad Drawer */}
            {showSignaturePad && activeStageToSign && (
              <div className="mt-6 p-4 bg-blue-50/60 border-2 border-blue-300 rounded-2xl">
                <div className="mb-3">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    ملاحظات أو توصيات الاعتماد (اختياري):
                  </label>
                  <input
                    type="text"
                    value={approvalComments}
                    onChange={(e) => setApprovalComments(e.target.value)}
                    placeholder="مثال: تم تدقيق الأسعار والمواصفات الفنية مع إدارة المشروعات ومعتمد للتنفيذ."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none mb-3"
                  />
                </div>

                <DigitalSignaturePad
                  signerName={
                    currentUserRole === 'DEPT_HEAD'
                      ? 'د. م. أحمد صبري'
                      : currentUserRole === 'SITE_MANAGER'
                      ? 'المهندس طارق رضوان'
                      : currentUserRole === 'GENERAL_MANAGER'
                      ? 'د. محمود الشرقاوي'
                      : 'مدير النظام'
                  }
                  roleTitle={
                    activeStageToSign === 'DEPT_HEAD'
                      ? 'رئيس قسم التعدين والعمليات'
                      : activeStageToSign === 'SITE_MANAGER'
                      ? 'مدير موقع منجم الجكوب'
                      : 'المدير العام والاعتماد المالي'
                  }
                  onSaveSignature={handleCompleteSign}
                  onCancel={() => {
                    setShowSignaturePad(false);
                    setActiveStageToSign(null);
                  }}
                />

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-blue-200">
                  <button
                    type="button"
                    onClick={() => setShowRejectBox(!showRejectBox)}
                    className="text-rose-700 hover:text-rose-900 text-xs font-bold transition"
                  >
                    أو رفض الطلب / طلب تعديل؟
                  </button>
                </div>

                {showRejectBox && (
                  <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                    <label className="block text-xs font-bold text-rose-900">
                      سبب الرفض أو التعديل المطلوب:
                    </label>
                    <textarea
                      rows={2}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="يرجى ذكر سبب الرفض أو البيانات الناقصة بدقة..."
                      className="w-full bg-white border border-rose-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!rejectReason.trim()) {
                            alert('يرجى كتابة سبب طلب التعديل.');
                            return;
                          }
                          onRequestModification(order.id, rejectReason);
                        }}
                        className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition"
                      >
                        إرجاع لمقدم الطلب للتعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!rejectReason.trim()) {
                            alert('يرجى كتابة سبب الرفض.');
                            return;
                          }
                          onReject(order.id, rejectReason);
                        }}
                        className="px-3 py-1.5 bg-rose-700 text-white rounded-lg text-xs font-bold hover:bg-rose-800 transition"
                      >
                        رفض الطلب نهائياً
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: PO & Logistics Management (Enabled once approved by GM) */}
          {(order.status === 'APPROVED_FOR_PO' ||
            order.status === 'PO_ISSUED' ||
            order.status === 'DELIVERED_RECEIVED') && (
            <div className="bg-amber-50/50 border-2 border-amber-300/80 rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-amber-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      التنفيذ اللوجستي وأمر الشراء (Procurement & Logistics Execution)
                    </h4>
                    <p className="text-xs text-slate-600">
                      تم اعتماد الطلب مالياً وإدارياً وهو جاهز للتوريد والتسليم
                    </p>
                  </div>
                </div>

                {order.status === 'APPROVED_FOR_PO' && !showPOForm && (
                  canIssuePO ? (
                    <button
                      type="button"
                      onClick={() => setShowPOForm(true)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>إصدار أمر الشراء (Generate PO)</span>
                    </button>
                  ) : (
                    <div className="bg-slate-100 border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium">
                      🔒 يتطلب إصدار أمر الشراء صلاحية [مسؤول اللوجستيات]
                    </div>
                  )
                )}

                {order.status === 'PO_ISSUED' && !showReceivingForm && (
                  canReceiveDelivery ? (
                    <button
                      type="button"
                      onClick={() => setShowReceivingForm(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>تأكيد الاستلام بالمستودع وتحديث المخزون</span>
                    </button>
                  ) : (
                    <div className="bg-slate-100 border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium">
                      🔒 يتطلب تأكيد الاستلام صلاحية [أمين المستودع]
                    </div>
                  )
                )}
              </div>

              {/* Form to issue PO */}
              {showPOForm && (
                <form
                  onSubmit={handlePOIssueSubmit}
                  className="bg-white p-4 rounded-xl border border-amber-300 space-y-3 mb-4"
                >
                  <h5 className="font-bold text-xs text-slate-800">
                    بيانات أمر الشراء والتوريد للمورد المعتمد:
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        رقم أمر الشراء (PO #)
                      </label>
                      <input
                        type="text"
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                        className="w-full border rounded-lg p-2 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        اسم المورد المعتمد *
                      </label>
                      <input
                        type="text"
                        value={vendor}
                        onChange={(e) => setVendor(e.target.value)}
                        placeholder="شركة التعدين والمهمات الهندسية"
                        className="w-full border rounded-lg p-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        طريقة الشحن والنقل
                      </label>
                      <select
                        value={shippingMethod}
                        onChange={(e) => setShippingMethod(e.target.value)}
                        className="w-full border rounded-lg p-2 font-medium"
                      >
                        <option value="نقل بري سريع - شاحنة مغلقة">نقل بري سريع - شاحنة مغلقة</option>
                        <option value="شحن جوي سريع - طوارئ">شحن جوي سريع - طوارئ</option>
                        <option value="نقل بمقطورة ثقيلة - مخصصة">نقل بمقطورة ثقيلة - مخصصة</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        المهلة الزمنية للتوريد (أيام)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={slaDays}
                        onChange={(e) => setSlaDays(parseInt(e.target.value, 10) || 3)}
                        className="w-full border rounded-lg p-2 font-mono text-center font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPOForm(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs"
                    >
                      تأكيد إصدار أمر الشراء وإرساله للمورد
                    </button>
                  </div>
                </form>
              )}

              {/* Form to Receive Delivery */}
              {showReceivingForm && (
                <form
                  onSubmit={handleReceiveSubmit}
                  className="bg-white p-4 rounded-xl border border-emerald-300 space-y-3 mb-4"
                >
                  <h5 className="font-bold text-xs text-slate-800">
                    محضر فحص واستلام الأصناف بالمستودع الميداني:
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        اسم المستلم وصفته
                      </label>
                      <input
                        type="text"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        className="w-full border rounded-lg p-2 font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        ملاحظات الفحص والمطابقة المخزنية
                      </label>
                      <input
                        type="text"
                        value={receivingNotes}
                        onChange={(e) => setReceivingNotes(e.target.value)}
                        className="w-full border rounded-lg p-2"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowReceivingForm(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs"
                    >
                      تأكيد مطابقة الأصناف وإغلاق الطلب وتحديث الرصيد المخزني
                    </button>
                  </div>
                </form>
              )}

              {/* Display existing logistics data */}
              {order.logistics && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">أمر الشراء:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {order.logistics.poNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">المورد المعتمد:</span>
                    <span className="font-semibold text-slate-800">{order.logistics.vendor}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">حالة الاستلام والمخزن:</span>
                    <span
                      className={`font-bold inline-flex items-center gap-1 ${
                        order.logistics.inventoryUpdated ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {order.logistics.inventoryUpdated ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          تم الاستلام وتحديث الرصيد المخزني
                        </>
                      ) : (
                        'قيد الشحن والتوصيل'
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => onOpenPrintView(order)}
            className="text-xs font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>عرض استمارة الجكوب الميدانية للطباعة أو التصدير كـ PDF</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
