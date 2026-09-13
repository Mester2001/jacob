import React from 'react';
import { Printer, X, Share2, MessageSquare } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { OfficialRequisitionSheet } from './OfficialRequisitionSheet';

interface PrintableRequisitionProps {
  order: Order;
  onClose: () => void;
  onStatusChange?: (newStatus: OrderStatus) => void;
  onUpdateOrder?: (updatedOrder: Order) => void;
}

export const PrintableRequisition: React.FC<PrintableRequisitionProps> = ({
  order,
  onClose,
  onStatusChange,
  onUpdateOrder,
}) => {
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-100 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col border border-slate-700">
        {/* Top Control Bar */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3 flex items-center justify-between no-print shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm text-amber-400">
              استمارة طلب الشراء الرسمية - مشروع الجكوب للتعدين
            </span>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              [{order.referenceNumber}]
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container with Sheet */}
        <div className="p-3 sm:p-6 overflow-y-auto bg-slate-100">
          <OfficialRequisitionSheet
            order={order}
            onStatusChange={onStatusChange}
            onUpdateOrder={onUpdateOrder}
            showControls={true}
          />
        </div>
      </div>
    </div>
  );
};
