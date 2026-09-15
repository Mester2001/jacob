import React, { useState } from 'react';
import { ChevronDown, ChevronUp, PlusCircle, Trash2, Edit3, SlidersHorizontal, Info, ArrowLeft } from 'lucide-react';
import { AuditLogEntry, AuditItemChange, AuditFieldDiff } from '../types';

interface AuditModificationDetailsProps {
  log: AuditLogEntry;
  defaultExpanded?: boolean;
  compact?: boolean;
}

export const AuditModificationDetails: React.FC<AuditModificationDetailsProps> = ({
  log,
  defaultExpanded = false,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const itemChanges = log.itemChanges || [];
  const fieldDiffs = log.fieldDiffs || [];
  const summaryChanges = log.summaryChanges || [];

  const totalModifications = itemChanges.length + fieldDiffs.length;

  // If no structured changes exist, just show the textual details
  if (totalModifications === 0 && summaryChanges.length === 0) {
    return <span className="text-slate-700 leading-relaxed text-xs">{log.details}</span>;
  }

  return (
    <div className="space-y-2 text-xs" dir="rtl">
      {/* Primary details line */}
      <div className="text-slate-800 font-medium leading-relaxed">
        {log.details}
      </div>

      {/* Interactive Expand / Collapse Pill */}
      {totalModifications > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 font-bold transition text-[11px] cursor-pointer shadow-2xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700" />
            <span>
              {isExpanded
                ? 'إخفاء تفاصيل التعديلات الفنية'
                : `عرض تفاصيل التعديلات الفنية (${totalModifications} تغيير)`}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-amber-700" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-amber-700" />
            )}
          </button>
        </div>
      )}

      {/* Expanded Details Card */}
      {isExpanded && totalModifications > 0 && (
        <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 shadow-inner">
          {/* Header Metadata Changes */}
          {fieldDiffs.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                <span>تعديلات بيانات واستمارة الطلب ({fieldDiffs.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {fieldDiffs.map((diff, i) => (
                  <div
                    key={i}
                    className="bg-white border border-slate-200/80 rounded-lg p-2 text-[11px] shadow-2xs space-y-1"
                  >
                    <span className="font-bold text-slate-800 block">{diff.fieldLabel}</span>
                    <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[10px]">
                      <span className="line-through bg-rose-50 text-rose-700 px-1 py-0.5 rounded border border-rose-200/60 max-w-[140px] truncate">
                        {String(diff.oldValue ?? '-')}
                      </span>
                      <ArrowLeft className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="bg-emerald-50 text-emerald-800 font-bold px-1 py-0.5 rounded border border-emerald-200/60 max-w-[140px] truncate">
                        {String(diff.newValue ?? '-')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Item Changes */}
          {itemChanges.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block"></span>
                <span>التعديلات على جدول الأصناف والمستلزمات ({itemChanges.length})</span>
              </div>

              <div className="space-y-2">
                {itemChanges.map((change, idx) => {
                  if (change.changeType === 'ADDED') {
                    return (
                      <div
                        key={idx}
                        className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <PlusCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-bold text-emerald-950 block">
                              صنف مضاف: {change.itemName}
                            </span>
                            {change.specs && (
                              <span className="text-[10px] text-emerald-800 block">
                                المواصفات: {change.specs}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-bold font-mono text-[10px]">
                          الكمية: {change.quantity} {change.unit}
                        </div>
                      </div>
                    );
                  }

                  if (change.changeType === 'REMOVED') {
                    return (
                      <div
                        key={idx}
                        className="bg-rose-50/70 border border-rose-200 rounded-lg p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                          <div>
                            <span className="font-bold text-rose-950 block">
                              صنف محذوف: {change.itemName}
                            </span>
                            {change.specs && (
                              <span className="text-[10px] text-rose-700 block">
                                المواصفات: {change.specs}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 bg-rose-100 text-rose-900 px-2 py-0.5 rounded font-bold font-mono text-[10px] line-through">
                          كانت الكمية: {change.quantity} {change.unit}
                        </div>
                      </div>
                    );
                  }

                  // MODIFIED
                  return (
                    <div
                      key={idx}
                      className="bg-white border border-blue-200 rounded-lg p-2.5 text-[11px] shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Edit3 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-bold text-slate-900">
                            صنف معدل: {change.itemName}
                          </span>
                        </div>
                        <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded font-bold">
                          {change.diffs?.length || 1} تعديل في الصنف
                        </span>
                      </div>

                      {/* Field Diffs for this item */}
                      {change.diffs && change.diffs.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {change.diffs.map((d, dIdx) => (
                            <div
                              key={dIdx}
                              className="bg-slate-50 border border-slate-200 rounded p-1.5 text-[10px]"
                            >
                              <div className="font-bold text-slate-700 mb-0.5">{d.fieldLabel}:</div>
                              <div className="flex items-center gap-1 text-slate-600">
                                <span className="line-through bg-rose-50 text-rose-700 px-1 py-0.2 rounded text-[10px]">
                                  {String(d.oldValue ?? '-')}
                                </span>
                                <ArrowLeft className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="bg-emerald-50 text-emerald-800 font-bold px-1 py-0.2 rounded text-[10px]">
                                  {String(d.newValue ?? '-')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
