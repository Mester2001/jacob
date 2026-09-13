import { AppUser, AuditLogEntry, PermissionAction, PermissionDefinition, RoleDefinition, UserRole } from '../types';

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // 1. Orders & Requisitions
  {
    action: 'orders:create',
    name: 'إنشاء طلب مشتريات جديد',
    category: 'ORDERS',
    categoryName: 'إدارة الطلبات والمشتريات',
    description: 'صلاحية فتح استمارة طلب جديدة وتوليد الرقم المرجعي الذكي وإضافة الأصناف والمواصفات.',
    severity: 'NORMAL',
  },
  {
    action: 'orders:view_all',
    name: 'استعراض كافة طلبات المواقع والمناجم',
    category: 'ORDERS',
    categoryName: 'إدارة الطلبات والمشتريات',
    description: 'الاطلاع الشامل على طلبات كافة المناجم (WDM, EDM, RSQ) وجميع الأقسام.',
    severity: 'NORMAL',
  },
  {
    action: 'orders:view_dept',
    name: 'استعراض طلبات القسم التابع له فقط',
    category: 'ORDERS',
    categoryName: 'إدارة الطلبات والمشتريات',
    description: 'حصر الاطلاع فقط على الطلبات المرفوعة من القسم الميداني الخاص بالمستخدم.',
    severity: 'NORMAL',
  },
  {
    action: 'orders:export_csv',
    name: 'تصدير تقارير الطلبات (Excel / CSV)',
    category: 'ORDERS',
    categoryName: 'إدارة الطلبات والمشتريات',
    description: 'تحميل بيانات الطلبات والمشتريات وجداول المتابعة كملفات بيانات قابلة للتحليل.',
    severity: 'NORMAL',
  },
  {
    action: 'orders:print_official',
    name: 'طباعة الاستمارة الرسمية وأمر التعدين',
    category: 'ORDERS',
    categoryName: 'إدارة الطلبات والمشتريات',
    description: 'معاينة واستخراج استمارة طلب المواد الرسمية المعتمدة مع الباركود والأختام للطباعة وPDF.',
    severity: 'NORMAL',
  },

  // 2. Approvals & Signatures
  {
    action: 'orders:approve_dept',
    name: 'الاعتماد الفني الأولي (رئيس القسم المختص)',
    category: 'APPROVALS',
    categoryName: 'سلسلة الاعتمادات والتوقيعات',
    description: 'فحص الجدوى والمواصفات الفنية والموافقة على توجيه الطلب لإدارة الموقع.',
    severity: 'HIGH',
  },
  {
    action: 'orders:approve_site',
    name: 'اعتماد مدير الموقع والمشروع (منجم الجكوب)',
    category: 'APPROVALS',
    categoryName: 'سلسلة الاعتمادات والتوقيعات',
    description: 'المصادقة الميدانية والتأكد من توافق الطلب مع خطة الحفر واستخراج الخام بالمنجم.',
    severity: 'HIGH',
  },
  {
    action: 'orders:approve_gm',
    name: 'المصادقة المالية والتنفيذية (المدير العام)',
    category: 'APPROVALS',
    categoryName: 'سلسلة الاعتمادات والتوقيعات',
    description: 'الاعتماد المالي النهائي وإطلاق الميزانية لتحويل الطلب إلى أمر شراء رسمي.',
    severity: 'CRITICAL',
  },
  {
    action: 'orders:reject',
    name: 'رفض الطلب الميداني مع ذكر الأسباب',
    category: 'APPROVALS',
    categoryName: 'سلسلة الاعتمادات والتوقيعات',
    description: 'صلاحية رفض الطلب وإلغاء استمراره في دورة الاعتماد مع توثيق السبب رسمياً.',
    severity: 'HIGH',
  },
  {
    action: 'orders:request_mod',
    name: 'إعادة الطلب لاستكمال النواقص والمواصفات',
    category: 'APPROVALS',
    categoryName: 'سلسلة الاعتمادات والتوقيعات',
    description: 'طلب تعديل المواصفات أو إعادة تقدير الكميات وإرجاع الطلب إلى مُعدّه.',
    severity: 'NORMAL',
  },

  // 3. Logistics & Warehousing
  {
    action: 'logistics:issue_po',
    name: 'إصدار أمر الشراء الرسمي (PO Generation)',
    category: 'LOGISTICS',
    categoryName: 'الخدمات اللوجستية والمستودعات',
    description: 'تحويل الطلب المعتمد نهائياً إلى أمر شراء رسمي موجه للمورد مع بيانات الشحن.',
    severity: 'HIGH',
  },
  {
    action: 'logistics:warehouse_receive',
    name: 'فحص ومطابقة الاستلام المخزني الميداني',
    category: 'LOGISTICS',
    categoryName: 'الخدمات اللوجستية والمستودعات',
    description: 'تأكيد وصول الأصناف إلى مستودع المنجم وتوقيع محضر الفحص والاستلام الفني.',
    severity: 'HIGH',
  },
  {
    action: 'logistics:update_inventory',
    name: 'تحديث أرصدة المخزون الآلي',
    category: 'LOGISTICS',
    categoryName: 'الخدمات اللوجستية والمستودعات',
    description: 'إضافة الكميات المستلمة إلى أرصدة الكتالوج الميداني وتغذية سجلات التوريد.',
    severity: 'NORMAL',
  },

  // 4. Item Catalog
  {
    action: 'catalog:view',
    name: 'استعراض كتالوج الأصناف الموحد',
    category: 'CATALOG',
    categoryName: 'دليل الأصناف القياسي',
    description: 'البحث في قاعدة بيانات الأصناف المعتمدة والاطلاع على المواصفات والأسعار التقديرية.',
    severity: 'NORMAL',
  },
  {
    action: 'catalog:create',
    name: 'إضافة أصناف ومواصفات قياسية للكتالوج',
    category: 'CATALOG',
    categoryName: 'دليل الأصناف القياسي',
    description: 'تعريف أصناف جديدة بكود فريد ومواصفات فنية ملزمة لمنع التكرار والأخطاء.',
    severity: 'HIGH',
  },
  {
    action: 'catalog:edit_pricing',
    name: 'تعديل الأسعار التقديرية وحدود إعادة الطلب',
    category: 'CATALOG',
    categoryName: 'دليل الأصناف القياسي',
    description: 'تحديث التسعير القياسي التقديري ومستويات الأمان لمخزون قطع الغيار والمستهلكات.',
    severity: 'HIGH',
  },

  // 5. Audit & SLA Monitoring
  {
    action: 'audit:view_logs',
    name: 'الاطلاع على سجلات الرقابة والتدقيق الأمني',
    category: 'AUDIT',
    categoryName: 'التدقيق والأمن والـ SLA',
    description: 'فحص سجل تتبع العمليات (Audit Trail) وكشوفات التوقيعات الرقمية ومسارات التعديل.',
    severity: 'HIGH',
  },
  {
    action: 'sla:escalate',
    name: 'إدارة وتفعيل قواعد الـ SLA والتصعيد الفوري',
    category: 'AUDIT',
    categoryName: 'التدقيق والأمن والـ SLA',
    description: 'التحكم في مهل الاعتماد وتفعيل مسارات تصعيد الطلبات المتأخرة بعد 24 ساعة.',
    severity: 'HIGH',
  },

  // 6. RBAC & Security Administration
  {
    action: 'rbac:manage_roles',
    name: 'إدارة وتعديل مصفوفة الصلاحيات للأدوار',
    category: 'SECURITY',
    categoryName: 'إدارة النظام والصلاحيات (RBAC)',
    description: 'منح وسحب الصلاحيات من الأدوار الوظيفية وتعديل السقوف المالية المعتمدة.',
    severity: 'CRITICAL',
  },
  {
    action: 'rbac:manage_users',
    name: 'إدارة حسابات الموظفين وتعيين الأدوار',
    category: 'SECURITY',
    categoryName: 'إدارة النظام والصلاحيات (RBAC)',
    description: 'إضافة وتعديل حسابات المستخدمين، تفعيل/تعطيل الحسابات، وتعيين الأدوار والمواقع.',
    severity: 'CRITICAL',
  },
];

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    role: 'REQUESTER',
    name: 'مقدم الطلب الميداني',
    englishTitle: 'Field Requester / Site Engineer',
    description: 'مهندس الموقع أو مشرف الحفر والتشغيل المسؤول عن تسجيل الاحتياجات الميدانية والمواصفات الفنية.',
    level: 1,
    financialApprovalLimit: 0,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    badge: 'العمليات الميدانية',
    permissions: [
      'orders:create',
      'orders:view_dept',
      'orders:print_official',
      'catalog:view',
    ],
  },
  {
    role: 'DEPT_HEAD',
    name: 'رئيس القسم المختص',
    englishTitle: 'Department Head / Technical Manager',
    description: 'مدير الإدارة التشغيلية المعني بمراجعة الجدوى الفنية واعتماد المواصفات والميزانية التقديرية الأولية.',
    level: 2,
    financialApprovalLimit: 10000, // up to $10,000
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    badge: 'مدير إدارة التعدين',
    permissions: [
      'orders:create',
      'orders:view_all',
      'orders:approve_dept',
      'orders:reject',
      'orders:request_mod',
      'orders:export_csv',
      'orders:print_official',
      'catalog:view',
      'catalog:create',
    ],
  },
  {
    role: 'SITE_MANAGER',
    name: 'مدير الموقع والمشروع (مشروع الجكوب)',
    englishTitle: 'Site Director / Project Manager (WDM)',
    description: 'المسؤول الميداني العام عن إدارة المنجم والتنسيق مع المقاولين ومطابقة الخطط التشغيلية واستمرارية الإنتاج.',
    level: 3,
    financialApprovalLimit: 50000, // up to $50,000
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    badge: 'مشروع الجكوب للتعدين',
    permissions: [
      'orders:create',
      'orders:view_all',
      'orders:approve_dept',
      'orders:approve_site',
      'orders:reject',
      'orders:request_mod',
      'orders:export_csv',
      'orders:print_official',
      'catalog:view',
      'catalog:create',
      'sla:escalate',
    ],
  },
  {
    role: 'GENERAL_MANAGER',
    name: 'المدير العام التنفيذي',
    englishTitle: 'General Manager / Executive Director',
    description: 'صاحب الصلاحية المالية والتنفيذية العليا بالمجموعة لاعتماد كافة المشتريات وتجاوزات السقوف والحالات الطارئة.',
    level: 4,
    financialApprovalLimit: Infinity, // Unlimited financial authorization
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    badge: 'الاعتماد المالي والإداري',
    permissions: [
      'orders:create',
      'orders:view_all',
      'orders:approve_dept',
      'orders:approve_site',
      'orders:approve_gm',
      'orders:reject',
      'orders:request_mod',
      'orders:export_csv',
      'orders:print_official',
      'catalog:view',
      'catalog:create',
      'catalog:edit_pricing',
      'audit:view_logs',
      'sla:escalate',
    ],
  },
  {
    role: 'LOGISTICS_OFFICER',
    name: 'مسؤول اللوجستيات والمستودعات',
    englishTitle: 'Logistics, Procurement & Warehouse Officer',
    description: 'المسؤول عن توجيه أوامر الشراء (PO) للموردين، تتبع أسطول الشحن، الفحص والاستلام، وتحديث أرصدة الكتالوج.',
    level: 2,
    financialApprovalLimit: 0,
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    badge: 'أوامر الشراء والاستلام',
    permissions: [
      'orders:view_all',
      'orders:export_csv',
      'orders:print_official',
      'logistics:issue_po',
      'logistics:warehouse_receive',
      'logistics:update_inventory',
      'catalog:view',
      'catalog:create',
      'catalog:edit_pricing',
    ],
  },
  {
    role: 'AUDITOR',
    name: 'مدقق الجودة والرقابة الداخلية',
    englishTitle: 'Internal Quality & Compliance Auditor',
    description: 'مراقب الامتثال لمعايير ISO 9001 ولوائح التعدين الوطنية، ومراجعة سلامة التواقيع الرقمية دون حق التعديل.',
    level: 3,
    financialApprovalLimit: 0,
    color: 'bg-teal-100 text-teal-800 border-teal-300',
    badge: 'الرقابة والتفتيش الميداني',
    permissions: [
      'orders:view_all',
      'orders:export_csv',
      'orders:print_official',
      'catalog:view',
      'audit:view_logs',
    ],
  },
  {
    role: 'ADMIN',
    name: 'مدير النظام ومسؤول الأمان (Super Admin)',
    englishTitle: 'System & Security Administrator',
    description: 'المتحكم التقني في مصفوفة الصلاحيات، إنشاء المستخدمين، تهيئة قواعد البيانات وإدارة التكاملات.',
    level: 5,
    financialApprovalLimit: Infinity,
    color: 'bg-slate-900 text-amber-300 border-slate-700',
    badge: 'System Administrator',
    permissions: [
      'orders:create',
      'orders:view_all',
      'orders:approve_dept',
      'orders:approve_site',
      'orders:approve_gm',
      'orders:reject',
      'orders:request_mod',
      'orders:export_csv',
      'orders:print_official',
      'logistics:issue_po',
      'logistics:warehouse_receive',
      'logistics:update_inventory',
      'catalog:view',
      'catalog:create',
      'catalog:edit_pricing',
      'audit:view_logs',
      'sla:escalate',
      'rbac:manage_roles',
      'rbac:manage_users',
    ],
  },
];

export const INITIAL_APP_USERS: AppUser[] = [
  {
    id: 'USR-001',
    name: 'م. إبراهيم كمال',
    title: 'مهندس تعدين أول ومسؤول الموقع الغربي',
    email: 'i.kamal@wdm-mining.com',
    phone: '+20 100 234 5671',
    role: 'REQUESTER',
    siteCode: 'WDM',
    departmentCode: 'MI',
    isActive: true,
    lastActive: 'منذ 10 دقائق',
    digitalSignatureRegistered: true,
    digitalSignatureHash: 'CERT-RSA-SHA256:09a8bc43f1',
    signatureRoleTitle: 'مهندس العمليات الميدانية',
  },
  {
    id: 'USR-002',
    name: 'د. م. أحمد صبري',
    title: 'مدير إدارة العمليات التعدينية والاستكشاف',
    email: 'a.sabry@wdm-mining.com',
    phone: '+20 100 892 1104',
    role: 'DEPT_HEAD',
    siteCode: 'WDM',
    departmentCode: 'MI',
    isActive: true,
    lastActive: 'منذ 25 دقيقة',
    digitalSignatureRegistered: true,
    digitalSignatureHash: 'CERT-RSA-SHA256:88d2f194cb',
    signatureRoleTitle: 'رئيس قسم العمليات التعدينية',
  },
  {
    id: 'USR-003',
    name: 'م. طارق رضوان',
    title: 'مدير مشروع الجكوب للتعدين ومنجم الصحراء الغربية',
    email: 't.radwan@wdm-mining.com',
    phone: '+20 101 445 9920',
    role: 'SITE_MANAGER',
    siteCode: 'WDM',
    departmentCode: 'MI',
    isActive: true,
    lastActive: 'متصل الآن',
    digitalSignatureRegistered: true,
    digitalSignatureHash: 'CERT-RSA-SHA256:71ee33a901',
    signatureRoleTitle: 'مدير عام موقع الجكوب',
  },
  {
    id: 'USR-004',
    name: 'د. محمود الشرقاوي',
    title: 'المدير العام والرئيس التنفيذي للمجموعة',
    email: 'm.sharkawy@wdm-mining.com',
    phone: '+20 102 331 8899',
    role: 'GENERAL_MANAGER',
    siteCode: 'WDM',
    departmentCode: 'MI',
    isActive: true,
    lastActive: 'منذ ساعتين',
    digitalSignatureRegistered: true,
    digitalSignatureHash: 'CERT-RSA-SHA256:99ff0021bb',
    signatureRoleTitle: 'المدير العام والتنفيذي',
  },
  {
    id: 'USR-005',
    name: 'عادل منصور',
    title: 'مسؤول المشتريات وسلسلة الإمداد والمستودعات',
    email: 'a.mansour@wdm-mining.com',
    phone: '+20 100 998 7762',
    role: 'LOGISTICS_OFFICER',
    siteCode: 'WDM',
    departmentCode: 'LG',
    isActive: true,
    lastActive: 'منذ 15 دقيقة',
    digitalSignatureRegistered: true,
    digitalSignatureHash: 'CERT-RSA-SHA256:44ac1255ee',
    signatureRoleTitle: 'أمين المستودع واللوجستيات',
  },
  {
    id: 'USR-006',
    name: 'أ. سارة الزهراني',
    title: 'مفتش أول الجودة والسلامة والامتثال المؤسسي',
    email: 's.zahrani@wdm-mining.com',
    phone: '+20 109 555 4321',
    role: 'AUDITOR',
    siteCode: 'WDM',
    departmentCode: 'SA',
    isActive: true,
    lastActive: 'منذ 4 ساعات',
    digitalSignatureRegistered: true,
    digitalSignatureHash: 'CERT-RSA-SHA256:66ab8899fa',
    signatureRoleTitle: 'مدقق ومراقب الجودة',
  },
  {
    id: 'USR-007',
    name: 'مسؤول أمان النظام (Admin)',
    title: 'كبير مسؤولي أمن ونظم المعلومات (CIO)',
    email: 'admin@wdm-mining.com',
    phone: '+20 100 000 1122',
    role: 'ADMIN',
    siteCode: 'WDM',
    departmentCode: 'MI',
    isActive: true,
    lastActive: 'متصل الآن',
    digitalSignatureRegistered: true,
    digitalSignatureHash: 'CERT-RSA-SHA256:MASTER-ROOT-KEY',
    signatureRoleTitle: 'مدير النظام الأمني الرئيسي',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'AUD-901',
    timestamp: '2026-09-09 09:15:20',
    userId: 'USR-003',
    userName: 'م. طارق رضوان',
    userRole: 'SITE_MANAGER',
    action: 'اعتماد موقع المنجم',
    target: 'طلب: WDM-MI26002',
    details: 'تم فحص ومصادقة الطلب الميداني رقم WDM-MI26002 بقيمة $42,500 وتوثيقه بالختم الرقمي.',
    ipAddress: '192.168.10.44 (شبكة المنجم الداخلية)',
    severity: 'INFO',
  },
  {
    id: 'AUD-902',
    timestamp: '2026-09-09 08:30:11',
    userId: 'USR-002',
    userName: 'د. م. أحمد صبري',
    userRole: 'DEPT_HEAD',
    action: 'اعتماد فني أولي',
    target: 'طلب: WDM-MI26002',
    details: 'اعتماد المواصفات الفنية للقم حفر صخري كربيد التنجستن 89 مم سن T45.',
    ipAddress: '192.168.10.12 (مكتب التعدين)',
    severity: 'INFO',
  },
  {
    id: 'AUD-903',
    timestamp: '2026-09-09 07:45:00',
    userId: 'USR-001',
    userName: 'م. إبراهيم كمال',
    userRole: 'REQUESTER',
    action: 'إنشاء طلب مشتريات',
    target: 'طلب: WDM-MI26002',
    details: 'توليد الرقم المرجعي الذكي WDM-MI26002 لعدد 50 قطعة حفر صخري عاجلة.',
    ipAddress: '10.0.5.88 (الموقع الميداني)',
    severity: 'INFO',
  },
  {
    id: 'AUD-904',
    timestamp: '2026-09-08 16:20:44',
    userId: 'USR-007',
    userName: 'مسؤول أمان النظام (Admin)',
    userRole: 'ADMIN',
    action: 'تحديث صلاحيات الأدوار',
    target: 'مصفوفة الصلاحيات (RBAC Matrix)',
    details: 'تم تفعيل صلاحية [إصدار أوامر الشراء] لمسؤول اللوجستيات مع توثيق التدقيق الأمني.',
    ipAddress: '172.16.0.1 (بوابة الإدارة المركزية)',
    severity: 'SECURITY',
  },
  {
    id: 'AUD-905',
    timestamp: '2026-09-08 14:10:02',
    userId: 'SYSTEM',
    userName: 'محرك مراقبة الـ SLA الآلي',
    userRole: 'ADMIN',
    action: 'تنبيه مهلة الـ 24 ساعة',
    target: 'طلب عاجل: WDM-EQ26001',
    details: 'رصد اقتراب انتهاء مهلة الاعتماد للطلب العاجل وإرسال إشعار للمدير العام تلقائياً.',
    ipAddress: '127.0.0.1 (CRON Worker)',
    severity: 'WARNING',
  },
  {
    id: 'AUD-906',
    timestamp: '2026-09-08 11:05:33',
    userId: 'USR-005',
    userName: 'عادل منصور',
    userRole: 'LOGISTICS_OFFICER',
    action: 'تحديث رصيد المخزن',
    target: 'الصنف: PRT-FLT-092',
    details: 'استلام وتوريد 10 فلاتر هيدروليك وتحديث الرصيد بالمستودع الميداني.',
    ipAddress: '192.168.10.99 (مستودع الجكوب)',
    severity: 'INFO',
  },
];

/**
 * Check whether a user has a specific permission action.
 * Takes into account:
 * 1. Role-based permissions from the role definitions
 * 2. User custom permission overrides (if any)
 * 3. Super Admin bypass
 */
export function hasUserPermission(
  userRole: UserRole,
  action: PermissionAction,
  roleDefs: RoleDefinition[],
  userCustomPermissions?: PermissionAction[]
): boolean {
  if (userRole === 'ADMIN') return true;

  // Check custom override on user
  if (userCustomPermissions && userCustomPermissions.includes(action)) {
    return true;
  }

  // Check role permissions
  const roleDef = roleDefs.find((r) => r.role === userRole);
  if (!roleDef) return false;

  return roleDef.permissions.includes(action);
}

/**
 * Helper to format financial limit nicely
 */
export function formatFinancialLimit(limit: number): string {
  if (limit === Infinity || limit >= 1000000000) {
    return 'غير محدود (كافة المبالغ والاعتمادات)';
  }
  if (limit === 0) {
    return 'لا يوجد صلاحية اعتماد مالي';
  }
  return `حتى $${limit.toLocaleString()} دولار أمريكي`;
}
