import { Order } from '../types';

/**
 * Builds the smart reference code following:
 * [SiteCode]-[DeptCode][Year2Digits][SequenceNumber3Digits]
 * Example: WDM-MI26002
 */
export function formatSmartReference(
  siteCode: string,
  departmentCode: string,
  year: string,
  sequenceNumber: number
): string {
  const cleanSite = (siteCode || 'WDM').trim().toUpperCase();
  const cleanDept = (departmentCode || 'MI').trim().toUpperCase();
  const cleanYear = (year || '26').trim();
  const paddedSeq = String(sequenceNumber).padStart(3, '0');

  return `${cleanSite}-${cleanDept}${cleanYear}${paddedSeq}`;
}

/**
 * Calculates the next sequence number for a given site, department, and year
 */
export function getNextSequence(
  orders: Order[],
  siteCode: string,
  departmentCode: string,
  year: string
): number {
  const matches = orders.filter(
    (o) =>
      o.siteCode.toUpperCase() === siteCode.toUpperCase() &&
      o.departmentCode.toUpperCase() === departmentCode.toUpperCase() &&
      o.year === year
  );

  if (matches.length === 0) {
    return 1;
  }

  const maxSeq = Math.max(...matches.map((o) => o.sequenceNumber || 0));
  return maxSeq + 1;
}

/**
 * Validates whether a reference code adheres to the standard pattern
 */
export function validateReferenceFormat(code: string): boolean {
  // Regex: 3-4 letters site, hyphen, 2-3 letters dept, 2 digits year, 3+ digits sequence
  const pattern = /^[A-Z]{2,5}-[A-Z]{2,4}\d{2}\d{3,}$/;
  return pattern.test(code.trim().toUpperCase());
}

/**
 * Breaks a smart reference code down into its structural components
 */
export function parseReferenceCode(code: string): {
  siteCode: string;
  deptCode: string;
  year: string;
  sequence: number;
  isValid: boolean;
} {
  const clean = code.trim().toUpperCase();
  const parts = clean.split('-');
  if (parts.length !== 2) {
    return { siteCode: '', deptCode: '', year: '', sequence: 0, isValid: false };
  }

  const siteCode = parts[0];
  const rest = parts[1];

  // Match letters at beginning of rest, followed by 2 digits year, followed by digits sequence
  const match = rest.match(/^([A-Z]+)(\d{2})(\d+)$/);
  if (!match) {
    return { siteCode, deptCode: '', year: '', sequence: 0, isValid: false };
  }

  return {
    siteCode,
    deptCode: match[1],
    year: match[2],
    sequence: parseInt(match[3], 10),
    isValid: true,
  };
}
