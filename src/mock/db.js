import REAL_ASSETS from './real_assets.json';

import RAW_EMPLOYEES from './employees.json';

export { RAW_EMPLOYEES };



// --- SUPABASE STORAGE ADAPTER ABSTRACTION ---
// This adapter seamlessly manages LocalStorage right now, but is structurally
// isolated so you can instantly switch to Supabase queries in the future.
class StorageAdapter {
    constructor() {
        this.apiBase = '/api';
    }

    // Wraps fetch to attach the JWT and surface session-expiry as a logout.
    async authFetch(path, options = {}) {
        const token = localStorage.getItem('amp_token');
        const headers = {
            ...(options.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
        const response = await fetch(path, { ...options, headers });
        if (response.status === 401) {
            // Only evict the session if we actually sent a token — a 401 with
            // no token (e.g. during pre-login boot) is expected, not an expiry.
            if (token) {
                localStorage.removeItem('amp_user');
                localStorage.removeItem('amp_token');
                if (window.app && typeof window.app.navigateTo === 'function') {
                    window.app.user = null;
                    window.app.navigateTo('login');
                }
                throw new Error('Session expired. Please sign in again.');
            }
            throw new Error('Not authenticated');
        }
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response;
    }

    async initCheck() {
        // Versioning is now handled server-side in the SQLite schema
        return true;
    }

    async fetchCollection(table) {
        const response = await this.authFetch(`${this.apiBase}/${table}`);
        return await response.json();
    }

    async writeCollection(table, data) {
        const response = await this.authFetch(`${this.apiBase}/${table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    }

    async syncAll(state) {
        const response = await this.authFetch(`${this.apiBase}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
        });
        return await response.json();
    }
}

export class AssetDB {
    constructor() {
        this.adapter = new StorageAdapter();
        this.assets = [];
        this.grants = [];
        this.maintenanceLogs = [];
        this.requests = [];
        this.transfers = [];
        this.auditLogs = [];
        this.users = [];
        // New workspace modules
        this.worklogs = [];
        this.tasks = [];
        this.leaves = [];
        this.leaveBalances = [];
        this.reimbursements = [];
        this.payroll = [];
        this.procurement = [];
        this.attendance = [];
        this.hierarchy = [];
        this.notifications = [];
        // Phase 3 Workspace Modules
        this.documents = [];
        this.announcements = [];
        this.announcementReads = [];
        this.calendarEvents = [];
        this.performanceReviews = [];
        this.communicationLogs = [];
        this.signatures = [];
        this.roles = [];
        // Fixed Asset Register (per-FY parent rows)
        this.assetFar = [];
    }

    async init() {
        try {
            const safeFetch = async (table) => {
                try { return await this.adapter.fetchCollection(table); }
                catch { return []; }
            };
            const [assets, grants, maint, requests, transfers, users, auditLogs,
                   worklogs, tasks, leaves, leaveBalances, reimbursements, payroll,
                   procurement, attendance, hierarchy, notifications,
                   documents, announcements, announcementReads, calendarEvents, performanceReviews, communicationLogs, signatures, roles, assetFar] = await Promise.all([
                safeFetch('assets'), safeFetch('grants'), safeFetch('maint'),
                safeFetch('requests'), safeFetch('transfers'), safeFetch('users'),
                safeFetch('audit'), safeFetch('worklogs'), safeFetch('tasks'),
                safeFetch('leaves'), safeFetch('leave-balances'), safeFetch('reimbursements'),
                safeFetch('payroll'), safeFetch('procurement'), safeFetch('attendance'),
                safeFetch('hierarchy'), safeFetch('notifications'),
                safeFetch('documents'), safeFetch('announcements'), safeFetch('announcement_reads'),
                safeFetch('calendar_events'), safeFetch('performance_reviews'),
                safeFetch('communication_logs'), safeFetch('signatures'), safeFetch('roles'),
                safeFetch('far')
            ]);

            this.assets = assets;
            this.grants = grants;
            this.maintenanceLogs = maint;
            this.requests = requests;
            this.transfers = transfers;
            this.users = Array.isArray(users) && users.length > 0 ? users : this._getDefaultUsers();
            this.auditLogs = Array.isArray(auditLogs) ? auditLogs : [];
            this.worklogs = worklogs || [];
            this.tasks = tasks || [];
            this.leaves = leaves || [];
            this.leaveBalances = leaveBalances || [];
            this.reimbursements = reimbursements || [];
            this.payroll = payroll || [];
            this.procurement = procurement || [];
            this.attendance = attendance || [];
            this.hierarchy = hierarchy || [];
            this.notifications = notifications || [];
            this.documents = documents || [];
            this.announcements = announcements || [];
            this.announcementReads = announcementReads || [];
            this.calendarEvents = calendarEvents || [];
            this.performanceReviews = performanceReviews || [];
            this.communicationLogs = communicationLogs || [];
            this.signatures = signatures || [];
            this.roles = Array.isArray(roles) && roles.length > 0 ? roles : this._getDefaultRoles();
            this.assetFar = Array.isArray(assetFar) ? assetFar : [];

            this.assets.forEach(a => this._applyDepreciation(a));
            this._recalculateGrants();

            // Flush any pending debounced sync before tab close so nothing is lost.
            // sendBeacon would be ideal but the existing syncAll uses authFetch
            // (Bearer token + JSON body); keepalive fetch keeps it working.
            if (typeof window !== 'undefined' && !this._unloadHooked) {
                this._unloadHooked = true;
                window.addEventListener('beforeunload', () => {
                    if (this._syncPending && !this._syncInFlight) {
                        // Best-effort: trigger an immediate sync. Browser will
                        // keep the request alive briefly via keepalive flag inside authFetch.
                        this._flushSyncNow();
                    }
                });
            }

            console.log('Kalike Workspace initialized from SQLite.');
            return true;
        } catch (err) {
            console.error('Failed to initialize database:', err);
            return false;
        }
    }

    _logActivity(action, details, snapshot = null, level = 'INFO') {
        // Find current user from global app instance or localStorage
        const user = JSON.parse(localStorage.getItem('amp_user')) || { name: 'System', role: 'system' };
        
        const log = {
            id: 'LOG-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            userId: user.empId || user.role,
            userName: user.name,
            action,
            details,
            level,
            snapshot: snapshot ? JSON.stringify(snapshot) : null,
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        this.auditLogs.unshift(log);
        // Keep only last 200 logs to prevent memory/sync issues
        if (this.auditLogs.length > 200) this.auditLogs.pop();
        
        this.syncToCloud();
    }

    revertAction(logId) {
        const log = this.auditLogs.find(l => l.id === logId);
        if (!log || !log.snapshot) return { success: false, message: "Log entry not found or no snapshot available." };

        const snapshot = JSON.parse(log.snapshot);
        const actionType = log.action;

        try {
            if (actionType === 'Update Asset') {
                const index = this.assets.findIndex(a => a.id === snapshot.id);
                if (index !== -1) {
                    this.assets[index] = { ...snapshot };
                }
            } else if (actionType === 'Delete Asset') {
                // Restore deleted asset
                this.assets.unshift({ ...snapshot });
            } else if (actionType === 'Register Asset') {
                // Reverting registration means deleting the asset
                this.assets = this.assets.filter(a => a.id !== snapshot.id);
            } else if (actionType === 'Update Grant') {
                const index = this.grants.findIndex(g => g.id === snapshot.id);
                if (index !== -1) {
                    this.grants[index] = { ...snapshot };
                }
            } else if (actionType === 'Delete Grant') {
                this.grants.unshift({ ...snapshot });
            } else if (actionType === 'Add Grant') {
                this.grants = this.grants.filter(g => g.id !== snapshot.id);
            } else if (actionType === 'Authorize Request' || actionType === 'Finance Approval' || actionType === 'Reject Request') {
                const index = this.requests.findIndex(r => r.id === snapshot.id);
                if (index !== -1) {
                    this.requests[index] = { ...snapshot };
                }
            } else if (actionType === 'Transfer Asset') {
                const index = this.assets.findIndex(a => a.id === snapshot.id);
                if (index !== -1) {
                    this.assets[index] = { ...snapshot };
                    // Also delete the transfer log entry
                    this.transfers = this.transfers.filter(t => t.assetId !== snapshot.id || t.date !== log.date);
                }
            }

            this._recalculateGrants();
            
            // Mark the log as reverted so we don't revert it again
            log.action = `REVERTED: ${log.action}`;
            log.snapshot = null; 

            this._logActivity('System Rollback', `Reverted previous action: ${actionType} (Reference: ${logId})`);
            this.syncToCloud();
            return { success: true };
        } catch (err) {
            console.error('Revert failed:', err);
            return { success: false, message: err.message };
        }
    }

    _recalculateGrants() {
        this.grants.forEach(grant => {
            // Find all assets funded by this grant
            // Note: fundingSource can be the grant name or ID
            const fundedAssets = this.assets.filter(a => 
                a.fundingSource === grant.id || a.fundingSource === grant.name
            );
            
            const totalSpent = fundedAssets.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
            grant.spent = totalSpent;
            grant.closingBalance = Math.max(0, grant.openingBalance - totalSpent);
        });
    }


    // Debounced full-database sync. Rapid mutations coalesce into one /api/sync
    // round-trip ~800ms after the last edit (max-wait 3000ms to bound staleness).
    // The final in-memory state is always what gets sent — no data loss.
    // `beforeunload` (wired in init) calls _flushSyncNow() to push any pending
    // batch before the tab closes.
    // Returns a Promise that resolves after the *next* flush completes, so
    // legacy `await db.syncToCloud()` call sites still wait for persistence.
    syncToCloud() {
        const DEBOUNCE_MS = 800;
        const MAX_WAIT_MS = 3000;
        const now = Date.now();

        if (!this._syncPending) {
            this._syncFirstQueuedAt = now;
        }
        this._syncPending = true;
        // Monotonic version bump — every mutation path eventually calls
        // syncToCloud(), so this is a cheap, authoritative invalidation token
        // for any page-level row-builder caches (Registry, Depreciation, etc.).
        this._dataVersion = (this._dataVersion || 0) + 1;

        if (!this._syncBatchPromise) {
            this._syncBatchPromise = new Promise(resolve => {
                this._syncBatchResolve = resolve;
            });
        }

        if (this._syncTimer) clearTimeout(this._syncTimer);

        const elapsed = now - (this._syncFirstQueuedAt || now);
        const delay = Math.max(0, Math.min(DEBOUNCE_MS, MAX_WAIT_MS - elapsed));

        this._syncTimer = setTimeout(() => this._flushSyncNow(), delay);

        return this._syncBatchPromise;
    }

    async _flushSyncNow() {
        if (this._syncTimer) {
            clearTimeout(this._syncTimer);
            this._syncTimer = null;
        }
        if (!this._syncPending && !this._syncInFlight) return;
        // If a sync is mid-flight, mark another one pending; it'll fire when the
        // current request resolves (so we never drop the latest state).
        if (this._syncInFlight) {
            this._syncQueuedAgain = true;
            return;
        }
        this._syncPending = false;
        this._syncFirstQueuedAt = null;
        this._syncInFlight = true;
        // Take ownership of the batch promise so any new calls during the flight
        // start a fresh batch (and won't resolve until *their* sync completes).
        const resolveThisBatch = this._syncBatchResolve;
        this._syncBatchPromise = null;
        this._syncBatchResolve = null;
        try {
            await this.adapter.syncAll({
                assets: this.assets,
                grants: this.grants,
                maintenanceLogs: this.maintenanceLogs,
                requests: this.requests,
                transfers: this.transfers,
                auditLogs: this.auditLogs,
                users: this.users,
                worklogs: this.worklogs,
                tasks: this.tasks,
                leaves: this.leaves,
                leaveBalances: this.leaveBalances,
                reimbursements: this.reimbursements,
                payroll: this.payroll,
                procurement: this.procurement,
                attendance: this.attendance,
                hierarchy: this.hierarchy,
                notifications: this.notifications,
                documents: this.documents,
                announcements: this.announcements,
                announcementReads: this.announcementReads,
                calendarEvents: this.calendarEvents,
                performanceReviews: this.performanceReviews,
                communicationLogs: this.communicationLogs,
                signatures: this.signatures,
                roles: this.roles
            });
        } catch (err) {
            console.error('Persistence Sync Failure:', err);
        } finally {
            this._syncInFlight = false;
            if (resolveThisBatch) resolveThisBatch();
            if (this._syncQueuedAgain) {
                this._syncQueuedAgain = false;
                this._flushSyncNow();
            }
        }
    }

    reportIssue(assetId, description, reporter) {
        const asset = this.assets.find(a => a.id === assetId);
        if (asset) {
            asset.status = "Maintenance";
            asset.health = "Requires Check";
        }
        const log = {
            id: 'M-' + Date.now(),
            assetId,
            description,
            reporter,
            date: new Date().toISOString(),
            status: 'Pending'
        };
        this.maintenanceLogs.unshift(log);
        this.syncToCloud();
        return log;
    }

    requestAsset(category, reason, user) {
        const request = {
            id: 'REQ-' + Date.now(),
            category,
            reason,
            user,
            date: new Date().toISOString(),
            status: 'Pending Both',
            managerApproved: false,
            financeApproved: false
        };
        this.requests.unshift(request);
        this.syncToCloud();
        return request;
    }

    getStats() {
        // The `assets` rows carry identity/location/status but no money —
        // gross/net values live in `asset_far` (with server-computed I, K, N, P
        // columns). Match DepreciationPage's buildFarIndex: keep only the
        // latest FY per assetId, then sum I (cost basis) and P (net block).
        const num = (v) => Number(v) || 0;
        const latestPerAsset = new Map();
        (this.assetFar || []).forEach(r => {
            if (!r?.assetId) return;
            const existing = latestPerAsset.get(r.assetId);
            if (!existing || num(r.fy) > num(existing.fy)) {
                latestPerAsset.set(r.assetId, r);
            }
        });
        let totalValue = 0, netValue = 0;
        latestPerAsset.forEach(r => {
            totalValue += num(r.I);
            netValue   += num(r.P);
        });
        // Fallback to per-asset fields if FAR data hasn't loaded yet (e.g.
        // legacy seeds without a FAR row).
        if (totalValue === 0 && this.assets.length) {
            const grossOf = (a) => num(a.grossBlock) || num(a.amount);
            const accDepOf = (a) => num(a.accumulatedDepreciation) || num(a.depreciation);
            totalValue = this.assets.reduce((s, a) => s + grossOf(a), 0);
            netValue   = this.assets.reduce((s, a) => s + Math.max(0, grossOf(a) - accDepOf(a)), 0);
        }
        return {
            totalAssets: this.assets.length,
            activeAssets: this.assets.filter(a => a.status === 'Active').length,
            maintenanceAssets: this.assets.filter(a => a.status === 'Maintenance').length,
            disposedAssets: this.assets.filter(a => a.status === 'Disposed').length,
            totalValue,
            netValue
        };
    }

    _evaluateRequestStatus(req) {
        if (req.status.startsWith('Rejected')) return;
        if (req.managerApproved && req.financeApproved) {
            req.status = "Approved";
        } else if (req.managerApproved && !req.financeApproved) {
            req.status = "Pending Finance";
        } else if (!req.managerApproved && req.financeApproved) {
            req.status = "Pending Manager";
        } else {
            req.status = "Pending Both";
        }
    }

    approveRequestManager(requestId) {
        const req = this.requests.find(r => r.id === requestId);
        if (req && !req.status.startsWith('Rejected')) {
            const snapshot = { ...req };
            req.managerApproved = true;
            this._evaluateRequestStatus(req);
            this._logActivity('Authorize Request', `Manager authorized asset requisition: ${req.id} (${req.category})`, snapshot);
            this.syncToCloud();
        }
        return req;
    }

    approveRequestFinance(requestId) {
        const req = this.requests.find(r => r.id === requestId);
        if (req && !req.status.startsWith('Rejected')) {
            const snapshot = { ...req };
            req.financeApproved = true;
            this._evaluateRequestStatus(req);
            this._logActivity('Finance Approval', `Finance controller approved asset requisition: ${req.id}`, snapshot);
            this.syncToCloud();
        }
        return req;
    }

    rejectRequestManager(requestId) {
        const req = this.requests.find(r => r.id === requestId);
        if (req) {
            const snapshot = { ...req };
            req.status = "Rejected by Manager";
            this._logActivity('Reject Request', `Manager rejected asset requisition: ${req.id}`, snapshot);
            this.syncToCloud();
        }
        return req;
    }

    rejectRequestFinance(requestId) {
        const req = this.requests.find(r => r.id === requestId);
        if (req) {
            const snapshot = { ...req };
            req.status = "Rejected by Finance";
            this._logActivity('Reject Request', `Finance rejected asset requisition: ${req.id}`, snapshot);
            this.syncToCloud();
        }
        return req;
    }

    requestAssetTransfer(assetId, reason, user) {
        const asset = this.assets.find(a => a.id === assetId);
        if (!asset) return null;

        const request = {
            id: 'TXR-' + Date.now(),
            type: 'transfer',
            assetId,
            assetName: asset.name,
            category: asset.category,
            reason,
            user,
            date: new Date().toISOString(),
            status: 'Pending Manager',
            managerApproved: false
        };
        this.requests.unshift(request);
        this._logActivity('Transfer Request', `Employee ${user} requested transfer of asset: ${asset.name} (${assetId})`, request);
        this.syncToCloud();
        return request;
    }

    approveTransferRequest(requestId) {
        const req = this.requests.find(r => r.id === requestId);
        if (req && req.type === 'transfer' && !req.status.startsWith('Rejected')) {
            const snapshot = { ...req };
            req.status = "Approved";
            req.managerApproved = true;
            this._logActivity('Transfer Approved', `Manager approved transfer request: ${req.id} for asset ${req.assetName}`, snapshot);
            this.syncToCloud();
        }
        return req;
    }

    rejectTransferRequest(requestId) {
        const req = this.requests.find(r => r.id === requestId);
        if (req && req.type === 'transfer') {
            const snapshot = { ...req };
            req.status = "Rejected by Manager";
            this._logActivity('Transfer Rejected', `Manager rejected transfer request: ${req.id}`, snapshot);
            this.syncToCloud();
        }
        return req;
    }

    addNewAsset(assetData) {
        const parsedAmount = parseFloat(assetData.amount) || 0;
        const newAsset = {
            id: 'AS-' + Math.floor(10000 + Math.random() * 90000),
            name: assetData.name,
            category: assetData.category,
            status: assetData.status || "Active",
            location: assetData.location,
            health: "100.0%",
            purchaseDate: assetData.purchaseDate || new Date().toISOString().split('T')[0],
            amount: parsedAmount,
            grossBlock: parsedAmount,
            netBlock: parsedAmount,
            program: assetData.program || "General Operations",
            assignedTo: assetData.assignedTo || "Unassigned",
            assignedToId: assetData.assignedToId || "N/A",
            assignedToDesignation: assetData.designation || "N/A",
            depreciation: 0,
            accumulatedDepreciation: 0,
            currentYearDepreciation: 0,
            fundingSource: assetData.fundingSource || "Entity Funds",
            fundingAmount: parsedAmount,
            procurementType: assetData.procurementType || "Purchase",
            supplier: assetData.supplier || "N/A",
            billNumber: assetData.billNumber || "N/A",
            voucherNumber: assetData.voucherNumber || "N/A",
            installationDate: assetData.installationDate || assetData.purchaseDate || new Date().toISOString().split('T')[0],
            putToUseDate: assetData.putToUseDate || assetData.purchaseDate || new Date().toISOString().split('T')[0],
            quantity: parseInt(assetData.quantity) || 1,
            depreciationRate: parseFloat(assetData.depreciationRate) || 0.0,
            usefulLife: assetData.usefulLife || null,
            disposalDate: null,
            // Operational register fields (mirrored from merged Excel import)
            parentAssetId: assetData.parentAssetId || null,
            standardizedId: assetData.standardizedId || null,
            assetIdentificationNumber: assetData.assetIdentificationNumber || null,
            parentMatchType: assetData.parentMatchType || null,
            assignmentCode: assetData.assignmentCode || null,
            modelName: assetData.modelName || null,
            district: assetData.district || null,
            locationDetail: assetData.locationDetail || null,
            notes: assetData.notes || null
        };
        this._applyDepreciation(newAsset);
        this.assets.unshift(newAsset);
        this._recalculateGrants();
        this._logActivity('Register Asset', `New asset registered: ${newAsset.name} (${newAsset.id})`, newAsset);
        this.syncToCloud();
        return newAsset;
    }
    updateAsset(id, assetData) {
        const index = this.assets.findIndex(a => a.id === id);
        if (index !== -1) {
            const snapshot = { ...this.assets[index] };
            this.assets[index] = { ...this.assets[index], ...assetData };
            // Ensure derived fields sync to prevent data drift
            if (this.assets[index].amount !== undefined) {
                this.assets[index].grossBlock = this.assets[index].amount;
                this.assets[index].fundingAmount = this.assets[index].amount;
                this.assets[index].netBlock = this.assets[index].amount - (this.assets[index].accumulatedDepreciation || 0);
            }
            if (this.assets[index].accumulatedDepreciation !== undefined) {
                this.assets[index].depreciation = this.assets[index].accumulatedDepreciation;
                this.assets[index].netBlock = (this.assets[index].amount || 0) - this.assets[index].accumulatedDepreciation;
            }
            // Disposal exact tracking
            if (this.assets[index].status === 'Disposed' && !this.assets[index].disposalDate) {
                this.assets[index].disposalDate = new Date().toISOString().split('T')[0];
            } else if (this.assets[index].status !== 'Disposed') {
                this.assets[index].disposalDate = null;
            }

            this._applyDepreciation(this.assets[index]);
            this._recalculateGrants();
            this._logActivity('Update Asset', `Asset details modified: ${this.assets[index].id} (${this.assets[index].name})`, snapshot);
            this.syncToCloud();
            return this.assets[index];
        }
        return null;
    }

    deleteAsset(id) {
        const asset = this.assets.find(a => a.id === id);
        this.assets = this.assets.filter(a => a.id !== id);
        // Also remove associated transfers and requests to clean up
        this.transfers = this.transfers.filter(t => t.assetId !== id);
        this.requests = this.requests.filter(r => r.assetId !== id);
        this._recalculateGrants();
        this._logActivity('Delete Asset', `Asset permanently removed from registry: ${id}`, asset);
        this.syncToCloud();
    }

    addNewGrant(grantData) {
        const newGrant = {
            id: 'GR-' + Math.floor(1000 + Math.random() * 9000), // Random 4 digit ID
            name: grantData.name,
            program: grantData.program,
            openingBalance: parseFloat(grantData.amount) || 0,
            spent: 0,
            closingBalance: parseFloat(grantData.amount) || 0
        };
        this.grants.unshift(newGrant);
        this._recalculateGrants();
        this._logActivity('Add Grant', `New funding source added: ${newGrant.name} (Allocation: ₹${newGrant.openingBalance})`, newGrant);
        this.syncToCloud();
        return newGrant;
    }

    updateGrant(id, grantData) {
        const index = this.grants.findIndex(g => g.id === id);
        if (index !== -1) {
            const snapshot = { ...this.grants[index] };
            this.grants[index] = { ...this.grants[index], ...grantData };
            if (grantData.amount !== undefined) {
                this.grants[index].openingBalance = parseFloat(grantData.amount);
            }
            this._recalculateGrants();
            this._logActivity('Update Grant', `Grant endowments modified: ${this.grants[index].id} (${this.grants[index].name})`, snapshot);
            this.syncToCloud();
            return this.grants[index];
        }
        return null;
    }

    deleteGrant(id) {
        const grant = this.grants.find(g => g.id === id);
        this.grants = this.grants.filter(g => g.id !== id);
        this._recalculateGrants();
        this._logActivity('Delete Grant', `Grant endowment permanently removed: ${id}`, grant);
        this.syncToCloud();
    }

    transferAsset(assetId, newAssignee, newLocation, newDesignation = "N/A", newAssigneeId = "N/A") {
        const asset = this.assets.find(a => a.id === assetId);
        if (asset) {
            const snapshot = { ...asset };
            const tx = {
                id: 'T-' + Date.now(),
                assetId: asset.id,
                fromAssignee: asset.assignedTo,
                fromDesignation: asset.assignedToDesignation,
                fromLocation: asset.location,
                toAssignee: newAssignee || asset.assignedTo,
                toDesignation: newDesignation || asset.assignedToDesignation,
                toLocation: newLocation || asset.location,
                date: new Date().toISOString()
            };
            
            this.transfers.unshift(tx);
            
            if (newAssignee) {
                asset.assignedTo = newAssignee;
                asset.assignedToDesignation = newDesignation;
                asset.assignedToId = newAssigneeId;
            }
            if (newLocation) asset.location = newLocation;
            
            this._logActivity('Transfer Asset', `Asset transferred from ${snapshot.assignedTo} to ${newAssignee || snapshot.assignedTo}`, snapshot);
            this.syncToCloud();
        }
        return asset;
    }

    _applyDepreciation(asset) {
        if (!asset.purchaseDate || !asset.depreciationRate) {
            // Keep derived fields aligned even if no depreciation
            asset.grossBlock = asset.amount;
            asset.fundingAmount = asset.amount;
            return;
        }

        const msPerDay = 1000 * 60 * 60 * 24;
        const endDate = (asset.status === 'Disposed' && asset.disposalDate) ? new Date(asset.disposalDate) : new Date();
        const startDate = new Date(asset.purchaseDate);
        if (isNaN(startDate) || isNaN(endDate)) return;
        
        const elapsedDays = Math.max(0, (endDate - startDate) / msPerDay);
        const elapsedYears = elapsedDays / 365.25;
        
        const gross = asset.amount || asset.grossBlock || 0;
        const rate = parseFloat(asset.depreciationRate);
        const calculatedAccumulated = gross * rate * elapsedYears;
        
        // Cap depreciation at 100% of gross block
        asset.accumulatedDepreciation = Math.min(calculatedAccumulated, gross);
        asset.depreciation = asset.accumulatedDepreciation; // legacy compat
        
        // Set dynamic netBlock
        asset.grossBlock = gross;
        asset.fundingAmount = gross;
        asset.netBlock = gross - asset.accumulatedDepreciation;
        
        // Keep current year deprecation fixed based on standard rate
        asset.currentYearDepreciation = gross * rate;
    }

    // ── ROLE GOVERNANCE METHODS ─────────────────────────
    _getDefaultRoles() {
        return [
            { id: 'employee', name: 'Employee', permissions: '[]', level: 0, isDefault: 1 },
            { id: 'manager', name: 'Manager / Supervisor', permissions: '["manage_team", "approve_requests"]', level: 1, isDefault: 1 },
            { id: 'hr', name: 'Human Resources', permissions: '["manage_users", "manage_payroll", "view_reports"]', level: 2, isDefault: 1 },
            { id: 'finance', name: 'Finance Controller', permissions: '["manage_grants", "approve_finance", "view_reports"]', level: 2, isDefault: 1 },
            { id: 'operations', name: 'Operations', permissions: '["manage_assets", "view_reports", "manage_transfers"]', level: 2, isDefault: 1 },
            { id: 'director', name: 'Director / Executive', permissions: '["all"]', level: 3, isDefault: 1 },
            { id: 'superadmin', name: 'Super Administrator', permissions: '["all"]', level: 4, isDefault: 1 }
        ];
    }

    addRole(data) {
        const role = { 
            id: data.id || 'ROLE-' + Date.now(), 
            name: data.name, 
            permissions: data.permissions || '[]', 
            level: parseInt(data.level) || 0,
            isDefault: 0 
        };
        this.roles.push(role);
        this._logActivity('Role Created', `Super Admin created custom governance role: ${data.name}`);
        this.syncToCloud();
        return role;
    }

    updateRole(id, data) {
        const idx = this.roles.findIndex(r => r.id === id);
        if (idx !== -1) {
            this.roles[idx] = { ...this.roles[idx], ...data };
            this.syncToCloud();
        }
        return this.roles[idx];
    }

    deleteRole(id) {
        const role = this.roles.find(r => r.id === id);
        if (role && role.isDefault) return false;
        this.roles = this.roles.filter(r => r.id !== id);
        this.syncToCloud();
        return true;
    }

    _getDefaultUsers() {
        const users = [
            { id: 'admin', name: 'System Administrator', role: 'superadmin', password: 'godmode', avatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png', designation: 'IT Support', location: 'HO', department: 'IT', permissions: '["all"]' },
            { id: 'operations', name: 'Operations Manager', role: 'operations', password: 'opspavan', avatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png', designation: 'Asset & Ops Head', location: 'Yadgir', department: 'Operations', permissions: '["manage_assets", "view_reports", "manage_transfers"]' },
            { id: 'hr', name: 'HR Manager', role: 'hr', password: 'hrpavan', avatar: 'https://cdn-icons-png.flaticon.com/512/4140/4140047.png', designation: 'Human Resources Head', location: 'Bangalore', department: 'HR', permissions: '["manage_users", "manage_payroll", "view_reports"]' },
            { id: 'finance', name: 'Finance Controller', role: 'finance', password: 'financepavan', avatar: 'https://cdn-icons-png.flaticon.com/512/9131/9131529.png', designation: 'Finance Controller', location: 'Bangalore', department: 'Finance', permissions: '["manage_grants", "approve_finance", "view_reports"]' },
            { id: 'director', name: 'Executive Director', role: 'director', password: 'edpavan', avatar: 'https://cdn-icons-png.flaticon.com/512/2202/2202112.png', designation: 'Executive Director', location: 'HO', department: 'Executive', permissions: '["all"]' }
        ];
        RAW_EMPLOYEES.forEach(emp => {
            const idNumber = emp.id.split('/').pop();
            const firstFive = (emp.name || '').substring(0, 5);
            
            let assignedRole = 'employee';
            let perms = '[]';
            const desig = (emp.designation || '').toLowerCase();
            
            // Extract Program (Department) from designation
            let dept = '';
            if (desig.includes('wash')) dept = 'WaSH';
            else if (desig.includes('education')) dept = 'Education';
            else if (desig.includes('childhood') || desig.includes('ecd')) dept = 'Early Childhood Education';
            else if (desig.includes('livelihood')) dept = 'Livelihood';
            else if (desig.includes('ghk')) dept = 'GHK';
            else if (desig.includes('skill')) dept = 'Skill Development';
            else if (desig.includes('mis') || desig.includes('rme')) dept = 'MIS/RME';
            else if (desig.includes('account') || desig.includes('finance')) dept = 'Finance';
            else if (desig.includes('admin')) dept = 'Operations';
            
            if (desig.includes('manager') || desig.includes('lead') || desig.includes('head') || desig.includes('director') || desig.includes('coordinator')) {
                assignedRole = 'manager';
                perms = '["manage_team", "approve_requests"]';
            }

            // Default Reporting Lines (Demo Simulation)
            // In a real system, these would be explicitly set in the Org Chart.
            let reportsTo = 'operations'; // Default to Ops
            if (desig.includes('coordinator')) reportsTo = 'operations'; 
            if (desig.includes('manager')) reportsTo = 'director';
            if (desig.includes('officer') || desig.includes('associate') || desig.includes('assistant')) {
                // Try to find a coordinator in the same location/dept to report to
            }

            users.push({
                id: emp.id, name: emp.name, role: assignedRole,
                password: idNumber + firstFive,
                avatar: 'https://cdn-icons-png.flaticon.com/512/147/147144.png',
                designation: emp.designation || '', location: emp.location || '',
                department: dept, reportsTo: reportsTo, permissions: perms
            });
        });
        return users;
    }

    // ── WORKLOG METHODS ─────────────────────────────────
    addWorklog(data) {
        const wl = { id: 'WL-' + Date.now(), empId: data.empId, empName: data.empName, department: data.department || '', location: data.location || '', reportsTo: data.reportsTo || '', date: data.date, tasks: JSON.stringify(data.tasks || []), hoursWorked: data.hoursWorked || 8, status: 'submitted', score: 0, remarks: '', scoredBy: null, scoredByName: null, scoredAt: null, createdAt: new Date().toISOString() };
        this.worklogs.unshift(wl);
        this._logActivity('Worklog Submitted', `${data.empName} submitted worklog for ${data.date}`);
        this.syncToCloud();
        return wl;
    }
    scoreWorklog(id, score, remarks, scoredBy, scoredByName) {
        const wl = this.worklogs.find(w => w.id === id);
        if (wl) { wl.score = score; wl.remarks = remarks; wl.scoredBy = scoredBy; wl.scoredByName = scoredByName; wl.status = 'scored'; this.syncToCloud(); }
        return wl;
    }

    // ── TASK METHODS ────────────────────────────────────
    addTask(data) {
        const task = { id: 'TSK-' + Date.now(), title: data.title, description: data.description || '', assignedTo: data.assignedTo, assignedToName: data.assignedToName, assignedBy: data.assignedBy, assignedByName: data.assignedByName, priority: data.priority || 'Medium', status: 'Pending', dueDate: data.dueDate || '', completedDate: null, score: 0, maxScore: 10, feedback: '', category: data.category || 'General', createdAt: new Date().toISOString() };
        this.tasks.unshift(task);
        this._addNotification(data.assignedTo, 'employee', 'task', 'New Task Assigned', `"${data.title}" assigned by ${data.assignedByName}`, 'tasks');
        this._logActivity('Task Created', `Task "${data.title}" assigned to ${data.assignedToName}`);
        this.syncToCloud();
        return task;
    }
    updateTaskStatus(id, status) {
        const t = this.tasks.find(x => x.id === id);
        if (t) { t.status = status; if (status === 'Completed') t.completedDate = new Date().toISOString().split('T')[0]; this.syncToCloud(); }
        return t;
    }
    scoreTask(id, score, feedback, scoredBy) {
        const t = this.tasks.find(x => x.id === id);
        if (t) { t.score = score; t.feedback = feedback; t.status = 'Scored'; this.syncToCloud(); }
        return t;
    }

    // ── LEAVE METHODS ───────────────────────────────────
    applyLeave(data) {
        const leave = { id: 'LV-' + Date.now(), empId: data.empId, empName: data.empName, department: data.department || '', location: data.location || '', reportsTo: data.reportsTo || '', type: data.type, fromDate: data.fromDate, toDate: data.toDate, days: data.days, reason: data.reason, status: 'Pending', approvedBy: null, approvedByName: null, remarks: '', appliedOn: new Date().toISOString().split('T')[0] };
        this.leaves.unshift(leave);
        this._addNotification('manager', 'manager', 'leave', 'Leave Application', `${data.empName} applied for ${data.days} day(s) ${data.type} leave`, 'leave');
        this._logActivity('Leave Applied', `${data.empName} applied ${data.type} leave: ${data.fromDate} to ${data.toDate}`);
        this.syncToCloud();
        return leave;
    }
    approveLeave(id, approvedBy, approvedByName, remarks) {
        const lv = this.leaves.find(x => x.id === id);
        if (lv) {
            lv.status = 'Approved'; lv.approvedBy = approvedBy; lv.approvedByName = approvedByName; lv.remarks = remarks || '';
            // Deduct balance
            const bal = this.leaveBalances.find(b => b.empId === lv.empId && b.year === new Date().getFullYear().toString());
            if (bal) { const typeKey = lv.type === 'Casual' ? 'casualLeave' : lv.type === 'Sick' ? 'sickLeave' : lv.type === 'Earned' ? 'earnedLeave' : 'compensatory'; bal[typeKey] = Math.max(0, (bal[typeKey] || 0) - lv.days); }
            this._addNotification(lv.empId, 'employee', 'leave', 'Leave Approved', `Your ${lv.type} leave (${lv.fromDate} to ${lv.toDate}) has been approved`, 'leave');
            this.syncToCloud();
        }
        return lv;
    }
    rejectLeave(id, rejectedBy, rejectedByName, remarks) {
        const lv = this.leaves.find(x => x.id === id);
        if (lv) { lv.status = 'Rejected'; lv.approvedBy = rejectedBy; lv.approvedByName = rejectedByName; lv.remarks = remarks || ''; this._addNotification(lv.empId, 'employee', 'leave', 'Leave Rejected', `Your ${lv.type} leave request was rejected: ${remarks}`, 'leave'); this.syncToCloud(); }
        return lv;
    }
    getLeaveBalance(empId) {
        const year = new Date().getFullYear().toString();
        let bal = this.leaveBalances.find(b => b.empId === empId && b.year === year);
        if (!bal) { bal = { id: 'LB-' + Date.now(), empId, casualLeave: 12, sickLeave: 12, earnedLeave: 15, compensatory: 0, year }; this.leaveBalances.push(bal); this.syncToCloud(); }
        return bal;
    }

    // ── REIMBURSEMENT METHODS ───────────────────────────
    submitReimbursement(data) {
        const r = { id: 'RMB-' + Date.now(), empId: data.empId, empName: data.empName, department: data.department || '', location: data.location || '', reportsTo: data.reportsTo || '', category: data.category, amount: parseFloat(data.amount) || 0, description: data.description, billDate: data.billDate, billNumber: data.billNumber || '', travelFrom: data.travelFrom || '', travelTo: data.travelTo || '', travelDate: data.travelDate || '', attachments: JSON.stringify(data.attachments || []), status: 'Pending', managerApproved: 0, managerRemarks: '', adminApproved: 0, adminRemarks: '', settledBy: null, settledByName: null, settledDate: null, submittedOn: new Date().toISOString().split('T')[0] };
        this.reimbursements.unshift(r);
        this._addNotification('manager', 'manager', 'reimbursement', 'Expense Claim', `${data.empName} submitted ₹${data.amount} ${data.category} claim`, 'reimbursements');
        this._logActivity('Reimbursement Submitted', `${data.empName} submitted ₹${data.amount} ${data.category} expense`);
        this.syncToCloud();
        return r;
    }
    approveReimbursementManager(id, remarks) {
        const r = this.reimbursements.find(x => x.id === id);
        if (r) { r.managerApproved = 1; r.managerRemarks = remarks || ''; r.status = 'Manager Approved'; this._addNotification('finance', 'finance', 'reimbursement', 'Expense Awaiting Settlement', `${r.empName}'s ₹${r.amount} ${r.category} claim needs admin approval`, 'reimbursements'); this.syncToCloud(); }
        return r;
    }
    approveReimbursementAdmin(id, remarks) {
        const r = this.reimbursements.find(x => x.id === id);
        if (r) { r.adminApproved = 1; r.adminRemarks = remarks || ''; r.status = 'Approved - Pending Settlement'; this.syncToCloud(); }
        return r;
    }
    settleReimbursement(id, settledBy, settledByName) {
        const r = this.reimbursements.find(x => x.id === id);
        if (r) { r.status = 'Settled'; r.settledBy = settledBy; r.settledByName = settledByName; r.settledDate = new Date().toISOString().split('T')[0]; this._addNotification(r.empId, 'employee', 'reimbursement', 'Expense Settled', `Your ₹${r.amount} ${r.category} claim has been settled`, 'reimbursements'); this.syncToCloud(); }
        return r;
    }
    rejectReimbursement(id, rejectedBy, remarks) {
        const r = this.reimbursements.find(x => x.id === id);
        if (r) { r.status = 'Rejected'; r.managerRemarks = remarks; this.syncToCloud(); }
        return r;
    }

    // ── PROCUREMENT METHODS ─────────────────────────────
    createProcurement(data) {
        const p = { id: 'PR-' + Date.now(), title: data.title, description: data.description || '', category: data.category || 'General', estimatedAmount: parseFloat(data.estimatedAmount) || 0, vendor: data.vendor || '', vendorContact: data.vendorContact || '', vendorQuotation: data.vendorQuotation || '', alternateVendor: data.alternateVendor || '', alternateQuotation: data.alternateQuotation || '', justification: data.justification || '', requestedBy: data.requestedBy, requestedByName: data.requestedByName, department: data.department || '', location: data.location || '', reportsTo: data.reportsTo || '', urgency: data.urgency || 'Normal', step: 'submitted', managerApproved: 0, managerApprovedBy: null, managerRemarks: '', managerApprovedDate: null, financeApproved: 0, financeApprovedBy: null, financeRemarks: '', financeApprovedDate: null, adminApproved: 0, adminApprovedBy: null, adminRemarks: '', adminApprovedDate: null, purchaseOrderNumber: '', approvedAmount: 0, deliveryDate: '', deliveredDate: null, actualAmount: 0, billNumber: '', voucherNumber: '', assetRegistered: 0, assetId: null, rejected: 0, rejectedBy: null, rejectedReason: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        this.procurement.unshift(p);
        this._addNotification('manager', 'manager', 'procurement', 'Procurement Request', `${data.requestedByName} requested: ${data.title} (₹${data.estimatedAmount})`, 'procurement');
        this._logActivity('Procurement Created', `${data.requestedByName} created procurement: ${data.title}`);
        this.syncToCloud();
        return p;
    }
    advanceProcurement(id, step, approverData = {}) {
        const p = this.procurement.find(x => x.id === id);
        if (!p) return null;
        p.step = step;
        p.updatedAt = new Date().toISOString();
        // Merge any extra fields the caller passes
        Object.assign(p, approverData);

        if (step === 'manager_approved') {
            p.managerApproved = 1;
            p.managerApprovedBy = approverData.by || approverData.managerApprovedBy;
            p.managerRemarks = approverData.remarks || approverData.managerRemarks || '';
            p.managerApprovedDate = new Date().toISOString().split('T')[0];
            this._triggerInstitutionalAlert('Email', 'finance@kalike.org', `URGENT: Procurement PR-${p.id} for "${p.title}" (₹${p.estimatedAmount}) requires Finance Approval.`);
            this._triggerInstitutionalAlert('SMS', '+91-9988776655', `Kalike Alert: PR-${p.id} awaiting your approval. - Finance Controller`);
        }
        if (step === 'finance_approved') { p.financeApproved = 1; p.financeApprovedBy = approverData.by || approverData.financeApprovedBy; p.financeRemarks = approverData.remarks || approverData.financeRemarks || ''; p.financeApprovedDate = new Date().toISOString().split('T')[0]; p.approvedAmount = approverData.approvedAmount || p.estimatedAmount; }
        if (step === 'admin_approved') { p.adminApproved = 1; p.adminApprovedBy = approverData.by || approverData.adminApprovedBy; p.adminRemarks = approverData.remarks || approverData.adminRemarks || ''; p.adminApprovedDate = new Date().toISOString().split('T')[0]; p.purchaseOrderNumber = approverData.poNumber || 'PO-' + Date.now(); }
        if (step === 'delivered') { p.deliveredDate = new Date().toISOString().split('T')[0]; p.actualAmount = approverData.actualAmount || p.approvedAmount; p.billNumber = approverData.billNumber || ''; p.voucherNumber = approverData.voucherNumber || ''; }
        if (step === 'asset_registered') { p.assetRegistered = 1; p.assetId = approverData.assetId; }

        // Notify requester of progress
        const stepLabels = { manager_approved: 'Manager Approved', finance_approved: 'Finance Approved', director_approved: 'ED Approved', admin_approved: 'PO Issued', delivered: 'Delivered', rejected: 'Rejected' };
        if (stepLabels[step] && p.requestedBy) {
            this.addNotification(p.requestedBy, 'Procurement Update', `Your request for "${p.title}" has been updated to: ${stepLabels[step]}`, 'Procurement');
        }

        this._logActivity('Procurement Advanced', `Request ${id} moved to ${step}`);
        this.syncToCloud();
        return p;
    }
    rejectProcurement(id, rejectedBy, reason) {
        const p = this.procurement.find(x => x.id === id);
        if (p) { p.rejected = 1; p.rejectedBy = rejectedBy; p.rejectedReason = reason; p.step = 'rejected'; this.syncToCloud(); }
        return p;
    }

    registerAssetFromProcurement(procurementId) {
        const pr = this.procurement.find(p => p.id === procurementId);
        if (!pr) return null;

        const assetData = {
            name: pr.title,
            category: pr.category || 'Unclassified',
            location: pr.department || 'HQ',
            amount: pr.actualAmount || pr.approvedAmount || pr.estimatedAmount,
            supplier: pr.vendor || 'N/A',
            billNumber: pr.billNumber || 'N/A',
            voucherNumber: pr.voucherNumber || 'N/A',
            purchaseDate: pr.deliveredDate || pr.deliveryDate || new Date().toISOString().split('T')[0],
            fundingSource: 'Institutional Fund',
            procurementType: 'Purchase'
        };

        const asset = this.addNewAsset(assetData);
        
        // Link back to procurement
        pr.assetRegistered = 1;
        pr.assetId = asset.id;
        pr.step = 'asset_registered';
        
        this._logActivity('Procurement Integrated', `Asset ${asset.id} automatically registered from Procurement Request ${pr.id}`);
        this.syncToCloud();
        return asset;
    }

    // ── ATTENDANCE METHODS ──────────────────────────────
    markAttendance(data) {
        const today = new Date().toISOString().split('T')[0];
        const existing = this.attendance.find(a => a.empId === data.empId && a.date === (data.date || today));
        if (existing) { existing.checkOut = data.checkOut || new Date().toLocaleTimeString(); existing.remarks = data.remarks || existing.remarks; this.syncToCloud(); return existing; }
        const entry = { id: 'ATT-' + Date.now(), empId: data.empId, empName: data.empName, date: data.date || today, checkIn: data.checkIn || new Date().toLocaleTimeString(), checkOut: data.checkOut || '', status: data.status || 'Present', location: data.location || '', remarks: data.remarks || '', markedAt: new Date().toISOString() };
        this.attendance.unshift(entry);
        this.syncToCloud();
        return entry;
    }

    // ── PAYROLL METHODS ─────────────────────────────────
    generatePayslip(data) {
        const gross = (data.basicSalary || 0) + (data.hra || 0) + (data.conveyanceAllowance || 0) + (data.specialAllowance || 0) + (data.otherAllowance || 0) + (data.communicationAllowance || 0);
        const deductions = (data.pf || 0) + (data.esi || 0) + (data.tds || 0) + (data.professionalTax || 0) + (data.otherDeductions || 0);
        const slip = { id: 'PAY-' + Date.now(), empId: data.empId, empName: data.empName, designation: data.designation || '', department: data.department || '', month: data.month, basicSalary: data.basicSalary || 0, hra: data.hra || 0, conveyanceAllowance: data.conveyanceAllowance || 0, specialAllowance: data.specialAllowance || 0, otherAllowance: data.otherAllowance || 0, communicationAllowance: data.communicationAllowance || 0, grossSalary: gross, pf: data.pf || 0, esi: data.esi || 0, tds: data.tds || 0, professionalTax: data.professionalTax || 0, otherDeductions: data.otherDeductions || 0, totalDeductions: deductions, netSalary: gross - deductions, bankAccount: data.bankAccount || '', bankName: data.bankName || '', panNumber: data.panNumber || '', pfNo: data.pfNo || '', pfUan: data.pfUan || '', effectiveWorkDays: data.effectiveWorkDays || 30, lop: data.lop || 0, location: data.location || '', joiningDate: data.joiningDate || '', status: 'Generated', generatedOn: new Date().toISOString(), sentOn: null };
        this.payroll.unshift(slip);
        this._logActivity('Payslip Generated', `Payslip generated for ${data.empName} — ${data.month}`);
        this.syncToCloud();
        return slip;
    }
    markPayslipSent(id) {
        const p = this.payroll.find(x => x.id === id);
        if (p) { p.status = 'Sent'; p.sentOn = new Date().toISOString(); this.syncToCloud(); }
        return p;
    }

    updateSalaryMaster(empId, data) {
        const u = this.users.find(x => x.id === empId);
        if (u) {
            u.baseBasic = parseFloat(data.baseBasic) || 0;
            u.baseHra = parseFloat(data.baseHra) || 0;
            u.baseConveyance = parseFloat(data.baseConveyance) || 0;
            u.baseSpecial = parseFloat(data.baseSpecial) || 0;
            u.baseComm = parseFloat(data.baseComm) || 0;
            u.pfNo = data.pfNo || u.pfNo;
            u.pfUan = data.pfUan || u.pfUan;
            u.bankName = data.bankName || u.bankName;
            this.syncToCloud();
            this._logActivity('Salary Master Updated', `Salary structure updated for ${u.name}`);
        }
    }

    // ── HIERARCHY METHODS ───────────────────────────────
    setHierarchy(empId, empName, reportsTo, reportsToName, department, level) {
        const existing = this.hierarchy.findIndex(h => h.empId === empId);
        const entry = { id: existing >= 0 ? this.hierarchy[existing].id : 'HR-' + Date.now(), empId, empName, reportsTo, reportsToName, department: department || '', level: level || 0 };
        
        if (existing >= 0) this.hierarchy[existing] = entry; 
        else this.hierarchy.push(entry);

        // Sync to User Profile for fast access
        const user = this.users.find(u => u.id === empId);
        if (user) {
            user.reportsTo = reportsTo;
            user.department = department || user.department;
        }

        this.syncToCloud();
        return entry;
    }
    getDirectReports(managerId) {
        return this.hierarchy.filter(h => h.reportsTo === managerId);
    }

    getGovernanceAlerts() {
        const now = new Date();
        const alerts = [];
        
        // 1. Stale Procurement (Pending > 48h)
        this.procurement.forEach(p => {
            if (!p.rejected && p.step !== 'asset_registered' && p.step !== 'delivered') {
                const updated = new Date(p.updatedAt || p.createdAt);
                const diffHours = (now - updated) / (1000 * 60 * 60);
                if (diffHours > 48) {
                    alerts.push({
                        id: 'AL-PR-' + p.id,
                        type: 'procurement',
                        severity: diffHours > 96 ? 'critical' : 'warning',
                        title: `Stale Procurement: ${p.title}`,
                        message: `Request PR-${p.id} has been pending for ${Math.floor(diffHours)} hours at step "${p.step}".`,
                        item: p
                    });
                }
            }
        });

        // 2. Pending Leaves (> 48h)
        this.leaves.forEach(l => {
            if (l.status === 'Pending') {
                const applied = new Date(l.appliedOn);
                const diffHours = (now - applied) / (1000 * 60 * 60);
                if (diffHours > 48) {
                    alerts.push({
                        id: 'AL-LV-' + l.id,
                        type: 'leave',
                        severity: 'warning',
                        title: `Pending Leave Approval`,
                        message: `${l.empName}'s leave request (${l.fromDate}) has been pending for ${Math.floor(diffHours / 24)} days.`,
                        item: l
                    });
                }
            }
        });

        // 3. Unscored Worklogs
        this.worklogs.forEach(w => {
            if (w.status === 'submitted') {
                const created = new Date(w.createdAt);
                const diffHours = (now - created) / (1000 * 60 * 60);
                if (diffHours > 72) {
                    alerts.push({
                        id: 'AL-WL-' + w.id,
                        type: 'worklog',
                        severity: 'info',
                        title: `Unscored Worklog`,
                        message: `${w.empName}'s log for ${w.date} remains unscored.`,
                        item: w
                    });
                }
            }
        });

        return alerts;
    }

    getTeamMetrics(managerId) {
        const subordinates = this.getDirectReports(managerId);
        const metrics = subordinates.map(h => {
            const emp = this.users.find(u => u.id === h.empId);
            const empTasks = this.tasks.filter(t => t.assignedTo === h.empId);
            const completedTasks = empTasks.filter(t => t.status === 'Completed' || t.status === 'Scored').length;
            const completionRate = empTasks.length > 0 ? (completedTasks / empTasks.length) * 100 : 100;
            
            const empWorklogs = this.worklogs.filter(w => w.empId === h.empId);
            const lastLog = empWorklogs.length > 0 ? empWorklogs.sort((a,b)=>new Date(b.date)-new Date(a.date))[0].date : 'Never';
            
            const today = new Date().toISOString().split('T')[0];
            const presentToday = this.attendance.some(a => a.empId === h.empId && a.date === today && a.status === 'Present');
            
            // Risk logic
            const atRisk = (empWorklogs.length === 0 && empTasks.length > 0) || (completionRate < 30 && empTasks.length > 5);
            
            return {
                empId: h.empId,
                name: h.empName,
                department: h.department,
                designation: emp?.designation || 'Staff',
                avatar: emp?.avatar || '',
                presentToday,
                lastLog,
                taskCompletion: Math.round(completionRate),
                pendingTasks: empTasks.length - completedTasks,
                atRisk
            };
        });
        return metrics;
    }

    // ── NOTIFICATION HELPER ─────────────────────────────
    _addNotification(recipientId, recipientRole, type, title, message, link) {
        const n = { id: 'NTF-' + Date.now() + '-' + Math.floor(Math.random() * 1000), recipientId, recipientRole, type, title, message, link, isRead: 0, createdAt: new Date().toISOString() };
        this.notifications.unshift(n);
        if (this.notifications.length > 500) this.notifications = this.notifications.slice(0, 500);
    }
    getUnreadNotifications(userId, role) {
        return this.notifications.filter(n => (n.recipientId === userId || n.recipientRole === role) && !n.isRead);
    }
    markNotificationRead(id) {
        const n = this.notifications.find(x => x.id === id);
        if (n) { n.isRead = 1; this.syncToCloud(); }
    }
    markAllNotificationsRead(userId, role) {
        this.notifications.forEach(n => { if (n.recipientId === userId || n.recipientRole === role) n.isRead = 1; });
        this.syncToCloud();
    }
    // ── PHASE 3 MODULES METHODS ─────────────────────────────
    
    // Document Vault
    addDocument(data) {
        const doc = { id: 'DOC-' + Date.now(), empId: data.empId, title: data.title, type: data.type, url: data.url, uploadedBy: data.uploadedBy, uploadedAt: new Date().toISOString() };
        this.documents.unshift(doc);
        this.syncToCloud();
        return doc;
    }

    // Announcements
    addAnnouncement(data) {
        const ann = { id: 'ANN-' + Date.now(), title: data.title, content: data.content, authorId: data.authorId, authorName: data.authorName, priority: data.priority || 'Normal', createdAt: new Date().toISOString() };
        this.announcements.unshift(ann);
        this.syncToCloud();
        return ann;
    }
    markAnnouncementRead(announcementId, empId) {
        const exists = this.announcementReads.find(r => r.announcementId === announcementId && r.empId === empId);
        if (!exists) {
            this.announcementReads.push({ id: 'AR-' + Date.now() + Math.random(), announcementId, empId, readAt: new Date().toISOString() });
            this.syncToCloud();
        }
    }

    // Calendar
    addCalendarEvent(data) {
        const evt = { id: 'EVT-' + Date.now(), title: data.title, description: data.description, date: data.date, type: data.type, creatorId: data.creatorId, createdAt: new Date().toISOString() };
        this.calendarEvents.push(evt);
        this.syncToCloud();
        return evt;
    }

    // Performance Reviews
    addPerformanceReview(data) {
        const rev = { 
            id: 'REV-' + Date.now(), 
            empId: data.empId, 
            empName: data.empName, 
            managerId: data.managerId, 
            period: data.period, 
            taskScore: data.taskScore || 0, 
            managerRating: data.managerRating || 0, 
            feedback: data.feedback || '', 
            selfScore: data.selfScore || 0,
            selfFeedback: data.selfFeedback || '',
            status: data.status || 'Draft', 
            createdAt: new Date().toISOString(), 
            updatedAt: new Date().toISOString() 
        };
        this.performanceReviews.unshift(rev);
        this.syncToCloud();
        return rev;
    }
    updatePerformanceReview(id, data) {
        const rev = this.performanceReviews.find(r => r.id === id);
        if (rev) {
            Object.assign(rev, data);
            rev.updatedAt = new Date().toISOString();
            this.syncToCloud();
        }
        return rev;
    }
    _triggerInstitutionalAlert(type, recipient, message) {
        const log = {
            id: 'COM-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            type,
            recipient,
            message,
            status: 'Delivered',
            timestamp: new Date().toISOString()
        };
        this.communicationLogs.unshift(log);
        if (this.communicationLogs.length > 500) this.communicationLogs.pop();
        
        // Log activity for system oversight
        this._logActivity(`${type} Alert Sent`, `Institutional ${type} sent to ${recipient}: "${message.substring(0, 30)}..."`);
    }

    saveSignature(refId, empId, empName, signatureData) {
        const sig = {
            id: 'SIG-' + Date.now(),
            refId,
            empId,
            empName,
            signatureData,
            signedAt: new Date().toISOString()
        };
        this.signatures.push(sig);
        this.syncToCloud();
        this._logActivity('Digital Signature', `${empName} signed document/request ${refId}`);
        return sig;
    }

    saveDefaultSignature(empId, signatureData) {
        const user = this.users.find(u => u.empId === empId);
        if (user) {
            user.defaultSignature = signatureData;
            this.syncToCloud();
            this._logActivity('Default Signature Set', `${user.name} updated their institutional digital signature`);
        }
        return user;
    }

    addNotification(empId, title, message, type = 'System') {
        const notif = {
            id: 'NOTIF-' + Date.now() + Math.random(),
            empId,
            title,
            message,
            type,
            read: false,
            createdAt: new Date().toISOString()
        };
        this.notifications.unshift(notif);
        this.syncToCloud();
        return notif;
    }


    finalizePerformanceReview(id, hrId) {
        const rev = this.performanceReviews.find(r => r.id === id);
        if (rev) {
            rev.status = 'Published';
            rev.finalizedBy = hrId;
            rev.updatedAt = new Date().toISOString();
            
            // Notify Employee
            this.addNotification(rev.empId, 'Appraisal Published', `Your performance review for ${rev.period} has been finalized and published by HR.`, 'Performance');

            this.syncToCloud();
            this._logActivity('Review Finalized', `Performance review ${id} finalized and published`);
        }
        return rev;
    }
}

export const db = new AssetDB();
