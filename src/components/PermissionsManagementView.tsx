import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Users,
  KeyRound,
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  UserPlus,
  Lock,
  Unlock,
  DollarSign,
  Building,
  UserCheck,
  Download,
  Info,
  Check,
  BadgeAlert,
  ChevronLeft,
  PenTool,
} from 'lucide-react';
import { AppUser, AuditLogEntry, PermissionAction, PermissionDefinition, RoleDefinition, UserRole } from '../types';
import { ALL_PERMISSIONS, formatFinancialLimit } from '../data/permissionsData';
import { SITES, DEPARTMENTS } from '../data/initialData';

interface PermissionsManagementViewProps {
  currentUserRole: UserRole;
  currentUserId: string;
  users: AppUser[];
  roles: RoleDefinition[];
  auditLogs: AuditLogEntry[];
  onUpdateRolePermissions: (role: UserRole, permissions: PermissionAction[]) => void;
  onResetRolesToDefault: () => void;
  onUpdateRoleFinancialLimit: (role: UserRole, limit: number) => void;
  onSwitchUser: (user: AppUser) => void;
  onAddUser: (user: AppUser) => void;
  onToggleUserStatus: (userId: string) => void;
  onAddAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
}

export const PermissionsManagementView: React.FC<PermissionsManagementViewProps> = ({
  currentUserRole,
  currentUserId,
  users,
  roles,
  auditLogs,
  onUpdateRolePermissions,
  onResetRolesToDefault,
  onUpdateRoleFinancialLimit,
  onSwitchUser,
  onAddUser,
  onToggleUserStatus,
  onAddAuditLog,
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'users' | 'financial' | 'audit' | 'signatures'>('matrix');
  const [permissionCategoryFilter, setPermissionCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<string>('ALL');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedRoleForDetail, setSelectedRoleForDetail] = useState<UserRole | null>('SITE_MANAGER');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserTitle, setNewUserTitle] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('+20 100 ');
  const [newUserRole, setNewUserRole] = useState<UserRole>('REQUESTER');
  const [newUserSite, setNewUserSite] = useState<string>('WDM');
  const [newUserDept, setNewUserDept] = useState<string>('MI');

  const isAdmin = currentUserRole === 'ADMIN';

  // Toggle a single permission for a role
  const handleTogglePermission = (role: UserRole, permission: PermissionAction) => {
    if (!isAdmin) {
      alert('تنبيه أمني: يتطلب تعديل مصفوفة الصلاحيات حساب مسؤول النظام (ADMIN).');
      return;
    }

    // Protect super admin role from removing its own critical permissions
    if (role === 'ADMIN' && (permission === 'rbac:manage_roles' || permission === 'rbac:manage_users')) {
      alert('لا يمكن إزالة صلاحية إدارة النظام الأساسية من حساب المسؤول الرئيسي للحفاظ على استقرار النظام.');
      return;
    }

    const currentRoleDef = roles.find((r) => r.role === role);
    if (!currentRoleDef) return;

    const exists = currentRoleDef.permissions.includes(permission);
    const updatedPermissions = exists
      ? currentRoleDef.permissions.filter((p) => p !== permission)
      : [...currentRoleDef.permissions, permission];

    onUpdateRolePermissions(role, updatedPermissions);

    // Add audit log
    onAddAuditLog({
      userId: currentUserId,
      userName: users.find((u) => u.id === currentUserId)?.name || 'مسؤول النظام',
      userRole: currentUserRole,
      action: exists ? 'سحب صلاحية' : 'منح صلاحية',
      target: `الدور: ${currentRoleDef.name}`,
      details: `${exists ? 'تم سحب' : 'تم منح'} صلاحية [${ALL_PERMISSIONS.find((p) => p.action === permission)?.name || permission}] للدور [${currentRoleDef.name}].`,
      ipAddress: '172.16.0.1 (بوابة الإدارة)',
      severity: 'SECURITY',
    });

    setSaveSuccessMsg(`تم تحديث مصفوفة الصلاحيات للدور [${currentRoleDef.name}] بنجاح.`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Submit new user
  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      alert('يرجى كتابة اسم الموظف والبريد الإلكتروني.');
      return;
    }

    const newId = `USR-${String(users.length + 1).padStart(3, '0')}`;
    const newUser: AppUser = {
      id: newId,
      name: newUserName,
      title: newUserTitle || 'مهندس ميداني',
      email: newUserEmail,
      phone: newUserPhone,
      role: newUserRole,
      siteCode: newUserSite,
      departmentCode: newUserDept,
      isActive: true,
      lastActive: 'الآن',
      digitalSignatureRegistered: true,
      digitalSignatureHash: `CERT-RSA-SHA256:${Math.random().toString(36).substring(2, 12)}`,
      signatureRoleTitle: newUserTitle || 'مسؤول معتمد',
    };

    onAddUser(newUser);

    onAddAuditLog({
      userId: currentUserId,
      userName: users.find((u) => u.id === currentUserId)?.name || 'مسؤول النظام',
      userRole: currentUserRole,
      action: 'إنشاء مستخدم جديد',
      target: `المستخدم: ${newUserName} (${newId})`,
      details: `تم إنشاء حساب للموظف [${newUserName}] بدور [${roles.find((r) => r.role === newUserRole)?.name}] في منجم [${newUserSite}].`,
      ipAddress: '172.16.0.1 (بوابة الإدارة)',
      severity: 'INFO',
    });

    setShowAddUserModal(false);
    setNewUserName('');
    setNewUserTitle('');
    setNewUserEmail('');
    setSaveSuccessMsg(`تمت إضافة المستخدم [${newUserName}] بنجاح وتفعيل شهادته الرقمية.`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Export audit log CSV
  const handleExportAuditCSV = () => {
    const headers = ['المعرف', 'التوقيت', 'المستخدم', 'الدور', 'النوع', 'الهدف', 'التفاصيل', 'عنوان IP', 'مستوى الخطورة'];
    const rows = auditLogs.map((log) => [
      log.id,
      log.timestamp,
      `"${log.userName}"`,
      log.userRole,
      `"${log.action}"`,
      `"${log.target}"`,
      `"${log.details.replace(/"/g, '""')}"`,
      log.ipAddress,
      log.severity,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `WDM_Security_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered permissions for matrix
  const filteredPermissions = ALL_PERMISSIONS.filter((perm) => {
    if (permissionCategoryFilter !== 'ALL' && perm.category !== permissionCategoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        perm.name.toLowerCase().includes(q) ||
        perm.description.toLowerCase().includes(q) ||
        perm.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.title.toLowerCase().includes(q) ||
        u.siteCode.toLowerCase().includes(q) ||
        u.departmentCode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered audit logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditSeverityFilter !== 'ALL' && log.severity !== auditSeverityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.userName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.target.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const categories = [
    { key: 'ALL', label: 'كافة الصلاحيات (الكل)' },
    { key: 'ORDERS', label: 'إدارة الطلبات' },
    { key: 'APPROVALS', label: 'سلسلة الاعتمادات' },
    { key: 'LOGISTICS', label: 'اللوجستيات والمستودع' },
    { key: 'CATALOG', label: 'كتالوج الأصناف' },
    { key: 'AUDIT', label: 'الرقابة وSLA' },
    { key: 'SECURITY', label: 'أمان النظام وRBAC' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-700/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                  نظام إدارة الصلاحيات والأدوار المتقدم (RBAC Architecture)
                </h1>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
                  Enterprise Security v2.6
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1.5 leading-relaxed max-w-3xl">
                التحكم الموحد في صلاحيات دورة اعتماد المشتريات والتوريدات الميدانية لمناجم الصحراء الغربية (الجكوب).
                يتيح النظام ضبط مصفوفة الوصول الدقيقة، وتعيين السقوف المالية للاعتماد، وتوثيق التواقيع والأختام المشفرة، ورصد سجل التدقيق الأمني.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <div className="bg-slate-800/80 border border-slate-700 px-4 py-2.5 rounded-xl text-center">
              <span className="block text-xl font-extrabold text-amber-400">{roles.length}</span>
              <span className="text-[11px] text-slate-400 font-semibold">أدوار وظيفية</span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700 px-4 py-2.5 rounded-xl text-center">
              <span className="block text-xl font-extrabold text-emerald-400">{ALL_PERMISSIONS.length}</span>
              <span className="text-[11px] text-slate-400 font-semibold">صلاحية دقيقة</span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700 px-4 py-2.5 rounded-xl text-center">
              <span className="block text-xl font-extrabold text-cyan-400">{users.length}</span>
              <span className="text-[11px] text-slate-400 font-semibold">موظف معتمد</span>
            </div>
          </div>
        </div>

        {/* Feedback alert message */}
        {saveSuccessMsg && (
          <div className="mt-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Main Sub-Navigation Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition ${
              activeTab === 'matrix'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>مصفوفة الصلاحيات (Role-Permission Matrix)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition ${
              activeTab === 'users'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>إدارة المستخدمين والموظفين ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition ${
              activeTab === 'financial'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>سقوف الصلاحيات المالية (Approval Limits)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('signatures')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition ${
              activeTab === 'signatures'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>خزينة التواقيع والأختام المعتمدة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition ${
              activeTab === 'audit'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>سجل الرقابة والتدقيق الأمني ({auditLogs.length})</span>
          </button>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          {activeTab === 'matrix' && isAdmin && (
            <button
              type="button"
              onClick={() => {
                if (confirm('هل أنت متأكد من رغبتك في إعادة ضبط مصفوفة الصلاحيات لجميع الأدوار إلى الإعدادات القياسية المصنعية؟')) {
                  onResetRolesToDefault();
                  onAddAuditLog({
                    userId: currentUserId,
                    userName: users.find((u) => u.id === currentUserId)?.name || 'مسؤول النظام',
                    userRole: currentUserRole,
                    action: 'إعادة ضبط مصفوفة الصلاحيات',
                    target: 'إعدادات النظام الافتراضية',
                    details: 'تمت استعادة الصلاحيات الأصلية المصنعية لكافة الأدوار الوظيفية.',
                    ipAddress: '172.16.0.1 (بوابة الإدارة)',
                    severity: 'WARNING',
                  });
                  setSaveSuccessMsg('تمت استعادة مصفوفة الصلاحيات الافتراضية لكافة الأدوار بنجاح.');
                  setTimeout(() => setSaveSuccessMsg(null), 3000);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
              title="إعادة ضبط مصفوفة الصلاحيات إلى الحالة الافتراضية"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>استعادة الافتراضي</span>
            </button>
          )}

          {activeTab === 'users' && isAdmin && (
            <button
              type="button"
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة موظف معتمد جديد</span>
            </button>
          )}

          {activeTab === 'audit' && (
            <button
              type="button"
              onClick={handleExportAuditCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>تصدير السجل الأمني (CSV)</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: PERMISSION MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-bold text-slate-500 shrink-0 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                <span>تصنيف الصلاحيات:</span>
              </span>
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setPermissionCategoryFilter(cat.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    permissionCategoryFilter === cat.key
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في اسم الصلاحية أو كود الإجراء..."
                className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Admin Notice */}
          {!isAdmin && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  أنت تتصفح مصفوفة الصلاحيات بصفة (<strong>{roles.find((r) => r.role === currentUserRole)?.name}</strong>). وضع العرض فقط مفعّل. لتعديل الصلاحيات والأدوار، يرجى التبديل لحساب <strong>مدير النظام (ADMIN)</strong> من القائمة العلوية.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const adminUser = users.find((u) => u.role === 'ADMIN');
                  if (adminUser) onSwitchUser(adminUser);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1 rounded-md text-xs shrink-0 transition"
              >
                التبديل إلى مدير النظام الآن
              </button>
            </div>
          )}

          {/* Matrix Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                    <th className="p-3.5 font-bold min-w-[260px] text-right sticky right-0 bg-slate-100 z-10">
                      الصلاحية والوظيفة التشغيلية
                    </th>
                    <th className="p-3.5 font-bold text-center min-w-[100px]">التصنيف والمستوى</th>
                    {roles.map((roleDef) => (
                      <th
                        key={roleDef.role}
                        className={`p-3.5 font-bold text-center min-w-[130px] border-r border-slate-200 ${
                          roleDef.role === currentUserRole ? 'bg-amber-50/80 font-black text-amber-900' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <span className="font-extrabold text-slate-900">{roleDef.name}</span>
                          <span className="text-[10px] text-slate-500 font-normal">{roleDef.englishTitle}</span>
                          {roleDef.role === currentUserRole && (
                            <span className="mt-1 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                              أنت هنا الآن
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPermissions.map((perm) => (
                    <tr key={perm.action} className="hover:bg-slate-50/80 transition group">
                      {/* Permission info */}
                      <td className="p-3.5 sticky right-0 bg-white group-hover:bg-slate-50/80 z-10 border-b border-slate-100">
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">
                            {perm.severity === 'CRITICAL' ? (
                              <BadgeAlert className="w-4 h-4 text-rose-600" />
                            ) : perm.severity === 'HIGH' ? (
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{perm.name}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                              {perm.description}
                            </p>
                            <span className="inline-block mt-1 font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {perm.action}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category & severity badge */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 block mb-1">
                          {perm.categoryName}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                            perm.severity === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-800'
                              : perm.severity === 'HIGH'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {perm.severity === 'CRITICAL' ? 'حرج أمنياً' : perm.severity === 'HIGH' ? 'متوسط / هام' : 'تشغيلي عادي'}
                        </span>
                      </td>

                      {/* Role Checkboxes */}
                      {roles.map((roleDef) => {
                        const isGranted = roleDef.permissions.includes(perm.action);
                        const isCurrent = roleDef.role === currentUserRole;

                        return (
                          <td
                            key={roleDef.role}
                            className={`p-3.5 text-center border-r border-slate-100 ${
                              isCurrent ? 'bg-amber-50/40' : ''
                            }`}
                          >
                            <button
                              type="button"
                              disabled={!isAdmin}
                              onClick={() => handleTogglePermission(roleDef.role, perm.action)}
                              className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition ${
                                isGranted
                                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                              } ${!isAdmin ? 'cursor-default' : 'cursor-pointer hover:scale-105 active:scale-95'}`}
                              title={`${isGranted ? 'ممنوحة' : 'محجوبة'} لـ ${roleDef.name} - ${perm.name}`}
                            >
                              {isGranted ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-slate-300" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Matrix Legend Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-emerald-500 text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>الصلاحية ممنوحة ومصرح بها للدور</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-slate-200 text-slate-400 flex items-center justify-center">
                    <XCircle className="w-3 h-3" />
                  </div>
                  <span>الصلاحية محجوبة (غير مصرح بها)</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <BadgeAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>صلاحية حساسة تخضع لمراقبة التدقيق الأمني التلقائي</span>
                </div>
              </div>
              <span className="text-[11px] text-slate-500">
                إجمالي الصلاحيات المعروضة: <strong>{filteredPermissions.length}</strong> من أصل {ALL_PERMISSIONS.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS AND STAFF DIRECTORY */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search bar & instructions */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">سجل حسابات الموظفين المعتمدة بمشروع الجكوب</h3>
                <p className="text-xs text-slate-500">
                  يمكنك النقر على زر <strong>"تقمص الدور والمحاكاة"</strong> أمام أي موظف لاختبار صلاحياته وتجربة الاعتمادات فوراً داخل التطبيق.
                </p>
              </div>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم، المنجم، أو القسم..."
                className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((user) => {
              const roleDef = roles.find((r) => r.role === user.role);
              const isCurrentUser = user.id === currentUserId;
              const site = SITES.find((s) => s.code === user.siteCode);
              const dept = DEPARTMENTS.find((d) => d.code === user.departmentCode);

              return (
                <div
                  key={user.id}
                  className={`bg-white rounded-xl border transition p-4 shadow-xs flex flex-col justify-between ${
                    isCurrentUser
                      ? 'border-amber-400 ring-2 ring-amber-400/30 bg-amber-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Header: Avatar, Name, Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 ${
                            user.role === 'ADMIN'
                              ? 'bg-slate-900'
                              : user.role === 'GENERAL_MANAGER'
                              ? 'bg-purple-700'
                              : user.role === 'SITE_MANAGER'
                              ? 'bg-amber-600'
                              : user.role === 'DEPT_HEAD'
                              ? 'bg-blue-600'
                              : user.role === 'LOGISTICS_OFFICER'
                              ? 'bg-cyan-600'
                              : user.role === 'AUDITOR'
                              ? 'bg-teal-600'
                              : 'bg-emerald-600'
                          }`}
                        >
                          {user.name.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-slate-900 text-sm">{user.name}</h4>
                            {isCurrentUser && (
                              <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.2 rounded font-bold">
                                أنت الآن
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium">{user.title}</p>
                        </div>
                      </div>

                      {/* Active switch */}
                      <button
                        type="button"
                        disabled={!isAdmin || user.role === 'ADMIN'}
                        onClick={() => onToggleUserStatus(user.id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition ${
                          user.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        } ${(!isAdmin || user.role === 'ADMIN') ? 'cursor-default' : 'cursor-pointer'}`}
                        title={isAdmin ? 'تبديل حالة تفعيل الحساب' : ''}
                      >
                        {user.isActive ? 'حساب نشط' : 'حساب موقوف'}
                      </button>
                    </div>

                    {/* Meta info */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">الدور الوظيفي:</span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${roleDef?.color || 'bg-slate-100'}`}>
                          {roleDef?.name || user.role}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">الموقع والمشروع:</span>
                        <span className="font-semibold text-slate-800 text-[11px]">
                          {site?.name.split('(')[0] || user.siteCode}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">الإدارة والقسم:</span>
                        <span className="font-semibold text-slate-800 text-[11px]">
                          {dept?.name || user.departmentCode}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">البريد والهاتف:</span>
                        <span className="font-mono text-[11px] text-slate-600 dir-ltr">{user.email}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">الشهادة الرقمية:</span>
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[150px]">
                          {user.digitalSignatureHash}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">آخر نشاط: {user.lastActive}</span>

                    <button
                      type="button"
                      onClick={() => onSwitchUser(user)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs ${
                        isCurrentUser
                          ? 'bg-slate-100 text-slate-400 cursor-default'
                          : 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer active:scale-95'
                      }`}
                      title="تسجيل الدخول ومحاكاة هذا المستخدم لاختبار صلاحياته في النظام"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{isCurrentUser ? 'المستخدم الحالي' : 'تقمص هذا المستخدم'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: FINANCIAL APPROVAL LIMITS */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  سقوف الصلاحيات المالية ومصفوفة الاعتماد التدريجي (Financial Thresholds & Delegation of Authority - DOA)
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-4xl">
                  تحدد هذه المصفوفة الحد الأقصى للمبالغ بالدولار الأمريكي المسموح لكل مستوى إداري اعتمادها بشكل مستقل. في حال تجاوز إجمالي قيمة استمارة طلب المواد الحد المالي المقرر، يقوم النظام تلقائياً بتصعيد الطلب للمستوى الإداري الأعلى مصحوباً بمبررات الاحتياج.
                </p>
              </div>
            </div>

            {/* Threshold Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              {/* Level 1: Requester */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">المستوى الأول (L1)</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      تسجيل الاحتياج
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 mt-2">مقدم الطلب الميداني</h4>
                  <p className="text-xs text-slate-500 mt-1">مشرف الحفر ومهندس الموقع</p>
                  <div className="mt-4 bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">سقف الاعتماد المالي:</span>
                    <span className="text-base font-black text-slate-700">$0 (لا صلاحية مالية)</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
                  يقتصر دوره على توصيف القطع والمواصفات الفنية وتحديد كميات الحفر المطلوبة دون تفويض مالي.
                </p>
              </div>

              {/* Level 2: Dept Head */}
              <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700">المستوى الثاني (L2)</span>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      اعتماد تشغيلي
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 mt-2">رئيس القسم المختص</h4>
                  <p className="text-xs text-slate-500 mt-1">مدير إدارة التعدين والعمليات</p>
                  <div className="mt-4 bg-white p-3 rounded-lg border border-blue-200">
                    <span className="text-[11px] text-slate-500 block">سقف الاعتماد المالي:</span>
                    <span className="text-base font-black text-blue-800">حتى $10,000 دولار</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 mt-4 leading-relaxed">
                  اعتماد فوري للطلبات الدورية ومستهلكات الحفر العادية التي لا تتجاوز 10,000 دولار.
                </p>
              </div>

              {/* Level 3: Site Manager */}
              <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700">المستوى الثالث (L3)</span>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      اعتماد الموقع والمشروع
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 mt-2">مدير مشروع الجكوب</h4>
                  <p className="text-xs text-slate-500 mt-1">مدير المنجم الميداني العام</p>
                  <div className="mt-4 bg-white p-3 rounded-lg border border-amber-200">
                    <span className="text-[11px] text-slate-500 block">سقف الاعتماد المالي:</span>
                    <span className="text-base font-black text-amber-800">حتى $50,000 دولار</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 mt-4 leading-relaxed">
                  اعتماد قطع الغيار الكبرى وعقود الصيانة الطارئة للمعدات الثقيلة حتى 50,000 دولار.
                </p>
              </div>

              {/* Level 4: General Manager */}
              <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-700">المستوى الرابع (L4)</span>
                    <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      صلاحية تنفيذية عليا
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 mt-2">المدير العام التنفيذي</h4>
                  <p className="text-xs text-slate-500 mt-1">الرئيس التنفيذي للمجموعة</p>
                  <div className="mt-4 bg-white p-3 rounded-lg border border-purple-200">
                    <span className="text-[11px] text-slate-500 block">سقف الاعتماد المالي:</span>
                    <span className="text-base font-black text-purple-800">غير محدود (أي قيمة)</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 mt-4 leading-relaxed">
                  اعتماد الطلبات الاستراتيجية واستيراد المعدات والعقود التي تتجاوز 50,000 دولار دون سقف.
                </p>
              </div>
            </div>

            {/* Threshold Adjustments Table for Admins */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h4 className="font-extrabold text-sm text-slate-900 mb-3">
                تعديل السقوف المالية المعتمدة للسياسات المؤسسية (للمسؤولين فقط):
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="p-3 font-bold">الدور الإداري</th>
                      <th className="p-3 font-bold">المستوى الهرمي</th>
                      <th className="p-3 font-bold">السقف المالي الحالي</th>
                      <th className="p-3 font-bold">تعديل الحد المالي (USD)</th>
                      <th className="p-3 font-bold">حالة الاعتماد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roles
                      .filter((r) => r.role !== 'AUDITOR' && r.role !== 'LOGISTICS_OFFICER')
                      .map((r) => (
                        <tr key={r.role} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{r.name}</td>
                          <td className="p-3 font-mono text-slate-600">Level {r.level}</td>
                          <td className="p-3 font-bold text-slate-800">
                            {formatFinancialLimit(r.financialApprovalLimit)}
                          </td>
                          <td className="p-3">
                            {r.role === 'GENERAL_MANAGER' || r.role === 'ADMIN' ? (
                              <span className="text-slate-400 italic">غير قابل للتقييد (صلاحية كاملة)</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  disabled={!isAdmin}
                                  value={r.financialApprovalLimit}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    onUpdateRoleFinancialLimit(r.role, val);
                                  }}
                                  className="w-32 px-2.5 py-1 text-xs border border-slate-300 rounded font-mono font-bold bg-white focus:ring-2 focus:ring-amber-500"
                                />
                                <span className="text-slate-500">$ USD</span>
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              مفعّل ومعتمد
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DIGITAL SIGNATURE & STAMP VAULT */}
      {activeTab === 'signatures' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                <PenTool className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  خزينة التواقيع الرقمية والأختام المشفرة المعتمدة (Cryptographic Signatures & Stamps Vault)
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-4xl">
                  تضم الخزينة شهادات التوقيع الإلكتروني الحية المربوطة بمفاتيح التشفير SHA-256 الخاصة بالمسؤولين التنفيذيين والفنيين بمنجم الجكوب. يتم حقن بصمة الشهادة الرقمية في أي استمارة أمر مشتريات يتم اعتمادها لحمايتها من التزوير أو التلاعب.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {users
                .filter((u) => u.digitalSignatureRegistered)
                .map((u) => (
                  <div key={u.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative overflow-hidden">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                          شهادة معتمدة صالحة
                        </span>
                        <h4 className="font-extrabold text-slate-900 mt-2 text-sm">{u.name}</h4>
                        <p className="text-[11px] text-slate-500">{u.signatureRoleTitle || u.title}</p>
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                        <PenTool className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Stamp visual simulation */}
                    <div className="mt-4 p-3 bg-white border border-dashed border-slate-300 rounded-lg text-center">
                      <div className="border border-blue-900/30 rounded p-2 bg-blue-50/20">
                        <span className="text-[10px] font-black text-blue-950 block">
                          مشروع الجكوب للتعدين • WDM
                        </span>
                        <span className="font-serif italic text-blue-900 font-bold text-sm block my-1">
                          {u.name}
                        </span>
                        <span className="text-[9px] font-mono text-blue-700/80 block">
                          {u.digitalSignatureHash}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 text-[10px] text-slate-500 space-y-1">
                      <div className="flex justify-between">
                        <span>نوع التشفير:</span>
                        <span className="font-mono font-bold text-slate-700">RSA-2048 / SHA-256</span>
                      </div>
                      <div className="flex justify-between">
                        <span>حالة الاعتماد:</span>
                        <span className="text-emerald-700 font-bold">مصادق عليه وموثق بالسجل</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SECURITY AUDIT TRAIL LOG */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Audit filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold text-slate-500 shrink-0">مستوى التدقيق:</span>
              {['ALL', 'INFO', 'WARNING', 'CRITICAL', 'SECURITY'].map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setAuditSeverityFilter(sev)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    auditSeverityFilter === sev
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {sev === 'ALL'
                    ? 'كافة السجلات'
                    : sev === 'INFO'
                    ? 'إجرائي (Info)'
                    : sev === 'WARNING'
                    ? 'تنبيهات مهل (Warning)'
                    : sev === 'SECURITY'
                    ? 'أمان وصلاحيات (Security)'
                    : 'حرج (Critical)'}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في السجلات أو المستخدم..."
                className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Audit Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                    <th className="p-3 font-bold">المعرف والتوقيت</th>
                    <th className="p-3 font-bold">المستخدم المنفّذ</th>
                    <th className="p-3 font-bold">نوع الإجراء</th>
                    <th className="p-3 font-bold">الهدف / المستند</th>
                    <th className="p-3 font-bold min-w-[300px]">تفاصيل العملية وسجل التدقيق</th>
                    <th className="p-3 font-bold">عنوان الشبكة (IP)</th>
                    <th className="p-3 font-bold text-center">المستوى</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 block">{log.id}</span>
                        <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{log.userName}</span>
                        <span className="text-[10px] text-slate-500">[{log.userRole}]</span>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {log.action}
                        </span>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-blue-700">{log.target}</span>
                      </td>

                      <td className="p-3 text-slate-700 leading-relaxed">
                        {log.details}
                      </td>

                      <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-500 dir-ltr">
                        {log.ipAddress}
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            log.severity === 'SECURITY'
                              ? 'bg-purple-100 text-purple-800'
                              : log.severity === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-800'
                              : log.severity === 'WARNING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {log.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW USER */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">تسجيل موظف معتمد جديد بمنظومة الجكوب</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الموظف الكامل *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="مثال: م. حسام الدين عبد العزيز"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المسمى الوظيفي *</label>
                  <input
                    type="text"
                    required
                    value={newUserTitle}
                    onChange={(e) => setNewUserTitle(e.target.value)}
                    placeholder="مهندس حفر وتفجير صخري"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الدور الوظيفي (Role) *</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold bg-white"
                  >
                    {roles.map((r) => (
                      <option key={r.role} value={r.role}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الموقع / المنجم *</label>
                  <select
                    value={newUserSite}
                    onChange={(e) => setNewUserSite(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {SITES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name.split('(')[0]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الإدارة / القسم *</label>
                  <select
                    value={newUserDept}
                    onChange={(e) => setNewUserDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البريد المؤسسي *</label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@wdm-mining.com"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف الميداني</label>
                  <input
                    type="text"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  سيتم تلقائياً توليد شهادة توقيع رقمي SHA-256 معتمدة للموظف الجديد لتمكينه من الاعتماد الإلكتروني الآمن.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
                >
                  حفظ وتفعيل الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
