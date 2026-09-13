/**
 * Link Sharing and Deep-Link Management Utilities
 * Provides bulletproof URL generation, clipboard fallbacks, and WhatsApp direct messaging
 */

import { Order, OrderStatus } from '../types';

/**
 * Returns the current application base URL without query parameters or hashes
 */
export function getAppBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const { protocol, host, pathname } = window.location;
  // Ensure trailing slash or clean path
  return `${protocol}//${host}${pathname}`;
}

/**
 * Generates a public read-only link for team members to track order status
 */
export function generateMemberViewUrl(referenceNumber: string): string {
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}?view=${encodeURIComponent(referenceNumber)}`;
}

/**
 * Generates an administrative/staff tracker deep-link
 */
export function generateStaffTrackUrl(referenceNumber: string): string {
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}#track=${encodeURIComponent(referenceNumber)}`;
}

/**
 * Generates a QR Code image URL for easy mobile scanning on-site
 */
export function generateQrCodeUrl(url: string, size = 180): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&margin=8`;
}

/**
 * Robust clipboard copy utility with fallback for iframe sandboxes
 */
export async function copyToClipboardSafe(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern navigator.clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to textarea fallback
    }
  }

  // 2. Fallback using temporary textarea
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, 99999);
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Safe clipboard fallback failed:', err);
    return false;
  }
}

/**
 * Returns human-readable status badge text in Arabic
 */
export function getStatusArabicName(status: OrderStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'مسودة قيد الإعداد';
    case 'PENDING_DEPT_HEAD':
      return 'قيد مراجعة رئيس القسم';
    case 'PENDING_SITE_MANAGER':
      return 'قيد مصادقة مدير الموقع';
    case 'PENDING_GENERAL_MANAGER':
      return 'قيد الاعتماد المالي والتنفيذي';
    case 'APPROVED_FOR_PO':
      return 'معتمد نهائياً - قيد أمر التوريد';
    case 'PO_ISSUED':
      return 'تم إصدار أمر الشراء وقيد الشحن';
    case 'DELIVERED_RECEIVED':
      return 'تم الاستلام والتسليم بالمستودع';
    case 'REJECTED':
      return 'مرفوض';
    case 'MODIFICATION_REQUESTED':
      return 'مطلوب استكمال مواصفات ونواقص';
    default:
      return status;
  }
}

/**
 * Builds formatted text and direct WhatsApp URL
 */
export function buildWhatsAppShareData(order: Order) {
  const memberUrl = generateMemberViewUrl(order.referenceNumber);
  const statusLabel = getStatusArabicName(order.status);
  const priorityText = order.priority === 'URGENT' ? '⚡ عاجل (24 ساعة)' : 'عادي';

  const messageText = [
    `*📦 إشعار طلب مشتريات وتوريد ميداني - منجم الجكوب*`,
    `--------------------------------`,
    `🔹 *الرقم المرجعي:* ${order.referenceNumber}`,
    `🔹 *الغرض من الطلب:* ${order.purpose || 'مستلزمات تشغيلية'}`,
    `🔹 *الموقع:* ${order.siteCode} (مشروع منجم الجكوب)`,
    `🔹 *القسم:* ${order.departmentCode}`,
    `🔹 *مقدم الطلب:* ${order.requesterName}`,
    `🔹 *الأولوية:* ${priorityText}`,
    `🔹 *الحالة الحالية:* ${statusLabel}`,
    `🔹 *عدد الأصناف:* ${order.items.length} صنف`,
    `--------------------------------`,
    `🔗 *رابط المتابعة المباشرة للأعضاء (عرض فقط دون تسجيل دخول):*`,
    memberUrl,
    `--------------------------------`,
    `منصة المشتريات الميدانية • التحديث فوري ومباشر`,
  ].join('\n');

  const waDirectUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
  const waWebUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;

  return {
    messageText,
    waDirectUrl,
    waWebUrl,
    memberUrl,
  };
}
