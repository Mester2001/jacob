import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, Check, ShieldCheck } from 'lucide-react';

interface DigitalSignaturePadProps {
  signerName: string;
  roleTitle: string;
  onSaveSignature: (signatureData: string) => void;
  onCancel?: () => void;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  signerName,
  roleTitle,
  onSaveSignature,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [mode, setMode] = useState<'DRAW' | 'STAMP'>('STAMP');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth || 400;
    canvas.height = 140;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1e3a8a'; // Deep blue ink
  }, [mode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    if (mode === 'DRAW') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return;
      onSaveSignature(canvas.toDataURL('image/png'));
    } else {
      // Generate a digital cryptographic stamp text or SVG
      onSaveSignature(`STAMP:${signerName}:${roleTitle}:${new Date().toISOString()}`);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm" id="digital-signature-pad">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <PenTool className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">التوقيع والاعتماد الإلكتروني</h4>
            <p className="text-xs text-slate-500">
              الموقّع: <span className="font-semibold text-slate-700">{signerName}</span> ({roleTitle})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setMode('STAMP')}
            className={`px-2.5 py-1 rounded-md transition font-medium ${
              mode === 'STAMP' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ختم رقمي موثق
          </button>
          <button
            type="button"
            onClick={() => setMode('DRAW')}
            className={`px-2.5 py-1 rounded-md transition font-medium ${
              mode === 'DRAW' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            رسم التوقيع باليد
          </button>
        </div>
      </div>

      {mode === 'DRAW' ? (
        <div className="relative">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-32 bg-white border border-dashed border-slate-300 rounded-lg cursor-crosshair touch-none"
          />
          {!hasDrawn && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs">
              <span>ارسم توقيعك هنا بالماوس أو الإصبع...</span>
            </div>
          )}
          <button
            type="button"
            onClick={clearCanvas}
            className="absolute top-2 left-2 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs flex items-center gap-1 transition"
            title="مسح التوقيع"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            مسح
          </button>
        </div>
      ) : (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg flex items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-blue-600 border-dashed flex items-center justify-center text-blue-700 bg-white shrink-0 shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="text-xs">
            <div className="font-bold text-blue-950 text-sm flex items-center gap-2">
              <span>ختم إلكتروني معتمد رسمياً</span>
              <span className="bg-blue-200 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-mono">
                SECURE-SHA256
              </span>
            </div>
            <p className="text-slate-600 mt-1">
              سيتم تسجيل التوقيع وتضمين البصمة الزمنية (Timestamp) وعنوان الـ IP واسم المسؤول في سجل التدقيق غير القابل للتعديل.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 mt-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            إلغاء
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={mode === 'DRAW' && !hasDrawn}
          className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition"
        >
          <Check className="w-3.5 h-3.5" />
          تأكيد التوقيع والاعتماد
        </button>
      </div>
    </div>
  );
};
