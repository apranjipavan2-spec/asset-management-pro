const INITIAL_ASSETS = [
    {
        id: "AS-99812",
        name: "Tier 1 Heavy Drill",
        category: "Equipment",
        status: "Active",
        location: "Nevada Site A",
        health: "99.4%",
        purchaseDate: "2023-01-15",
        amount: 250000,
        program: "Deep Mining Initiative",
        assignedTo: "John Doe",
        depreciation: 12500
    },
    {
        id: "AS-77102",
        name: "Desalination Unit",
        category: "Infrastructure",
        status: "Maintenance",
        location: "Dubai Coast",
        health: "42.1%",
        purchaseDate: "2022-06-10",
        amount: 1200000,
        program: "Clean Water Program",
        assignedTo: "Global Ops",
        depreciation: 85000
    },
    {
        id: "AS-88123",
        name: "Automated Hauler",
        category: "Logistics",
        status: "Storage",
        location: "Perth Logistics",
        health: "100.0%",
        purchaseDate: "2024-02-20",
        amount: 450000,
        program: "Outback Supply Chain",
        assignedTo: "Transport Team",
        depreciation: 0
    }
];

const INITIAL_GRANTS = [
    {
        id: "G-2024-EUA",
        name: "EU Environmental Adaptation",
        program: "Sustainable Energy",
        openingBalance: 5000000,
        spent: 1250000,
        closingBalance: 3750000
    },
    {
        id: "G-2024-UND",
        name: "UN Development Grant",
        program: "Industrial Automation",
        openingBalance: 10000000,
        spent: 4200000,
        closingBalance: 5800000
    }
];

export class AssetDB {
    constructor() {
        this.assets = JSON.parse(localStorage.getItem('amp_assets')) || INITIAL_ASSETS;
        this.grants = JSON.parse(localStorage.getItem('amp_grants')) || INITIAL_GRANTS;
        this.maintenanceLogs = JSON.parse(localStorage.getItem('amp_maint')) || [];
        this.requests = JSON.parse(localStorage.getItem('amp_requests')) || [];
    }

    save() {
        localStorage.setItem('amp_assets', JSON.stringify(this.assets));
        localStorage.setItem('amp_grants', JSON.stringify(this.grants));
        localStorage.setItem('amp_maint', JSON.stringify(this.maintenanceLogs));
        localStorage.setItem('amp_requests', JSON.stringify(this.requests));
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
        this.save();
        return log;
    }

    requestAsset(category, reason, user) {
        const request = {
            id: 'REQ-' + Date.now(),
            category,
            reason,
            user,
            date: new Date().toISOString(),
            status: 'Pending'
        };
        this.requests.unshift(request);
        this.save();
        return request;
    }

    getStats() {
        return {
            totalAssets: this.assets.length,
            activeAssets: this.assets.filter(a => a.status === 'Active').length,
            maintenanceAssets: this.assets.filter(a => a.status === 'Maintenance').length,
            totalValue: this.assets.reduce((sum, a) => sum + a.amount, 0),
            netValue: this.assets.reduce((sum, a) => sum + (a.amount - a.depreciation), 0)
        };
    }

    approveRequest(requestId) {
        const req = this.requests.find(r => r.id === requestId);
        if (req) {
            req.status = "Approved";
            this.save();
        }
        return req;
    }

    rejectRequest(requestId) {
        const req = this.requests.find(r => r.id === requestId);
        if (req) {
            req.status = "Rejected";
            this.save();
        }
        return req;
    }

    transferAsset(assetId, newAssignee, newLocation) {
        const asset = this.assets.find(a => a.id === assetId);
        if (asset) {
            if (newAssignee) asset.assignedTo = newAssignee;
            if (newLocation) asset.location = newLocation;
            this.save();
        }
        return asset;
    }
}

export const db = new AssetDB();
