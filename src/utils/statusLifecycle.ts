import { OrderStatus, LifecycleStatusCategory } from '../types';

export interface LifecycleInfo {
  category: LifecycleStatusCategory;
  emoji: string;
  label: string;
  colorClass: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  description: string;
}

export function getLifecycleCategory(status: OrderStatus): LifecycleInfo {
  switch (status) {
    case 'DRAFT':
      return {
        category: 'NEW',
        emoji: '🟡',
        label: 'جديد (New)',
        colorClass: 'amber',
        badgeBg: 'bg-amber-100',
        textColor: 'text-amber-900',
        borderColor: 'border-amber-300',
        description: 'تم تسجيل الطلب في النظام وتوليد الرقم المرجعي الذكي ورابط التتبع.',
      };
    case 'PENDING_DEPT_HEAD':
    case 'PENDING_SITE_MANAGER':
    case 'PENDING_GENERAL_MANAGER':
    case 'MODIFICATION_REQUESTED':
      return {
        category: 'PENDING_APPROVAL',
        emoji: '🔵',
        label: 'قيد الاعتماد (Pending Approval)',
        colorClass: 'blue',
        badgeBg: 'bg-blue-100',
        textColor: 'text-blue-900',
        borderColor: 'border-blue-300',
        description: 'يمر بسلسلة التوقيعات والاعتمادات الرقمية الإلزامية (رئيس القسم -> مدير الموقع -> المدير العام).',
      };
    case 'APPROVED_FOR_PO':
    case 'PO_ISSUED':
      return {
        category: 'IN_PROGRESS',
        emoji: '🟠',
        label: 'قيد التنفيذ/التوريد (In Progress)',
        colorClass: 'orange',
        badgeBg: 'bg-orange-100',
        textColor: 'text-orange-950',
        borderColor: 'border-orange-300',
        description: 'معتمد للإصدار والتوريد، متاح لحجز المهمة ومنع التضارب بين أعضاء الفريق اللوجستي.',
      };
    case 'DELIVERED_RECEIVED':
      return {
        category: 'COMPLETED',
        emoji: '🟢',
        label: 'مكتمل / تم التسليم (Completed)',
        colorClass: 'emerald',
        badgeBg: 'bg-emerald-100',
        textColor: 'text-emerald-950',
        borderColor: 'border-emerald-300',
        description: 'تم استلام الشحنة وتأكيد المطابقة الفنية وتحديث أرصدة المستودع الميداني.',
      };
    case 'REJECTED':
      return {
        category: 'CANCELLED',
        emoji: '🔴',
        label: 'ملغي / مرفوض (Cancelled)',
        colorClass: 'rose',
        badgeBg: 'bg-rose-100',
        textColor: 'text-rose-950',
        borderColor: 'border-rose-300',
        description: 'تم رفض الطلب أو إلغاؤه مع توثيق الأسباب الفنية في سجل التدقيق.',
      };
    default:
      return {
        category: 'NEW',
        emoji: '🟡',
        label: 'جديد (New)',
        colorClass: 'slate',
        badgeBg: 'bg-slate-100',
        textColor: 'text-slate-900',
        borderColor: 'border-slate-300',
        description: 'حالة غير محددة',
      };
  }
}
