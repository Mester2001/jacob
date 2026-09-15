import { Order, OrderItem, AuditFieldDiff, AuditItemChange } from '../types';

export interface OrderDiffResult {
  hasChanges: boolean;
  itemChanges: AuditItemChange[];
  fieldDiffs: AuditFieldDiff[];
  summaryLines: string[];
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

/**
 * Computes exact differences between original and updated order.
 * Tracks item additions, deletions, modifications to quantity, specs, unit, notes,
 * as well as requisition metadata (department, execution days, requested from, etc.)
 */
export function computeOrderModifications(
  oldOrder: Order,
  newOrder: Order
): OrderDiffResult {
  const itemChanges: AuditItemChange[] = [];
  const fieldDiffs: AuditFieldDiff[] = [];
  const summaryLines: string[] = [];
  let severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO';

  // 1. Compare Order-level header metadata
  const checkField = (
    field: keyof Order,
    label: string,
    oldVal: any,
    newVal: any
  ) => {
    const v1 = oldVal ?? '';
    const v2 = newVal ?? '';
    if (String(v1).trim() !== String(v2).trim()) {
      fieldDiffs.push({
        field: String(field),
        fieldLabel: label,
        oldValue: v1 || 'غير محدد',
        newValue: v2 || 'غير محدد',
      });
      summaryLines.push(`تعديل ${label}: من "${v1 || '-'}" إلى "${v2 || '-'}"`);
    }
  };

  checkField('departmentName', 'الإدارة / القسم الطالب', oldOrder.departmentName, newOrder.departmentName);
  checkField('executionDays', 'فترة وأيام التنفيذ المطلوبة', oldOrder.executionDays, newOrder.executionDays);
  checkField('requestedFrom', 'الجهة المطلوب منها', oldOrder.requestedFrom, newOrder.requestedFrom);
  checkField('purpose', 'الغرض من الطلب', oldOrder.purpose, newOrder.purpose);
  checkField('requesterName', 'مقدم الطلب', oldOrder.requesterName, newOrder.requesterName);

  if (oldOrder.priority !== newOrder.priority) {
    fieldDiffs.push({
      field: 'priority',
      fieldLabel: 'مستوى الأولوية',
      oldValue: oldOrder.priority,
      newValue: newOrder.priority,
    });
    summaryLines.push(`تعديل الأولوية: من [${oldOrder.priority}] إلى [${newOrder.priority}]`);
    if (newOrder.priority === 'EMERGENCY' || newOrder.priority === 'URGENT') {
      severity = 'WARNING';
    }
  }

  // 2. Compare Items (Added, Removed, Modified)
  const oldItems = oldOrder.items || [];
  const newItems = newOrder.items || [];

  // Match items primarily by item ID (or fallback to index/name)
  const oldItemsMap = new Map<string, OrderItem>();
  oldItems.forEach((it, idx) => {
    const key = it.id || `item-idx-${idx}`;
    oldItemsMap.set(key, it);
  });

  const processedOldKeys = new Set<string>();

  newItems.forEach((newItem, newIdx) => {
    // Check if matching item exists in old items
    const matchKey = newItem.id || `item-idx-${newIdx}`;
    let matchedOldItem = oldItemsMap.get(matchKey);

    // If not matched by id, try matching by name if only 1 with this name
    if (!matchedOldItem) {
      const candidates = oldItems.filter((o) => !processedOldKeys.has(o.id || '') && o.name.trim() === newItem.name.trim());
      if (candidates.length === 1) {
        matchedOldItem = candidates[0];
      }
    }

    if (!matchedOldItem) {
      // ITEM ADDED
      itemChanges.push({
        changeType: 'ADDED',
        itemNumber: newItem.itemNumber || newIdx + 1,
        itemName: newItem.name,
        specs: newItem.technicalSpecs,
        quantity: newItem.quantity,
        unit: newItem.unit,
      });
      summaryLines.push(
        `إضافة صنف جديد: [${newItem.name}] (كمية: ${newItem.quantity} ${newItem.unit})`
      );
    } else {
      processedOldKeys.add(matchedOldItem.id || matchKey);

      // Compare individual fields of matched item
      const itemDiffs: AuditFieldDiff[] = [];

      // Name
      if (matchedOldItem.name.trim() !== newItem.name.trim()) {
        itemDiffs.push({
          field: 'name',
          fieldLabel: 'اسم ومسمى الصنف',
          oldValue: matchedOldItem.name,
          newValue: newItem.name,
        });
      }

      // Quantity
      if (Number(matchedOldItem.quantity) !== Number(newItem.quantity)) {
        itemDiffs.push({
          field: 'quantity',
          fieldLabel: 'الكمية المطلوبة',
          oldValue: matchedOldItem.quantity,
          newValue: newItem.quantity,
        });

        // If quantity changed substantially (>50% increase), flag warning
        if (newItem.quantity > matchedOldItem.quantity * 1.5) {
          severity = 'WARNING';
        }
      }

      // Unit
      if (matchedOldItem.unit.trim() !== newItem.unit.trim()) {
        itemDiffs.push({
          field: 'unit',
          fieldLabel: 'وحدة القياس',
          oldValue: matchedOldItem.unit,
          newValue: newItem.unit,
        });
      }

      // Technical Specs
      if ((matchedOldItem.technicalSpecs || '').trim() !== (newItem.technicalSpecs || '').trim()) {
        itemDiffs.push({
          field: 'technicalSpecs',
          fieldLabel: 'المواصفات الفنية / رقم القطعة',
          oldValue: matchedOldItem.technicalSpecs || '-',
          newValue: newItem.technicalSpecs || '-',
        });
      }

      // Notes
      if ((matchedOldItem.notes || '').trim() !== (newItem.notes || '').trim()) {
        itemDiffs.push({
          field: 'notes',
          fieldLabel: 'ملاحظات الصنف',
          oldValue: matchedOldItem.notes || '-',
          newValue: newItem.notes || '-',
        });
      }

      // Estimated unit price if present
      if (
        matchedOldItem.estimatedUnitPrice !== undefined &&
        newItem.estimatedUnitPrice !== undefined &&
        matchedOldItem.estimatedUnitPrice !== newItem.estimatedUnitPrice
      ) {
        itemDiffs.push({
          field: 'estimatedUnitPrice',
          fieldLabel: 'السعر التقديري للوحدة',
          oldValue: matchedOldItem.estimatedUnitPrice,
          newValue: newItem.estimatedUnitPrice,
        });
      }

      if (itemDiffs.length > 0) {
        itemChanges.push({
          changeType: 'MODIFIED',
          itemNumber: newItem.itemNumber || newIdx + 1,
          itemName: newItem.name,
          specs: newItem.technicalSpecs,
          quantity: newItem.quantity,
          unit: newItem.unit,
          diffs: itemDiffs,
        });

        const diffSummary = itemDiffs
          .map((d) => `${d.fieldLabel}: (${d.oldValue} ➔ ${d.newValue})`)
          .join('، ');
        summaryLines.push(`تعديل صنف [${newItem.name}]: ${diffSummary}`);
      }
    }
  });

  // Check for REMOVED items
  oldItems.forEach((oldItem, idx) => {
    const key = oldItem.id || `item-idx-${idx}`;
    if (!processedOldKeys.has(key)) {
      // Check if it was matched
      const stillExists = newItems.some((n) => (n.id && n.id === oldItem.id) || n.name.trim() === oldItem.name.trim());
      if (!stillExists) {
        itemChanges.push({
          changeType: 'REMOVED',
          itemNumber: oldItem.itemNumber || idx + 1,
          itemName: oldItem.name,
          specs: oldItem.technicalSpecs,
          quantity: oldItem.quantity,
          unit: oldItem.unit,
        });
        summaryLines.push(
          `حذف صنف: [${oldItem.name}] (كانت الكمية: ${oldItem.quantity} ${oldItem.unit})`
        );
        severity = 'WARNING'; // Removing items is sensitive in procurement
      }
    }
  });

  const hasChanges = itemChanges.length > 0 || fieldDiffs.length > 0;

  return {
    hasChanges,
    itemChanges,
    fieldDiffs,
    summaryLines,
    severity,
  };
}
