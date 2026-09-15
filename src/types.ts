export type PriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NORMAL' | 'URGENT' | 'EMERGENCY';

export type OrderStatus =
  | 'DRAFT'
  | 'PENDING_DEPT_HEAD'
  | 'PENDING_SITE_MANAGER'
  | 'PENDING_GENERAL_MANAGER'
  | 'APPROVED_FOR_PO'
  | 'PO_ISSUED'
  | 'DELIVERED_RECEIVED'
  | 'REJECTED'
  | 'MODIFICATION_REQUESTED';

export type ApprovalStage = 'REQUESTER' | 'DEPT_HEAD' | 'SITE_MANAGER' | 'GENERAL_MANAGER';

export type UserRole =
  | 'REQUESTER'
  | 'DEPT_HEAD'
  | 'SITE_MANAGER'
  | 'GENERAL_MANAGER'
  | 'LOGISTICS_OFFICER'
  | 'AUDITOR'
  | 'ADMIN';

export type PermissionAction =
  // Orders & Requisitions
  | 'orders:create'
  | 'orders:view_all'
  | 'orders:view_dept'
  | 'orders:approve_dept'
  | 'orders:approve_site'
  | 'orders:approve_gm'
  | 'orders:reject'
  | 'orders:request_mod'
  | 'orders:export_csv'
  | 'orders:print_official'
  // Logistics & Warehousing
  | 'logistics:issue_po'
  | 'logistics:warehouse_receive'
  | 'logistics:update_inventory'
  // Item Catalog
  | 'catalog:view'
  | 'catalog:create'
  | 'catalog:edit_pricing'
  // Audit, Security & SLA
  | 'audit:view_logs'
  | 'sla:escalate'
  // RBAC & Administration
  | 'rbac:manage_roles'
  | 'rbac:manage_users';

export interface PermissionDefinition {
  action: PermissionAction;
  name: string;
  category: 'ORDERS' | 'APPROVALS' | 'LOGISTICS' | 'CATALOG' | 'AUDIT' | 'SECURITY';
  categoryName: string;
  description: string;
  severity: 'NORMAL' | 'HIGH' | 'CRITICAL';
}

export interface RoleDefinition {
  role: UserRole;
  name: string;
  englishTitle: string;
  description: string;
  level: number;
  financialApprovalLimit: number; // in USD (Infinity for General Manager/Admin)
  permissions: PermissionAction[];
  color: string;
  badge: string;
}

export interface AppUser {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  role: UserRole;
  siteCode: string;
  departmentCode: string;
  isActive: boolean;
  lastActive: string;
  digitalSignatureRegistered: boolean;
  digitalSignatureHash?: string;
  signatureRoleTitle?: string;
  customPermissions?: PermissionAction[];
}

export type AuditLogCategory =
  | 'CONTENT_MODIFICATION'
  | 'STATUS_CHANGE'
  | 'ORDER_CREATION'
  | 'APPROVAL'
  | 'LOGISTICS'
  | 'TASK_LOCK'
  | 'SECURITY';

export interface AuditFieldDiff {
  field: string;
  fieldLabel: string;
  oldValue: string | number | null;
  newValue: string | number | null;
}

export interface AuditItemChange {
  changeType: 'ADDED' | 'REMOVED' | 'MODIFIED';
  itemNumber?: number;
  itemName: string;
  specs?: string;
  quantity?: number;
  unit?: string;
  diffs?: AuditFieldDiff[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  target: string;
  details: string;
  ipAddress: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SECURITY';
  category?: AuditLogCategory;
  orderId?: string;
  orderReference?: string;
  itemChanges?: AuditItemChange[];
  fieldDiffs?: AuditFieldDiff[];
  summaryChanges?: string[];
}

export interface Site {
  code: string;
  name: string;
  englishName: string;
  region: string;
}

export interface Department {
  code: string;
  name: string;
  englishName: string;
}

export interface OrderItem {
  id: string;
  itemNumber: number;
  catalogId?: string;
  name: string;
  technicalSpecs: string;
  quantity: number;
  unit: string;
  notes?: string;
  estimatedUnitPrice?: number;
}

export interface ApprovalRecord {
  stage: ApprovalStage;
  roleName: string;
  approverName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFICATION_REQUESTED';
  timestamp?: string;
  signatureDataUrl?: string;
  comments?: string;
  slaDeadline?: string;
  isEscalated?: boolean;
}

export interface LogisticsDelivery {
  poNumber?: string;
  vendor?: string;
  shippingMethod?: string;
  slaDays?: number;
  estimatedDeliveryDate?: string;
  receivedDate?: string;
  receivedBy?: string;
  receivingNotes?: string;
  inventoryUpdated?: boolean;
}

export interface TaskLock {
  isLocked: boolean;
  lockedBy: string;
  lockedById: string;
  lockedAt: string;
  lockedRole?: string;
}

export interface WhatsAppNotification {
  id: string;
  timestamp: string;
  type: 'NEW_ORDER' | 'STATUS_UPDATE' | 'TASK_CLAIMED' | 'URGENT_ESCALATION';
  recipientGroup: string;
  messageText: string;
  interactiveButtons: string[];
  deliveryStatus: 'SENT' | 'DELIVERED' | 'READ';
  orderReference: string;
}

export type LifecycleStatusCategory =
  | 'NEW' // 🟡 جديد
  | 'PENDING_APPROVAL' // 🔵 قيد الاعتماد
  | 'IN_PROGRESS' // 🟠 قيد التنفيذ/التوريد
  | 'COMPLETED' // 🟢 مكتمل / تم التسليم
  | 'CANCELLED'; // 🔴 ملغي / مرفوض

export interface Order {
  id: string;
  referenceNumber: string; // e.g., WDM-MI26002
  siteCode: string;
  departmentCode: string;
  year: string; // "26"
  sequenceNumber: number; // 2 -> "002"
  orderDate: string;
  requesterName: string;
  requesterEmail?: string;
  purpose: string;
  priority: PriorityLevel;
  pagesCount: number;
  status: OrderStatus;
  items: OrderItem[];
  approvals: ApprovalRecord[];
  logistics?: LogisticsDelivery;
  taskLock?: TaskLock;
  whatsAppNotifications?: WhatsAppNotification[];
  requestedFrom?: string;
  executionDays?: string;
  departmentName?: string;
  urgencyAlertSent?: boolean;
  isEscalated?: boolean;
  escalatedAt?: string;
  createdAt: string;
  lastUpdated: string;
}

export interface CatalogItem {
  id: string;
  code: string;
  name: string;
  englishName: string;
  category: string;
  standardSpecs: string;
  standardUnit: string;
  estimatedUnitPrice: number;
  stockAvailable: number;
  minStockLevel: number;
}

export interface UserAudioSettings {
  soundEnabled: boolean;           // Master toggle: إيقاف / تشغيل الصوت
  notifyOnStatusChange: boolean;   // تنبيه صوتي عند تغيير حالة الطلب
  notifyOnNewOrder: boolean;       // تنبيه صوتي عند وصول طلب جديد
  volume: number;                  // 0.1 to 1.0 (default 0.7)
}
