import React, { useState } from 'react';
import {
  MessageSquare,
  Check,
  Share2,
  Clock,
  Lock,
  Unlock,
  AlertCircle,
  ExternalLink,
  Copy,
  Smartphone,
  CheckCheck,
  Send,
  User,
  Package,
  X,
  Code
} from 'lucide-react';
import { Order, UserRole } from '../types';
import { getLifecycleCategory } from '../utils/statusLifecycle';

interface WhatsAppNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  currentUserRole: UserRole;
  currentUserName: string;
  onClaimTask?: (orderId: string, claimantName: string) => void;
  onOpenOrderDetails?: (order: Order) => void;
}

export const WhatsAppNotificationModal: React.FC<WhatsAppNotificationModalProps> = ({
  isOpen,
  onClose,
  order,
  currentUserRole,
  currentUserName,
  onClaimTask,
  onOpenOrderDetails,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'PREVIEW' | 'WEBHOOK_PAYLOAD'>('PREVIEW');
  const [webhookLog, setWebhookLog] = useState<string | null>(null);

  if (!isOpen) return null;

  const lifecycle = getLifecycleCategory(order.status);
  const trackingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?view=${encodeURIComponent(order.referenceNumber)}`
    : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSimulateClaim = () => {
    if (order.taskLock?.isLocked) {
      setWebhookLog(JSON.stringify({
        event: 'whatsapp_button_click',
        buttonId: 'btn_claim_task',
        orderReference: order.referenceNumber,
        error: 'CONFLICT_409',
        message: `المهمة محجوزة بالفعل بواسطة ${order.taskLock.lockedBy}. تم إغلاق الخيار لمنع تكرار العمل.`
      }, null, 2));
      return;
    }

    if (onClaimTask) {
      onClaimTask(order.id, currentUserName || 'مسؤول التوريد اللوجستي');
    }

    setWebhookLog(JSON.stringify({
      event: 'whatsapp_button_click',
      buttonId: 'btn_claim_task',
      orderReference: order.referenceNumber,
      claimedBy: currentUserName,
      timestamp: new Date().toISOString(),
      status: 'TASK_LOCKED_200_OK',
      message: 'تم حجز المهمة بنجاح وتحديث النظام لمنع تضارب الأعضاء.'
    }, null, 2));
  };

  const simulatedWebhookPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_BUS_ACC_882910',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+966500000000',
                phone_number_id: '109823485723'
              },
              contacts: [{ wa_id: '966512345678', profile: { name: currentUserName } }],
              messages: [
                {
                  id: 'wamid.HBgLM...',
                  type: 'interactive',
                  interactive: {
                    type: 'button_reply',
                    button_reply: {
                      id: `claim_${order.referenceNumber}`,
                      title: 'استلام المهمة'
                    }
                  },
                  timestamp: Math.floor(Date.now() / 1000).toString()
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#075e54] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                <span>تكامل واتساب للأعمال (WhatsApp Business API)</span>
                <span className="bg-emerald-600 text-emerald-100 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  Live Webhook
                </span>
              </h3>
              <p className="text-[11px] text-emerald-100/90">
                إرسال كارت ملخص تلقائي للمجموعة مع أزرار تفاعلية لحجز المهمة والمتابعة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Switcher */}
        <div className="bg-slate-100 px-4 py-2 flex items-center justify-between border-b border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('PREVIEW')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'PREVIEW'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              معاينة رسالة الواتساب التفاعلية
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('WEBHOOK_PAYLOAD')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'WEBHOOK_PAYLOAD'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code className="w-3.5 h-3.5 text-emerald-600" />
              <span>مخرجات الـ Webhook Payload</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 space-y-4">
          {activeTab === 'PREVIEW' ? (
            <div className="max-w-md mx-auto">
              {/* WhatsApp Chat Bubble */}
              <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl shadow-inner border border-[#d1d7db]">
                {/* Chat Header inside group */}
                <div className="bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-lg text-center text-[11px] text-slate-600 mb-3 border border-slate-200 shadow-2xs font-semibold">
                  مجموعة: <strong>فريق الخدمات اللوجستية والتوريد - منجم الجكوب ⛏️</strong>
                </div>

                {/* Message Bubble */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden text-right">
                  {/* Bubble Header */}
                  <div className="bg-[#128c7e] text-white p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold tracking-wide">إشعار طلب ميداني رسمي</span>
                      <span className="text-[10px] font-mono bg-black/20 px-1.5 py-0.5 rounded">
                        {order.referenceNumber}
                      </span>
                    </div>
                  </div>

                  {/* Bubble Body */}
                  <div className="p-3 text-xs space-y-2 text-slate-800 leading-relaxed font-sans">
                    <p className="font-bold text-slate-900 border-b pb-1 border-slate-100">
                      📄 طلب توريد ومواد جديد: {order.purpose || 'مستلزمات تشغيلية'}
                    </p>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-500">الموقع:</span>{' '}
                        <strong>{order.siteCode} (منجم الجكوب)</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">القسم:</span>{' '}
                        <strong>{order.departmentCode}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">مقدم الطلب:</span>{' '}
                        <strong>{order.requesterName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">الأولوية:</span>{' '}
                        <strong className={order.priority === 'URGENT' ? 'text-amber-700' : 'text-slate-800'}>
                          {order.priority === 'URGENT' ? '⚡ عاجل (24h SLA)' : 'عادي'}
                        </strong>
                      </div>
                    </div>

                    {/* Status & Lifecycle */}
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-500 font-semibold">حالة الطلب:</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold border text-[10px] ${lifecycle.badgeBg} ${lifecycle.textColor} ${lifecycle.borderColor}`}>
                        {lifecycle.emoji} {lifecycle.label}
                      </span>
                    </div>

                    {/* Task Lock Status Banner */}
                    <div className={`p-2 rounded-lg text-[11px] border flex items-center gap-1.5 ${
                      order.taskLock?.isLocked
                        ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    }`}>
                      {order.taskLock?.isLocked ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>قيد التنفيذ بواسطة: <strong>{order.taskLock.lockedBy}</strong> (مغلق أمام باقي الأعضاء)</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-bold text-emerald-800">متاح للاستلام اللوجستي الفوري</span>
                        </>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 pt-1">
                      <span>{new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                      <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                  </div>

                  {/* Interactive Action Buttons (The core requirement) */}
                  <div className="border-t border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
                    <button
                      type="button"
                      onClick={handleSimulateClaim}
                      disabled={order.taskLock?.isLocked}
                      className={`w-full py-2.5 px-3 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        order.taskLock?.isLocked
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'hover:bg-emerald-50 text-emerald-800 hover:text-emerald-900 active:bg-emerald-100'
                      }`}
                    >
                      {order.taskLock?.isLocked ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>المهمة محجوزة مسبقاً (منع التضارب)</span>
                        </>
                      ) : (
                        <>
                          <span className="text-emerald-600">⚡</span>
                          <span>[استلام المهمة]</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onOpenOrderDetails) onOpenOrderDetails(order);
                      }}
                      className="w-full py-2.5 px-3 text-xs font-bold text-blue-700 hover:bg-blue-50 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>[عرض التفاصيل]</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="w-full py-2 px-3 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">تم نسخ رابط متابعة الأعضاء (عرض فقط)!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5" />
                          <span>[نسخ رابط متابعة الأعضاء (عرض فقط)]</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {webhookLog && (
                <div className="mt-3 p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] border border-slate-700 animate-fadeIn">
                  <div className="text-[10px] text-slate-400 mb-1 font-sans">
                    رد سيرفر الـ Webhook (Webhook Execution Result):
                  </div>
                  <pre className="whitespace-pre-wrap">{webhookLog}</pre>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-900 rounded-xl p-4 text-white font-mono text-xs overflow-x-auto">
                <div className="text-slate-400 text-[11px] mb-2 font-sans font-semibold">
                  نموذج الـ JSON Webhook الذي يستقبله النظام عند الضغط على زر داخل الواتساب:
                </div>
                <pre className="text-emerald-400 text-[11px] whitespace-pre-wrap">
                  {JSON.stringify(simulatedWebhookPayload, null, 2)}
                </pre>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs leading-relaxed">
                <strong>آلية عمل الـ Webhook في منع التضارب:</strong>
                <p className="mt-1 text-[11px] text-blue-800">
                  عند ضغط عضو الفريق على زر <code>[استلام المهمة]</code> في الواتساب، ترسل خوادم Meta طلباً فورياً إلى
                  <code>POST /api/whatsapp/webhook</code>. تقوم الدالة بتنفيذ قفل تشاؤمي (Pessimistic Row Lock) على الطلب.
                  إذا كان الطلب غير محجوز، يتم ربطه برقم هاتف العضو وتغيير حالته إلى <code>قيد التنفيذ بواسطة: [العضو]</code>.
                  وإذا حاول عضو آخر الضغط بعده، يتم إرجاع رسالة فورية له تفيد بأن المهمة تم حجزها مسبقاً لتفادي الازدواجية والتضارب.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono text-[11px]">
            API: WhatsApp Business Cloud API v19.0
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-700 transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
