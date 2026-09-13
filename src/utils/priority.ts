import { PriorityLevel } from '../types';

export type NormalizedPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface PriorityMeta {
  key: NormalizedPriority;
  label: string;
  fullLabel: string;
  badgeClasses: string;
  iconColor: string;
  dotColor: string;
  slaText: string;
  description: string;
}

export function normalizePriority(priority?: string | PriorityLevel): NormalizedPriority {
  if (!priority) return 'MEDIUM';
  const p = String(priority).toUpperCase();
  if (p === 'HIGH' || p === 'EMERGENCY' || p === 'عالية') {
    return 'HIGH';
  }
  if (p === 'LOW' || p === 'NORMAL' || p === 'منخفضة') {
    return 'LOW';
  }
  return 'MEDIUM';
}

export const PRIORITY_METAS: Record<NormalizedPriority, PriorityMeta> = {
  HIGH: {
    key: 'HIGH',
    label: 'عالية',
    fullLabel: 'أولوية عالية (High)',
    badgeClasses: 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100',
    iconColor: 'text-rose-600',
    dotColor: 'bg-rose-600',
    slaText: '24 ساعة (SLA)',
    description: 'طارئ وتوقف إنتاج - تصعيد فوري للإدارة العامة',
  },
  MEDIUM: {
    key: 'MEDIUM',
    label: 'متوسطة',
    fullLabel: 'أولوية متوسطة (Medium)',
    badgeClasses: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
    iconColor: 'text-amber-600',
    dotColor: 'bg-amber-500',
    slaText: '48-72 ساعة',
    description: 'تشغيل اعتيادي ودوري - متابعة قياسية للمشتريات',
  },
  LOW: {
    key: 'LOW',
    label: 'منخفضة',
    fullLabel: 'أولوية منخفضة (Low)',
    badgeClasses: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100',
    iconColor: 'text-emerald-600',
    dotColor: 'bg-emerald-500',
    slaText: 'حسب الخطة',
    description: 'تخزين استراتيجي ومستلزمات عامة غير عاجلة',
  },
};

export function getPriorityMeta(priority?: string | PriorityLevel): PriorityMeta {
  const norm = normalizePriority(priority);
  return PRIORITY_METAS[norm];
}
