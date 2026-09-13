import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  X,
  UserCheck,
  Sparkles,
  Info
} from 'lucide-react';
import { UserRole } from '../types';
import { INITIAL_ROLE_CONFIGS, RoleConfigItem } from '../data/rolesConfig';

interface RolePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  onSuccessSwitch: (newRole: UserRole) => void;
  rolePasswords: Record<UserRole, string>;
  onUpdateRolePassword?: (role: UserRole, newPass: string) => void;
}

export const RolePasswordModal: React.FC<RolePasswordModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  onSuccessSwitch,
  rolePasswords,
  onUpdateRolePassword,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Admin edit mode
  const [editingRolePass, setEditingRolePass] = useState<UserRole | null>(null);
  const [newRolePassword, setNewRolePassword] = useState('');

  if (!isOpen) return null;

  const targetRoleConfig = INITIAL_ROLE_CONFIGS[selectedRole];
  const requiredPassword = rolePasswords[selectedRole] || targetRoleConfig.defaultPassword;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (passwordInput.trim() === requiredPassword) {
      setSuccessMessage(`تم التحقق بنجاح! تم التبديل إلى دور [${targetRoleConfig.title}].`);
      setTimeout(() => {
        onSuccessSwitch(selectedRole);
        setPasswordInput('');
        onClose();
      }, 700);
    } else {
      setErrorMessage(`كلمة المرور غير صحيحة لدور [${targetRoleConfig.title}]. تلميح كلمة المرور الافتراضية: (${requiredPassword})`);
    }
  };

  const handleSaveNewPassword = (role: UserRole) => {
    if (!newRolePassword.trim()) return;
    if (onUpdateRolePassword) {
      onUpdateRolePassword(role, newRolePassword.trim());
      setEditingRolePass(null);
      setNewRolePassword('');
      setSuccessMessage(`تم تحديث كلمة المرور لدور [${INITIAL_ROLE_CONFIGS[role].title}] بنجاح!`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                التحقق من الصلاحيات وكلمة المرور
              </h3>
              <p className="text-xs text-slate-300">
                كل دور وظيفي محمي بكلمة مرور خاصة للوصول إلى الجزء المخصص له
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Role selector buttons */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              اختر الصلاحية / الدور الذي ترغب في الدخول به:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.values(INITIAL_ROLE_CONFIGS).map((item) => {
                const isSelected = selectedRole === item.role;
                const isCurrent = currentRole === item.role;
                return (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => {
                      setSelectedRole(item.role);
                      setPasswordInput('');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className={`p-3 rounded-xl border text-right transition flex items-start justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400/30 text-amber-950'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <span>{item.title}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-normal">
                            الحالي
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        {item.role === 'REQUESTER'
                          ? 'تقديم ومتابعة بالروابط فقط'
                          : item.role === 'ADMIN'
                          ? 'إدارة النظام والتحكم الكامل'
                          : 'اعتماد ومتابعة الطلبات'}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      [{rolePasswords[item.role] || item.defaultPassword}]
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role Summary Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                حدود وصلاحيات [{targetRoleConfig.title}]:
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${targetRoleConfig.badgeColor}`}>
                {targetRoleConfig.badge}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {targetRoleConfig.description}
            </p>
            <ul className="text-[11px] text-slate-500 space-y-1 pt-1 list-disc list-inside">
              {targetRoleConfig.capabilitiesSummary.map((cap, i) => (
                <li key={i}>{cap}</li>
              ))}
            </ul>
          </div>

          {/* Password Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>كلمة المرور المطلوبة لدور [{targetRoleConfig.title}]:</span>
                </label>
                <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono">
                  الافتراضية: <strong>{requiredPassword}</strong>
                </span>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder={`أدخل كلمة المرور (أو استخدم: ${requiredPassword})`}
                  className="w-full text-sm bg-white border border-slate-300 rounded-xl px-4 py-2.5 pl-10 font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none transition"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                  title={showPassword ? 'إخفاء' : 'إظهار'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2 rounded-xl text-xs transition shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>تأكيد والدخول بالصلاحية</span>
              </button>
            </div>
          </form>

          {/* If current user is Admin: option to manage / change passwords for any role */}
          {currentRole === 'ADMIN' && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>لوحة مدير النظام: تعديل كلمات المرور للصلاحيات:</span>
                </span>
              </div>

              <div className="space-y-2">
                {Object.values(INITIAL_ROLE_CONFIGS).map((item) => (
                  <div
                    key={item.role}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                  >
                    <span className="font-semibold text-slate-800">{item.title}</span>
                    {editingRolePass === item.role ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newRolePassword}
                          onChange={(e) => setNewRolePassword(e.target.value)}
                          placeholder="كلمة مرور جديدة"
                          className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono w-32 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveNewPassword(item.role)}
                          className="bg-emerald-600 text-white px-2 py-1 rounded text-xs font-bold"
                        >
                          حفظ
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingRolePass(null)}
                          className="text-slate-400 hover:text-slate-600 px-1"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded">
                          {rolePasswords[item.role] || item.defaultPassword}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRolePass(item.role);
                            setNewRolePassword(rolePasswords[item.role] || item.defaultPassword);
                          }}
                          className="text-amber-700 hover:text-amber-800 text-[11px] font-bold"
                        >
                          تعديل
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
