import React from 'react';
import { Flame, Clock, ArrowDownCircle, AlertTriangle } from 'lucide-react';
import { PriorityLevel } from '../types';
import { getPriorityMeta, normalizePriority } from '../utils/priority';

interface PriorityBadgeProps {
  priority?: PriorityLevel | string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showSla?: boolean;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  size = 'sm',
  showSla = false,
  className = '',
}) => {
  const norm = normalizePriority(priority);
  const meta = getPriorityMeta(norm);

  const renderIcon = (iconSizeClass: string) => {
    switch (norm) {
      case 'HIGH':
        return <Flame className={`${iconSizeClass} text-rose-600 shrink-0 animate-pulse`} />;
      case 'MEDIUM':
        return <Clock className={`${iconSizeClass} text-amber-600 shrink-0`} />;
      case 'LOW':
        return <ArrowDownCircle className={`${iconSizeClass} text-emerald-600 shrink-0`} />;
      default:
        return <AlertTriangle className={`${iconSizeClass} text-slate-500 shrink-0`} />;
    }
  };

  if (size === 'xs') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border tracking-tight ${meta.badgeClasses} ${className}`}
        title={`${meta.fullLabel} - ${meta.description}`}
      >
        {renderIcon('w-3 h-3')}
        <span>{meta.label}</span>
      </span>
    );
  }

  if (size === 'lg') {
    return (
      <div
        className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl text-xs font-black border shadow-2xs ${meta.badgeClasses} ${className}`}
        title={`${meta.fullLabel} - ${meta.description}`}
      >
        {renderIcon('w-4 h-4')}
        <div className="flex flex-col text-right">
          <span className="leading-tight">{meta.fullLabel}</span>
          {showSla && (
            <span className="text-[10px] opacity-85 font-mono font-medium">
              SLA: {meta.slaText}
            </span>
          )}
        </div>
      </div>
    );
  }

  // default 'sm' / 'md'
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black border shadow-2xs ${meta.badgeClasses} ${className}`}
      title={`${meta.fullLabel} - ${meta.description} (مهلة: ${meta.slaText})`}
    >
      {renderIcon(size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3')}
      <span>{meta.label}</span>
      {showSla && (
        <span className="text-[9px] px-1 py-0.2 bg-white/70 rounded font-mono font-bold">
          {meta.slaText}
        </span>
      )}
    </span>
  );
};
