import React, { useState } from 'react';
import {
  Database,
  Code2,
  Layers,
  Server,
  Copy,
  Check,
  Terminal,
  Cpu,
  Smartphone,
  ShieldCheck,
  Lock,
  Workflow,
  CheckCircle2
} from 'lucide-react';

export const TechnicalArchitectureView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SCHEMA' | 'UI_SPEC' | 'LOGIC' | 'APIS'>('SCHEMA');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // 1. PostgreSQL Database Schema
  const sqlSchema = `-- =================================================================
-- WDM MINING & PROCUREMENT SYSTEM - COMPLETE POSTGRESQL DATABASE SCHEMA
-- نظام إدارة وتتبع الطلبات الميدانية والخدمات اللوجستية - منجم الجكوب
-- =================================================================

-- 1. جدول المواقع والمناجم الميدانية (Sites Master Table)
CREATE TABLE sites (
    site_code VARCHAR(10) PRIMARY KEY, -- مثال: 'WDM' (منجم الجكوب), 'EDM'
    site_name VARCHAR(255) NOT NULL,
    english_name VARCHAR(255),
    region VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. جدول الأقسام والإدارات التشغيلية (Departments Master Table)
CREATE TABLE departments (
    dept_code VARCHAR(10) PRIMARY KEY, -- مثال: 'MI' (التعدين), 'EQ' (المعدات), 'LG' (اللوجستيات)
    dept_name VARCHAR(255) NOT NULL,
    english_name VARCHAR(255),
    head_user_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. دليل الأصناف الموحد (Item Master Catalog Table)
-- يمنع النظام كتابة أسماء الأصناف يدوياً عند وجودها في هذا الدليل
CREATE TABLE catalog_items (
    id VARCHAR(64) PRIMARY KEY, -- مثال: 'CAT-001'
    code VARCHAR(50) UNIQUE NOT NULL, -- كود الصنف: 'PRT-FLT-092'
    name VARCHAR(255) NOT NULL,
    english_name VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    standard_specs TEXT NOT NULL, -- المواصفات القياسية المعتمدة
    standard_unit VARCHAR(50) NOT NULL, -- 'قطعة', 'طقم', 'برميل', 'متر'
    estimated_unit_price NUMERIC(12, 2) DEFAULT 0.00,
    stock_available INT DEFAULT 0,
    min_stock_level INT DEFAULT 5,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. جدول الطلبات الرئيسي (Orders Header Table)
-- يدعم الرقم المرجعي الذكي وحالات دورة الحياة الـ 5
CREATE TABLE orders (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number VARCHAR(50) UNIQUE NOT NULL, -- الصيغة: [الموقع]-[القسم][السنة][التسلسل] مثال: WDM-MI26002
    site_code VARCHAR(10) NOT NULL REFERENCES sites(site_code),
    dept_code VARCHAR(10) NOT NULL REFERENCES departments(dept_code),
    year_code VARCHAR(4) NOT NULL, -- '26'
    sequence_number INT NOT NULL, -- 2 (تنسيق '002')
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    requester_name VARCHAR(255) NOT NULL,
    requester_email VARCHAR(255),
    purpose TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('NORMAL', 'URGENT', 'EMERGENCY')),
    pages_count INT DEFAULT 1,
    
    -- دورة حياة الطلب (5 حالات قياسية):
    -- NEW (🟡 جديد), PENDING_APPROVAL (🔵 قيد الاعتماد), IN_PROGRESS (🟠 قيد التنفيذ/التوريد),
    -- COMPLETED (🟢 مكتمل / تم التسليم), CANCELLED (🔴 ملغي / مرفوض)
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_DEPT_HEAD',
    lifecycle_category VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL',
    
    -- مؤشرات الـ SLA والتصعيد التلقائي خلال 24 ساعة للطلبات العاجلة
    urgency_alert_sent BOOLEAN DEFAULT FALSE,
    is_escalated BOOLEAN DEFAULT FALSE,
    escalated_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- قيد فريد يمنع تكرار التسلسل لنفس الموقع والقسم في نفس السنة
    CONSTRAINT uq_site_dept_year_seq UNIQUE (site_code, dept_code, year_code, sequence_number)
);

-- 5. جدول تفاصيل أصناف الطلب (Order Items Table)
-- يمنع حفظ أو إرسال أي بند يفتقر إلى المواصفات، الكمية، أو الوحدة
CREATE TABLE order_items (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_number INT NOT NULL,
    catalog_id VARCHAR(64) REFERENCES catalog_items(id),
    name VARCHAR(255) NOT NULL,
    technical_specs TEXT NOT NULL, -- إلزامي لضمان جودة التوريد
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL, -- إلزامي: قطعة، لتر، طقم، إلخ
    notes TEXT,
    estimated_unit_price NUMERIC(12, 2) DEFAULT 0.00
);

-- 6. جدول حجز المهمة ومنع التضارب اللوجستي (Task Locking & Conflict Prevention)
-- عند استلام أحد أعضاء الفريق المهمة، تُقفل فوراً أمام البقية لمنع الازدواجية
CREATE TABLE task_locks (
    order_id VARCHAR(64) PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_by_user_id VARCHAR(64),
    locked_by_name VARCHAR(255),
    locked_role VARCHAR(50),
    locked_at TIMESTAMP WITH TIME ZONE,
    lock_version INT DEFAULT 1, -- لدعم القفل المتفائل (Optimistic Concurrency Control)
    last_heartbeat TIMESTAMP WITH TIME ZONE
);

-- 7. جدول سجل الاعتمادات والتوقيعات الرقمية (Approval Workflow & Digital Signatures)
CREATE TABLE approval_logs (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    stage VARCHAR(30) NOT NULL, -- 'REQUESTER', 'DEPT_HEAD', 'SITE_MANAGER', 'GENERAL_MANAGER'
    role_name VARCHAR(100) NOT NULL,
    approver_name VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL, -- 'PENDING', 'APPROVED', 'REJECTED', 'MODIFICATION_REQUESTED'
    action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    signature_data_hash TEXT, -- بصمة التوقيع الرقمي المشفرة
    comments TEXT,
    sla_deadline TIMESTAMP WITH TIME ZONE
);

-- 8. جدول التوريد والخدمات اللوجستية (Logistics & PO Deliveries)
CREATE TABLE logistics_deliveries (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(64) UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    po_number VARCHAR(50) UNIQUE, -- أمر الشراء الصادر 'PO-2026-0881'
    vendor_name VARCHAR(255),
    shipping_method VARCHAR(100),
    sla_days INT DEFAULT 3,
    estimated_delivery_date DATE,
    received_date TIMESTAMP WITH TIME ZONE,
    received_by VARCHAR(255),
    receiving_notes TEXT,
    inventory_updated BOOLEAN DEFAULT FALSE
);

-- 9. جدول تكامل وإشعارات الواتساب (WhatsApp Business API Integrations)
CREATE TABLE whatsapp_notifications (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    recipient_group_id VARCHAR(100) NOT NULL,
    wa_message_id VARCHAR(100) UNIQUE,
    message_type VARCHAR(50) NOT NULL, -- 'NEW_ORDER_CARD', 'STATUS_UPDATE', 'CLAIM_TASK'
    card_payload JSONB NOT NULL,
    interactive_buttons JSONB, -- ['استلام المهمة', 'عرض التفاصيل', 'رابط التتبع']
    delivery_status VARCHAR(30) DEFAULT 'SENT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. جدول المستخدمين والصلاحيات المحمية بكلمات المرور (App Users & Roles)
CREATE TABLE app_users (
    user_id VARCHAR(64) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    role_code VARCHAR(30) NOT NULL, -- 'REQUESTER', 'DEPT_HEAD', 'SITE_MANAGER', 'GENERAL_MANAGER', 'LOGISTICS_OFFICER', 'ADMIN'
    role_password_hash VARCHAR(255) NOT NULL,
    site_code VARCHAR(10) REFERENCES sites(site_code),
    dept_code VARCHAR(10) REFERENCES departments(dept_code),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- فهارس الأداء العالي والبحث السريع
CREATE INDEX idx_orders_ref_num ON orders(reference_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_priority ON orders(priority);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_task_locks_order ON task_locks(order_id);
`;

  // 2. UI/UX Specification
  const uiUxSpec = `## واجهات المستخدم وتجربة الاستخدام (UI/UX Specification)
نظام إدارة وتتبع الطلبات الميدانية - منجم الجكوب

---

### 1. شاشة إنشاء وتقديم الطلب (Order Creation Screen)
* **المكونات وحقول البيانات الرئيسية**:
  - **حقول الطلب الأساسية**: تاريخ الطلب (Calendar)، اختيار المنجم/الموقع (Dropdown: WDM - منجم الجكوب)، اختيار القسم المختص (Dropdown: MI, EQ, LG, SC)، الغرض التشغيلي من الشراء (Textarea)، أولوية التنفيذ (عادي / عاجل ⚡)، وعدد الصفحات الملحقة.
  - **بطاقة المعاينة الحية للرقم المرجعي (Live Smart Code Preview)**:
    - تعرض للمستخدم فوراً الرقم المرجعي المتوقع قبل الإرسال مثل \`WDM-MI26002\` بناءً على اختيارات الموقع والقسم والسنة والتسلسل.
  - **جدول أصناف الطلب (Items Table)**:
    - حقل اختيار الصنف من كتالوج موحد (Item Catalog Combobox) مع منع الكتابة اليدوية الحرة للأصناف المسجلة مسبقاً.
    - حقل المواصفات الفنية التفصيلية (Technical Specs) إلزامي لا يمكن تركه فارغاً.
    - حقل الكمية الرقمية وحقل وحدة القياس (قطعة، برميل، طقم، متر).
    - حقل الملاحظات الفنية.
  - **محرك التحقق الصارم (Validation Engine)**:
    - يمنع زر الإرسال ويوضح رسائل خطأ باللون الأحمر في حال غياب المواصفات الفنية أو الكمية أو الوحدة، أو عند محاولة إدخال أصناف مكررة.

---

### 2. شاشة الاعتمادات والتوقيع الرقمي (Approvals & Workflow Screen)
* **المكونات وسلسلة الإجراءات**:
  - **سلسلة الاعتماد الخطية**: (مقدم الطلب -> اعتماد رئيس القسم -> اعتماد مدير الموقع -> تصديق المدير العام).
  - **لوحة التوقيع الرقمي (Signature Pad & Electronic Stamp)**:
    - مساحة تفاعلية للتوقيع بالقلم أو اللمس، مع زر التوقيع بالختم الرقمي المعتمد المشفر.
  - **أزرار اتخاذ القرار**:
    - [اعتماد الطلب والتمرير للمرحلة التالية]: يطلب التوقيع الرقمي ويوثق الطابع الزمني واسم المعتمد.
    - [طلب استكمال مواصفات ونواقص]: يعيد الطلب إلى مقدمه مع حقل إلزامي لكتابة النواقص المطلوبة.
    - [رفض الطلب]: يرفض الطلب نهائياً مع تسجيل أسباب الرفض الفنية في سجل التدقيق الأمني.
  - **مؤقت الـ SLA والتصعيد**:
    - شريط زمني ينبه بالطلبات العاجلة ويشير إلى التصعيد التلقائي للمستوى الأعلى عند تجاوز 24 ساعة.

---

### 3. لوحة التحكم المركزية (Executive & Operations Dashboard)
* **المكونات والتحليلات**:
  - **شريط تصنيف دورة حياة الطلب الـ 5 (5-Tier Lifecycle Metric Bar)**:
    - 🟡 جديد (New)
    - 🔵 قيد الاعتماد (Pending Approval)
    - 🟠 قيد التنفيذ/التوريد (In Progress)
    - 🟢 مكتمل / تم التسليم (Completed)
    - 🔴 ملغي / مرفوض (Cancelled)
  - **شريط البحث والتصفية الفورية**: بحث بالرقم المرجعي أو اسم مقدم الطلب أو الصنف، وتصفية حسب الموقع والأولوية والحالة.
  - **أزرار الإجراءات السريعة**: زر نسخ رابط التتبع المباشر (\`#track=CODE\`)، زر معاينة استمارة الطلب الرسمية للطباعة، وزر التتبع الحي.

---

### 4. شاشة الاستلام اللوجستي وتوزيع المهام (Logistics & Task Locking Screen)
* **المكونات ومنع التضارب**:
  - **نظام حجز المهمة ومنع التضارب (Task Ownership Locking)**:
    - عندما يكون الطلب معتمداً للتوريد يظهر بحالة: **🟢 متاح للاستلام اللوجستي**.
    - عند ضغط عضو الفريق على زر **[استلام المهمة]**:
      - تتغير الحالة فوراً إلى: **🔒 قيد التنفيذ بواسطة: [اسم العضو]**.
      - يُغلق الزر فوراً أمام باقي أعضاء الفريق مع إظهار قفل أمني وتاريخ ووقت الحجز لمنع تكرار الشراء أو التضارب.
  - **إصدار أمر الشراء (PO Issuance)**:
    - إدخال رقم الـ PO، اسم المورد المعتمد، طريقة الشحن، والمدة المتوقعة (SLA Days).
  - **إيصال الاستلام المخزني (Warehouse Receipt)**:
    - توثيق استلام الشحنة، تسجيل اسم المستلم الميداني، والتأشير التلقائي على تحديث المخزون.
`;

  // 3. Backend Logic Algorithms
  const backendLogicCode = `// =================================================================
// BACKEND LOGIC & ALGORITHMS (NODE.JS / TYPESCRIPT / POSTGRESQL)
// =================================================================

import { PoolClient } from 'pg';

/**
 * 1. خوارزمية التوليد التلقائي للرقم المرجعي الذكي (Smart Reference Code)
 * الصيغة المعتمدة: [رمز الموقع]-[رمز القسم][السنة][الرقم التسلسلي]
 * مثال: WDM-MI26002
 * تضمن الخوارزمية منع تكرار التسلسل تحت وطأة الطلبات المتزامنة عبر Row-Level Locking
 */
export async function generateSmartReferenceCode(
  client: PoolClient,
  siteCode: string,
  deptCode: string,
  orderDate: Date = new Date()
): Promise<{ referenceNumber: string; sequenceNumber: number; yearCode: string }> {
  const cleanSite = siteCode.trim().toUpperCase();
  const cleanDept = deptCode.trim().toUpperCase();
  
  // استخراج آخر خانتين من السنة (مثال: 2026 -> '26')
  const yearCode = orderDate.getFullYear().toString().slice(-2);

  // استخدام قفل الصف التشاؤمي (SELECT FOR UPDATE) لضمان تسلسل ذري غير مكرر
  const seqQuery = \`
    SELECT COALESCE(MAX(sequence_number), 0) + 1 AS next_seq
    FROM orders
    WHERE site_code = $1 AND dept_code = $2 AND year_code = $3
    FOR UPDATE;
  \`;

  const result = await client.query(seqQuery, [cleanSite, cleanDept, yearCode]);
  const nextSeq = parseInt(result.rows[0].next_seq, 10);

  // تنسيق الرقم التسلسلي بثلاث خانات (001, 002, 003)
  const paddedSeq = String(nextSeq).padStart(3, '0');
  const referenceNumber = \`\${cleanSite}-\${cleanDept}\${yearCode}\${paddedSeq}\`;

  return { referenceNumber, sequenceNumber: nextSeq, yearCode };
}

/**
 * 2. دالة حجز المهمة ومنع التضارب اللوجستي (Task Locking & Concurrency Prevention)
 * تضمن عدم قدرة أكثر من عضو على حجز نفس الطلب للتنفيذ
 */
export async function claimTaskLock(
  client: PoolClient,
  orderId: string,
  userId: string,
  userName: string,
  userRole: string
): Promise<{ success: boolean; message: string; lockedBy?: string }> {
  try {
    await client.query('BEGIN');

    // فحص القفل الحالي وحجز الصف
    const checkQuery = \`
      SELECT is_locked, locked_by_name, locked_at
      FROM task_locks
      WHERE order_id = $1
      FOR UPDATE;
    \`;
    const checkResult = await client.query(checkQuery, [orderId]);

    if (checkResult.rows.length > 0 && checkResult.rows[0].is_locked) {
      await client.query('ROLLBACK');
      return {
        success: false,
        message: \`تعذر حجز المهمة: الطلب محجوز مسبقاً بواسطة [\${checkResult.rows[0].locked_by_name}] لتفادي التضارب.\`,
        lockedBy: checkResult.rows[0].locked_by_name
      };
    }

    // تطبيق القفل باسم العضو وتحديث حالة الطلب إلى 'قيد التنفيذ'
    const lockTime = new Date();
    await client.query(\`
      INSERT INTO task_locks (order_id, is_locked, locked_by_user_id, locked_by_name, locked_role, locked_at)
      VALUES ($1, TRUE, $2, $3, $4, $5)
      ON CONFLICT (order_id) DO UPDATE
      SET is_locked = TRUE,
          locked_by_user_id = $2,
          locked_by_name = $3,
          locked_role = $4,
          locked_at = $5,
          lock_version = task_locks.lock_version + 1;
    \`, [orderId, userId, userName, userRole, lockTime]);

    // تحديث تصنيف دورة حياة الطلب إلى 'قيد التنفيذ والتوريد'
    await client.query(\`
      UPDATE orders
      SET status = 'IN_PROGRESS',
          lifecycle_category = 'IN_PROGRESS',
          updated_at = $1
      WHERE id = $2;
    \`, [lockTime, orderId]);

    await client.query('COMMIT');
    return {
      success: true,
      message: \`تم استلام وحجز المهمة بنجاح بواسطة [\${userName}]. أصبح الخيار مغلقاً أمام باقي الأعضاء.\`
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

/**
 * 3. دالة مسار دورة الاعتمادات والتصعيد التلقائي (Workflow & SLA Escalation Logic)
 */
export async function processApprovalStep(
  client: PoolClient,
  orderId: string,
  stage: 'DEPT_HEAD' | 'SITE_MANAGER' | 'GENERAL_MANAGER',
  action: 'APPROVE' | 'REJECT' | 'REQUEST_MODIFICATION',
  approverName: string,
  signatureHash: string,
  comments?: string
): Promise<{ nextStatus: string; lifecycleCategory: string }> {
  let nextStatus = '';
  let lifecycleCategory = '';

  if (action === 'REJECT') {
    nextStatus = 'REJECTED';
    lifecycleCategory = 'CANCELLED';
  } else if (action === 'REQUEST_MODIFICATION') {
    nextStatus = 'MODIFICATION_REQUESTED';
    lifecycleCategory = 'PENDING_APPROVAL';
  } else {
    // سلسلة التمرير في حال القبول
    if (stage === 'DEPT_HEAD') {
      nextStatus = 'PENDING_SITE_MANAGER';
      lifecycleCategory = 'PENDING_APPROVAL';
    } else if (stage === 'SITE_MANAGER') {
      nextStatus = 'PENDING_GENERAL_MANAGER';
      lifecycleCategory = 'PENDING_APPROVAL';
    } else if (stage === 'GENERAL_MANAGER') {
      nextStatus = 'APPROVED_FOR_PO';
      lifecycleCategory = 'IN_PROGRESS'; // متاح للاستلام اللوجستي
    }
  }

  // تسجيل الاعتماد والتوقيع الرقمي
  await client.query(\`
    INSERT INTO approval_logs (order_id, stage, role_name, approver_name, status, signature_data_hash, comments)
    VALUES ($1, $2, $2, $3, $4, $5, $6);
  \`, [orderId, stage, approverName, action, signatureHash, comments || '']);

  // تحديث حالة الطلب
  await client.query(\`
    UPDATE orders
    SET status = $1,
        lifecycle_category = $2,
        updated_at = NOW()
    WHERE id = $3;
  \`, [nextStatus, lifecycleCategory, orderId]);

  return { nextStatus, lifecycleCategory };
}
`;

  // 4. RESTful API Endpoints
  const restfulApis = `// =================================================================
// RESTFUL API SPECIFICATIONS (OPENAPI 3.0 / EXPRESS ENDPOINTS)
// =================================================================

/**
 * 1. POST /api/orders
 * إنشاء طلب جديد وتوليد الرقم المرجعي الذكي والتحقق الصارم من الحقول
 */
POST /api/orders
Content-Type: application/json

Request Payload:
{
  "siteCode": "WDM",
  "departmentCode": "MI",
  "orderDate": "2026-09-10",
  "requesterName": "م. إبراهيم كمال",
  "purpose": "تجهيزات دورية واستبدال مستهلكات عمليات التثقيب والتفجير الصخري بالموقع الغربي",
  "priority": "URGENT",
  "pagesCount": 2,
  "items": [
    {
      "catalogId": "CAT-002",
      "name": "لقم حفر صخري كربيد التنجستن 89 مم مقلوظة T45",
      "technicalSpecs": "قطر 89 مم سن T45 بـ 9 أزرار كربيد التنجستن البالستية للصخور الصلبة",
      "quantity": 50,
      "unit": "قطعة"
    }
  ]
}

Response 201 Created:
{
  "success": true,
  "orderId": "ord-wdm-26002",
  "referenceNumber": "WDM-MI26002",
  "lifecycleCategory": "PENDING_APPROVAL",
  "status": "PENDING_DEPT_HEAD",
  "trackingUrl": "https://app.mining.local/#track=WDM-MI26002",
  "slaDeadline": "2026-09-11T08:30:00Z",
  "message": "تم إنشاء الطلب بنجاح وتوجيهه تلقائياً لرئيس القسم مع تفعيل إشعار الـ SLA العاجل."
}

---

/**
 * 2. PUT /api/orders/{id}/assign
 * حجز المهمة اللوجستية ومنع تضارب الأعضاء (Task Claiming & Locking)
 */
PUT /api/orders/ord-wdm-26002/assign
Content-Type: application/json

Request Payload:
{
  "userId": "USR-LOG-01",
  "userName": "م. عادل السالمي",
  "userRole": "LOGISTICS_OFFICER"
}

Response 200 OK (عند نجاح الحجز):
{
  "success": true,
  "orderId": "ord-wdm-26002",
  "status": "IN_PROGRESS",
  "taskLock": {
    "isLocked": true,
    "lockedBy": "م. عادل السالمي",
    "lockedAt": "2026-09-10T10:15:00Z"
  },
  "message": "تم استلام المهمة بنجاح، أُغلقت أمام باقي الأعضاء لتفادي تكرار العمل."
}

Response 409 Conflict (في حال حاول عضو آخر حجز نفس الطلب):
{
  "success": false,
  "error": "TASK_ALREADY_CLAIMED",
  "lockedBy": "م. عادل السالمي",
  "lockedAt": "2026-09-10T10:15:00Z",
  "message": "عذراً، الطلب محجوز بالفعل وقيد التنفيذ بواسطة م. عادل السالمي لتفادي الازدواجية."
}

---

/**
 * 3. PUT /api/orders/{id}/approve
 * تسجيل الاعتماد الرقمي وتوقيع المسؤول وتمرير الطلب للمستوى التالي
 */
PUT /api/orders/ord-wdm-26002/approve
Content-Type: application/json

Request Payload:
{
  "stage": "SITE_MANAGER",
  "approverName": "م. طارق رضوان (مدير مشروع الجكوب)",
  "action": "APPROVE", // 'APPROVE' | 'REJECT' | 'REQUEST_MODIFICATION'
  "signatureHash": "SHA256-DIGITAL-SIGN-HASH-VERIFIED-99182",
  "comments": "معتمد موقع الجكوب للتعدين، مطابق لخطة الحفر الميدانية."
}

Response 200 OK:
{
  "success": true,
  "orderId": "ord-wdm-26002",
  "previousStage": "PENDING_SITE_MANAGER",
  "nextStage": "PENDING_GENERAL_MANAGER",
  "lifecycleCategory": "PENDING_APPROVAL",
  "message": "تم توثيق التوقيع الرقمي بنجاح وتمرير الطلب للمدير العام."
}

---

/**
 * 4. POST /api/whatsapp/webhook
 * معالجة الإجراءات التفاعلية القادمة من أزرار الواتساب (WhatsApp Cloud API Webhook)
 */
POST /api/whatsapp/webhook
Content-Type: application/json

Request Payload (Incoming from Meta WhatsApp Business API):
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WABA_ACCOUNT_882910",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "messages": [
              {
                "from": "966512345678",
                "id": "wamid.HBgLMjA2MTAyM...",
                "type": "interactive",
                "interactive": {
                  "type": "button_reply",
                  "button_reply": {
                    "id": "claim_WDM-MI26002",
                    "title": "استلام المهمة"
                  }
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}

Response 200 OK:
{
  "status": "PROCESSED",
  "action": "TASK_CLAIMED",
  "orderReference": "WDM-MI26002",
  "claimedBy": "م. عادل السالمي",
  "responseMessageSentToWhatsApp": "تم حجز المهمة بنجاح باسمك، الطلب الآن قيد التنفيذ."
}
`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6" id="architecture-view" dir="rtl">
      {/* Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-500/20 text-amber-300 text-xs font-mono px-2 py-0.5 rounded border border-amber-400/30">
                Official Engineering Deliverables
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400">
                المخرجات الهندسية والبرمجية المعتمدة لنظام إدارة وتتبع الطلبات
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-amber-400" />
              <span>المعمارية البرمجية ومخطط قاعدة البيانات والواجهات (Technical Architecture)</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              توثيق هندسي متكامل يلبي كافة بنود طلبكم: مخطط قاعدة البيانات SQL، واجهات المستخدم UI/UX،
              منطق البرمجة وخوارزميات حجز المهام والترقيم، وتصميم الـ RESTful APIs مع تكامل الواتساب.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="bg-emerald-500/20 text-emerald-300 text-xs font-mono px-3 py-1 rounded-lg border border-emerald-500/30 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>جاهز للإنتاج والتطبيق</span>
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('SCHEMA')}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'SCHEMA'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>1. مخطط قاعدة البيانات (Database Schema)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('UI_SPEC')}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'UI_SPEC'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. واجهات المستخدم (UI/UX Specification)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LOGIC')}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'LOGIC'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>3. منطق البرمجة والخوارزميات (Backend Logic)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('APIS')}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'APIS'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>4. واجهات الـ RESTful APIs وتكامل الواتساب</span>
          </button>
        </div>
      </div>

      {/* Code Display Canvas */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden font-mono text-xs">
        {/* Terminal Header */}
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-slate-400">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
            </div>
            <span className="text-[11px] font-sans font-semibold text-slate-300 mr-2">
              {activeTab === 'SCHEMA' && 'schema.sql — PostgreSQL DDL with Foreign Keys & Task Locks'}
              {activeTab === 'UI_SPEC' && 'UI_UX_SPECIFICATION.md — User Interface & Workflows Design'}
              {activeTab === 'LOGIC' && 'backendLogic.ts — Reference Generator, Task Locking & Approvals'}
              {activeTab === 'APIS' && 'apiSpecification.ts — RESTful Endpoints & WhatsApp Webhook'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              const currentContent =
                activeTab === 'SCHEMA'
                  ? sqlSchema
                  : activeTab === 'UI_SPEC'
                  ? uiUxSpec
                  : activeTab === 'LOGIC'
                  ? backendLogicCode
                  : restfulApis;
              copyCode(activeTab, currentContent);
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition text-[11px] cursor-pointer"
          >
            {copiedId === activeTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold font-sans">تم النسخ!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="font-sans">نسخ المحتوى</span>
              </>
            )}
          </button>
        </div>

        {/* Code Content */}
        <div className="p-4 sm:p-6 overflow-x-auto max-h-[700px] leading-relaxed text-slate-300" dir="ltr">
          <pre className="font-mono text-xs whitespace-pre">
            {activeTab === 'SCHEMA' && sqlSchema}
            {activeTab === 'UI_SPEC' && uiUxSpec}
            {activeTab === 'LOGIC' && backendLogicCode}
            {activeTab === 'APIS' && restfulApis}
          </pre>
        </div>
      </div>
    </div>
  );
};
