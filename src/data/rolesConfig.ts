import { UserRole } from '../types';

export interface RoleConfigItem {
  role: UserRole;
  title: string;
  badge: string;
  defaultPassword: string;
  description: string;
  capabilitiesSummary: string[];
  allowedTabs: ('create' | 'track' | 'manage')[];
  color: string;
  badgeColor: string;
}

export const INITIAL_ROLE_CONFIGS: Record<UserRole, RoleConfigItem> = {
  REQUESTER: {
    role: 'REQUESTER',
    title: 'مقدم الطلب (Applicant)',
    badge: 'مقدم الطلب فقط',
    defaultPassword: '123',
    description: 'صلاحية محدودة مخصصة فقط لتقديم الطلبات ومتابعة حالة تقدم الطلبات عبر الروابط المباشرة أو الأرقام المرجعية دون إمكانية الاعتماد أو التعديل.',
    capabilitiesSummary: [
      'تقديم طلبات مواد ومشتريات جديدة',
      'توليد رابط تتبع مباشر وفوري للطلب',
      'متابعة ومراقبة حالة تقدم الطلب خطوة بخطوة عبر الرابط',
      'لا يمكنه اعتماد الطلبات أو تعديل حالاتها'
    ],
    allowedTabs: ['create', 'track'],
    color: 'emerald',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  DEPT_HEAD: {
    role: 'DEPT_HEAD',
    title: 'رئيس القسم المختص',
    badge: 'اعتماد فني أولي',
    defaultPassword: 'dept123',
    description: 'مراجعة الجدوى الفنية واعتماد طلبات القسم الميداني المختص، وطلب التعديل أو الرفض مع ذكر الأسباب.',
    capabilitiesSummary: [
      'تقديم طلبات ومتابعة كافة الحالات عبر الروابط',
      'لوحة إدارة واعتماد طلبات القسم التابع له',
      'اعتماد فني أو طلب استكمال مواصفات أو رفض مع توثيق السبب',
    ],
    allowedTabs: ['create', 'track', 'manage'],
    color: 'blue',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  SITE_MANAGER: {
    role: 'SITE_MANAGER',
    title: 'مدير الموقع والمشروع',
    badge: 'اعتماد مدير الموقع',
    defaultPassword: 'site123',
    description: 'المصادقة والاعتماد الميداني لطلبات منجم الجكوب والتنسيق مع إدارة المشتريات والتوريد.',
    capabilitiesSummary: [
      'تقديم ومتابعة كافة الطلبات عبر الروابط',
      'لوحة إدارة ومصادقة الطلبات على مستوى الموقع بالكامل',
      'اعتماد تشغيلي وإحالة الطلبات لإصدار أمر الشراء'
    ],
    allowedTabs: ['create', 'track', 'manage'],
    color: 'amber',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300'
  },
  GENERAL_MANAGER: {
    role: 'GENERAL_MANAGER',
    title: 'المدير العام التنفيذي',
    badge: 'الاعتماد المالي والتنفيذي',
    defaultPassword: 'gm123',
    description: 'صاحب الصلاحية المالية والتنفيذية لإطلاق الميزانيات واعتماد أوامر الشراء الكبرى.',
    capabilitiesSummary: [
      'متابعة شاملة عبر الروابط',
      'اعتماد مالي نهائي للطلبات الميدانية',
      'صلاحية اعتماد كافة المراحل'
    ],
    allowedTabs: ['create', 'track', 'manage'],
    color: 'purple',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300'
  },
  LOGISTICS_OFFICER: {
    role: 'LOGISTICS_OFFICER',
    title: 'مسؤول اللوجستيات والمستودعات',
    badge: 'أوامر الشراء والاستلام',
    defaultPassword: 'log123',
    description: 'إصدار أمر الشراء (PO) وتأكيد الاستلام المخزني وتحديث أرصدة التوريدات.',
    capabilitiesSummary: [
      'متابعة حالات الطلبات عبر الروابط',
      'إصدار أوامر الشراء للموردين',
      'تأكيد استلام الشحنات وتحديث حالة التوصيل'
    ],
    allowedTabs: ['create', 'track', 'manage'],
    color: 'cyan',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300'
  },
  AUDITOR: {
    role: 'AUDITOR',
    title: 'مدقق الجودة والرقابة',
    badge: 'تدقيق وامتثال',
    defaultPassword: 'audit123',
    description: 'الاطلاع الرقابي على مسارات وسجلات الطلبات والتأكد من مطابقة معايير الامتثال.',
    capabilitiesSummary: [
      'متابعة وفحص سير الطلبات عبر الروابط',
      'استعراض سجلات التدقيق والمطابقة دون صلاحية اعتماد'
    ],
    allowedTabs: ['track', 'manage'],
    color: 'teal',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300'
  },
  ADMIN: {
    role: 'ADMIN',
    title: 'مدير النظام (أعلى صلاحية - Super Admin)',
    badge: 'إدارة النظام الشاملة',
    defaultPassword: 'admin123',
    description: 'أعلى صلاحية في النظام: إدارة ومراقبة كافة الطلبات، تغيير الحالات يدوياً أو تلقائياً، اعتماد أو رفض أي طلب، وإدارة كلمات المرور لجميع الصلاحيات.',
    capabilitiesSummary: [
      'الوصول الكامل لكافة أجزاء النظام',
      'تحديث حالة أي طلب فوراً بنقرة واحدة وتنعكس برابط التتبع',
      'إدارة وتعديل كلمات المرور الخاصة بكافة الصلاحيات',
      'حذف أو تصدير أو تعديل الطلبات'
    ],
    allowedTabs: ['create', 'track', 'manage'],
    color: 'slate',
    badgeColor: 'bg-slate-900 text-amber-300 border-slate-700'
  }
};
