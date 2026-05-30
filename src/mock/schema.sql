-- ============================================================
-- KALIKE UNIFIED WORKSPACE — SQLite Schema v5.0
-- ============================================================
-- Original tables preserved. New tables added for:
--   Hierarchy, Worklogs, Tasks, Leaves, Reimbursements,
--   Payroll, Procurement, Attendance, Notifications
-- ============================================================

-- Assets Table
CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    status TEXT DEFAULT 'Active',
    location TEXT,
    purchaseDate TEXT,
    amount REAL DEFAULT 0,
    grossBlock REAL DEFAULT 0,
    netBlock REAL DEFAULT 0,
    program TEXT,
    assignedTo TEXT,
    assignedToId TEXT,
    assignedToDesignation TEXT,
    depreciation REAL DEFAULT 0,
    accumulatedDepreciation REAL DEFAULT 0,
    currentYearDepreciation REAL DEFAULT 0,
    fundingSource TEXT,
    fundingAmount REAL DEFAULT 0,
    procurementType TEXT,
    supplier TEXT,
    billNumber TEXT,
    voucherNumber TEXT,
    installationDate TEXT,
    putToUseDate TEXT,
    quantity INTEGER DEFAULT 1,
    depreciationRate REAL DEFAULT 0.1,
    usefulLife TEXT,
    disposalDate TEXT,
    health TEXT DEFAULT '100.0%',
    -- Operational register fields (sourced from merged Excel; finance fields live in asset_far)
    parentAssetId TEXT,                 -- FK to asset_far.assetId (per-FY register)
    standardizedId TEXT,                -- new Kalike canonical ID (also stored as id)
    assetIdentificationNumber TEXT,     -- legacy master AID (kept for traceability)
    parentMatchType TEXT,               -- EXACT_NORM | STRUCTURAL | NONE
    assignmentCode TEXT,                -- original Asset Code from assignment sheet
    modelName TEXT,                     -- model / brand info from assignment
    district TEXT,
    locationDetail TEXT,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_assets_parentAssetId ON assets(parentAssetId);

-- Grants Table
CREATE TABLE IF NOT EXISTS grants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    program TEXT,
    openingBalance REAL DEFAULT 0,
    spent REAL DEFAULT 0,
    closingBalance REAL DEFAULT 0
);

-- Transfers Table (Chain of Custody)
CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY,
    assetId TEXT REFERENCES assets(id),
    fromAssignee TEXT,
    fromDesignation TEXT,
    fromLocation TEXT,
    toAssignee TEXT,
    toDesignation TEXT,
    toLocation TEXT,
    date TEXT
);

-- Requests Table (legacy asset requests)
CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    category TEXT,
    reason TEXT,
    user TEXT,
    date TEXT,
    status TEXT DEFAULT 'Pending',
    managerApproved INTEGER DEFAULT 0,
    financeApproved INTEGER DEFAULT 0,
    assetId TEXT
);

-- Maintenance Logs Table
CREATE TABLE IF NOT EXISTS maint (
    id TEXT PRIMARY KEY,
    assetId TEXT REFERENCES assets(id),
    description TEXT,
    reporter TEXT,
    date TEXT,
    status TEXT DEFAULT 'Resolved'
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    userId TEXT,
    userName TEXT,
    action TEXT,
    details TEXT,
    snapshot TEXT,
    date TEXT,
    timestamp TEXT,
    level TEXT DEFAULT 'INFO'
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT,
    empId TEXT,
    designation TEXT,
    location TEXT,
    department TEXT,
    reportsTo TEXT,
    permissions TEXT,
    phone TEXT,
    email TEXT,
    joiningDate TEXT,
    bankAccount TEXT,
    bankName TEXT,
    panNumber TEXT,
    pfNo TEXT,
    pfUan TEXT,
    basicSalary REAL DEFAULT 0,
    baseBasic REAL DEFAULT 0,
    baseHra REAL DEFAULT 0,
    baseConveyance REAL DEFAULT 0,
    baseSpecial REAL DEFAULT 0,
    baseComm REAL DEFAULT 0,
    lastLogin TEXT
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- ============================================================
-- NEW TABLES — Unified Workspace Modules
-- ============================================================

-- Employee Hierarchy / Org Chart
CREATE TABLE IF NOT EXISTS employee_hierarchy (
    id TEXT PRIMARY KEY,
    empId TEXT,
    empName TEXT,
    reportsTo TEXT,
    reportsToName TEXT,
    department TEXT,
    level INTEGER DEFAULT 0
);

-- Worklogs (Daily Task Entries)
CREATE TABLE IF NOT EXISTS worklogs (
    id TEXT PRIMARY KEY,
    empId TEXT,
    empName TEXT,
    date TEXT,
    tasks TEXT,
    hoursWorked REAL DEFAULT 8,
    status TEXT DEFAULT 'submitted',
    score REAL DEFAULT 0,
    scoredBy TEXT,
    scoredByName TEXT,
    remarks TEXT,
    createdAt TEXT
);

-- Task Assignments
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    assignedTo TEXT,
    assignedToName TEXT,
    assignedBy TEXT,
    assignedByName TEXT,
    priority TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'Pending',
    dueDate TEXT,
    completedDate TEXT,
    score REAL DEFAULT 0,
    maxScore REAL DEFAULT 10,
    feedback TEXT,
    category TEXT,
    createdAt TEXT
);

-- Leave Applications
CREATE TABLE IF NOT EXISTS leaves (
    id TEXT PRIMARY KEY,
    empId TEXT,
    empName TEXT,
    type TEXT,
    fromDate TEXT,
    toDate TEXT,
    days REAL,
    reason TEXT,
    status TEXT DEFAULT 'Pending',
    approvedBy TEXT,
    approvedByName TEXT,
    remarks TEXT,
    appliedOn TEXT
);

-- Leave Balances
CREATE TABLE IF NOT EXISTS leave_balances (
    id TEXT PRIMARY KEY,
    empId TEXT,
    casualLeave REAL DEFAULT 12,
    sickLeave REAL DEFAULT 12,
    earnedLeave REAL DEFAULT 15,
    compensatory REAL DEFAULT 0,
    year TEXT
);

-- Reimbursements / Expense Settlements
CREATE TABLE IF NOT EXISTS reimbursements (
    id TEXT PRIMARY KEY,
    empId TEXT,
    empName TEXT,
    category TEXT,
    amount REAL DEFAULT 0,
    description TEXT,
    billDate TEXT,
    billNumber TEXT,
    travelFrom TEXT,
    travelTo TEXT,
    travelDate TEXT,
    attachments TEXT,
    status TEXT DEFAULT 'Pending',
    managerApproved INTEGER DEFAULT 0,
    managerRemarks TEXT,
    adminApproved INTEGER DEFAULT 0,
    adminRemarks TEXT,
    settledBy TEXT,
    settledByName TEXT,
    settledDate TEXT,
    submittedOn TEXT
);

-- Payroll / Salary Records
CREATE TABLE IF NOT EXISTS payroll (
    id TEXT PRIMARY KEY,
    empId TEXT,
    empName TEXT,
    designation TEXT,
    department TEXT,
    month TEXT,
    basicSalary REAL DEFAULT 0,
    hra REAL DEFAULT 0,
    conveyanceAllowance REAL DEFAULT 0,
    specialAllowance REAL DEFAULT 0,
    otherAllowance REAL DEFAULT 0,
    communicationAllowance REAL DEFAULT 0,
    grossSalary REAL DEFAULT 0,
    pf REAL DEFAULT 0,
    esi REAL DEFAULT 0,
    tds REAL DEFAULT 0,
    professionalTax REAL DEFAULT 0,
    otherDeductions REAL DEFAULT 0,
    totalDeductions REAL DEFAULT 0,
    netSalary REAL DEFAULT 0,
    bankAccount TEXT,
    bankName TEXT,
    panNumber TEXT,
    pfNo TEXT,
    pfUan TEXT,
    effectiveWorkDays REAL DEFAULT 30,
    lop REAL DEFAULT 0,
    status TEXT DEFAULT 'Draft',
    generatedOn TEXT,
    sentOn TEXT
);

-- Procurement (Enhanced Multi-Step Workflow)
CREATE TABLE IF NOT EXISTS procurement (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    estimatedAmount REAL DEFAULT 0,
    vendor TEXT,
    vendorContact TEXT,
    vendorQuotation TEXT,
    alternateVendor TEXT,
    alternateQuotation TEXT,
    justification TEXT,
    requestedBy TEXT,
    requestedByName TEXT,
    department TEXT,
    urgency TEXT DEFAULT 'Normal',
    step TEXT DEFAULT 'draft',
    managerApproved INTEGER DEFAULT 0,
    managerApprovedBy TEXT,
    managerRemarks TEXT,
    managerApprovedDate TEXT,
    financeApproved INTEGER DEFAULT 0,
    financeApprovedBy TEXT,
    financeRemarks TEXT,
    financeApprovedDate TEXT,
    adminApproved INTEGER DEFAULT 0,
    adminApprovedBy TEXT,
    adminRemarks TEXT,
    adminApprovedDate TEXT,
    purchaseOrderNumber TEXT,
    approvedAmount REAL DEFAULT 0,
    deliveryDate TEXT,
    deliveredDate TEXT,
    actualAmount REAL DEFAULT 0,
    billNumber TEXT,
    voucherNumber TEXT,
    assetRegistered INTEGER DEFAULT 0,
    assetId TEXT,
    rejected INTEGER DEFAULT 0,
    rejectedBy TEXT,
    rejectedReason TEXT,
    createdAt TEXT,
    updatedAt TEXT
);

-- Attendance Records
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    empId TEXT,
    empName TEXT,
    date TEXT,
    checkIn TEXT,
    checkOut TEXT,
    status TEXT DEFAULT 'Present',
    location TEXT,
    remarks TEXT,
    markedAt TEXT
);

-- System Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    recipientId TEXT,
    recipientRole TEXT,
    type TEXT,
    title TEXT,
    message TEXT,
    link TEXT,
    isRead INTEGER DEFAULT 0,
    createdAt TEXT
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('schema_version', '6.0');

-- Document Vault
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    empId TEXT,
    title TEXT,
    type TEXT,
    url TEXT,
    uploadedBy TEXT,
    uploadedAt TEXT
);

-- Announcements Board
CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT,
    authorId TEXT,
    authorName TEXT,
    priority TEXT DEFAULT 'Normal',
    createdAt TEXT
);

-- Announcement Reads
CREATE TABLE IF NOT EXISTS announcement_reads (
    id TEXT PRIMARY KEY,
    announcementId TEXT,
    empId TEXT,
    readAt TEXT
);

-- Calendar Module
CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    date TEXT,
    type TEXT,
    creatorId TEXT,
    createdAt TEXT
);

-- Performance Reviews
CREATE TABLE IF NOT EXISTS performance_reviews (
    id TEXT PRIMARY KEY,
    empId TEXT,
    empName TEXT,
    managerId TEXT,
    period TEXT,
    taskScore REAL,
    managerRating REAL,
    feedback TEXT,
    status TEXT DEFAULT 'Draft',
    createdAt TEXT,
    updatedAt TEXT
);

-- Institutional Communication Logs (Alerts)
CREATE TABLE IF NOT EXISTS communication_logs (
    id TEXT PRIMARY KEY,
    type TEXT,
    recipient TEXT,
    message TEXT,
    status TEXT,
    timestamp TEXT
);

-- Digital Signatures
CREATE TABLE IF NOT EXISTS signatures (
    id TEXT PRIMARY KEY,
    refId TEXT, -- PR ID or Document ID
    empId TEXT,
    empName TEXT,
    signatureData TEXT, -- Base64 image
    signedAt TEXT
);

-- Governance Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    permissions TEXT, -- JSON array of feature slugs
    level INTEGER DEFAULT 0, -- Hierarchy level
    isDefault INTEGER DEFAULT 0 -- Cannot be deleted if 1
);

-- Fixed Asset Register (per-FY depreciation rows). Mirrors the finance
-- workbook Asset Finance.with_calc.xlsx column-for-column. Stores only the
-- "locked" inputs from finance; computed columns (I,K,L,N,P,S) are derived
-- server-side on every read using the FY-aware WDV formula. fy = starting
-- calendar year of the financial year (2025 = FY 2025-26).
CREATE TABLE IF NOT EXISTS asset_far (
    id TEXT PRIMARY KEY,
    assetId TEXT NOT NULL,              -- 01 Asset Identification Number
    fy INTEGER NOT NULL,
    assetClass TEXT,                    -- 02 Asset class
    description TEXT,                   -- 03 Description
    location TEXT,                      -- 04 Location
    purchaseOrKind TEXT,                -- 05 Whether purchased / received in kind
    acqDate TEXT,                       -- 06 Acquisition Date
    supplierName TEXT,                  -- 07 Supplier Name
    billNo TEXT,                        -- 08 Bill No.
    installationDate TEXT,              -- 09 Date of Installation
    datePutToUse TEXT,                  -- 10 Date put to use
    quantity REAL DEFAULT 1,            -- 11 Quantity
    voucherNo TEXT,                     -- 12 Voucher No.
    depRate REAL DEFAULT 0,             -- 13 Depreciation Rate
    usefulLifeYears TEXT,               -- 14 Useful life (kept TEXT — source mixes "3 years", "5", etc.)
    grossBlockOpening REAL DEFAULT 0,   -- 15 Gross Block Opening
    additions REAL DEFAULT 0,           -- 16 Additions
    disposalsGross REAL DEFAULT 0,      -- 17 Disposals (Gross)
    accDepOpening REAL DEFAULT 0,       -- 19 Acc Dep Opening
    disposalsAccDep REAL DEFAULT 0,     -- 22 Disposals (Acc Dep)
    netBlockPrevFY REAL DEFAULT 0,      -- 24 Net Block Prev FY
    disposalDate TEXT,                  -- 26 Disposal Date
    proceedsOnDisposal REAL DEFAULT 0,  -- 27 Proceeds on Disposal
    donor TEXT,                         -- 29 Donor Name
    status TEXT,                        -- 30 Status
    refinedAcqDate TEXT,                -- mirror of acqDate for legacy callers
    locked INTEGER DEFAULT 0,
    createdAt TEXT,
    updatedAt TEXT,
    UNIQUE(assetId, fy)
);

CREATE INDEX IF NOT EXISTS idx_asset_far_fy ON asset_far(fy);
CREATE INDEX IF NOT EXISTS idx_asset_far_assetId ON asset_far(assetId);

-- Soft-delete archive for asset_far rows. Any row deleted via the UI is
-- copied here first along with who archived it, when, and why, so the
-- finance team can recover or audit historical removals.
CREATE TABLE IF NOT EXISTS asset_far_archive (
    archiveId TEXT PRIMARY KEY,
    originalId TEXT,
    assetId TEXT NOT NULL,
    fy INTEGER NOT NULL,
    assetClass TEXT,
    description TEXT,
    location TEXT,
    purchaseOrKind TEXT,
    acqDate TEXT,
    supplierName TEXT,
    billNo TEXT,
    installationDate TEXT,
    datePutToUse TEXT,
    quantity REAL DEFAULT 1,
    voucherNo TEXT,
    depRate REAL DEFAULT 0,
    usefulLifeYears TEXT,
    grossBlockOpening REAL DEFAULT 0,
    additions REAL DEFAULT 0,
    disposalsGross REAL DEFAULT 0,
    accDepOpening REAL DEFAULT 0,
    disposalsAccDep REAL DEFAULT 0,
    netBlockPrevFY REAL DEFAULT 0,
    disposalDate TEXT,
    proceedsOnDisposal REAL DEFAULT 0,
    donor TEXT,
    status TEXT,
    refinedAcqDate TEXT,
    locked INTEGER DEFAULT 0,
    createdAt TEXT,
    updatedAt TEXT,
    archivedBy TEXT,
    archivedAt TEXT,
    archiveReason TEXT
);
CREATE INDEX IF NOT EXISTS idx_asset_far_archive_assetId ON asset_far_archive(assetId);
CREATE INDEX IF NOT EXISTS idx_asset_far_archive_fy ON asset_far_archive(fy);

-- Social media accounts (managed by superadmin). Each row = one account.
-- Multiple rows per platform are allowed (e.g. main IG + program IG).
CREATE TABLE IF NOT EXISTS social_accounts (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,           -- 'youtube' | 'x' | 'linkedin' | 'instagram' | 'facebook'
    displayName TEXT,                 -- e.g. "Kalike Foundation"
    handle TEXT,                      -- e.g. "@KalikeFdn"
    url TEXT NOT NULL,                -- profile / page URL
    youtubeChannelId TEXT,            -- only for platform='youtube' — RSS feed key
    isActive INTEGER DEFAULT 1,
    displayOrder INTEGER DEFAULT 0,
    createdAt TEXT,
    updatedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);

-- Bank accounts master (sourced from external xlsx). One row per employee/account.
-- Same employee can appear multiple times if they have multiple bank accounts.
CREATE TABLE IF NOT EXISTS bank_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    bankName TEXT,
    accountNumber TEXT NOT NULL,
    ifsc TEXT,
    sourceFile TEXT,
    sourceSheet TEXT,
    reviewNotes TEXT,
    createdAt TEXT,
    updatedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_name ON bank_accounts(name);
