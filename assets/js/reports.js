/**
 * Reports module for business intelligence
 */
const reportsModule = {
    activeReport: 'sales',

    async init() {
        this.bindEvents();
        this.setDefaultDates();
        await this.reloadData();
    },

    bindEvents() {
        document.querySelectorAll('#reportTabs button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#reportTabs button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeReport = btn.dataset.report;
                this.reloadData();
            });
        });
    },

    setDefaultDates() {
        const d = new Date();
        const start = document.getElementById('startDate');
        const end = document.getElementById('endDate');
        if (start) start.value = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
        if (end) end.value = d.toISOString().split('T')[0];
    },

    async reloadData() {
        const start = document.getElementById('startDate').value;
        const end = document.getElementById('endDate').value;
        const content = document.getElementById('reportContent');
        if (!content) return;

        content.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

        try {
            if (this.activeReport === 'sales') await this.renderSalesReport(start, end);
            if (this.activeReport === 'inventory') await this.renderInventoryReport();
            if (this.activeReport === 'profit') await this.renderProfitReport(start, end);
            if (this.activeReport === 'expiry') await this.renderExpiryReport();
        } catch (err) {
            content.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
        }
    },

    async renderSalesReport(start, end) {
        const res = await api.get(`/reports/sales?start_date=${start}&end_date=${end}`);
        const data = res.data;
        const summary = data.summary;

        document.getElementById('reportContent').innerHTML = `
            <div class="row g-4 mb-5">
                <div class="col-md-4">
                    <div class="p-3 border rounded">
                        <p class="text-muted small mb-1">Total Bills</p>
                        <h4 class="fw-bold m-0">${summary.total_bills || 0}</h4>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="p-3 border rounded">
                        <p class="text-muted small mb-1">Gross Revenue</p>
                        <h4 class="fw-bold m-0 text-success">₹ ${summary.total_revenue || 0}</h4>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="p-3 border rounded">
                        <p class="text-muted small mb-1">Avg Bill Value</p>
                        <h4 class="fw-bold m-0">₹ ${summary.average_bill_amount?.toFixed(2) || 0}</h4>
                    </div>
                </div>
            </div>
            <h6 class="fw-bold mb-3">Top Selling Medicines</h6>
            <table class="table table-sm">
                <thead><tr><th>Medicine</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
                <tbody>
                    ${data.top_selling_medicines.map(m => `
                        <tr><td>${m.medicine_name}</td><td>${m.total_quantity_sold}</td><td>₹ ${m.total_revenue}</td></tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    async renderInventoryReport() {
        const res = await api.get('/reports/inventory');
        const data = res.data;

        document.getElementById('reportContent').innerHTML = `
            <div class="row g-4 mb-5">
                <div class="col-md-6">
                    <div class="p-3 border rounded bg-light">
                        <p class="text-muted small mb-1">Stock Portfolio Value (Cost)</p>
                        <h4 class="fw-bold m-0">₹ ${data.summary.total_purchase_value?.toFixed(2)}</h4>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="p-3 border rounded bg-light">
                        <p class="text-muted small mb-1">Estimated Selling Value</p>
                        <h4 class="fw-bold m-0 text-primary">₹ ${data.summary.total_selling_value?.toFixed(2)}</h4>
                    </div>
                </div>
            </div>
            <h6 class="fw-bold mb-3 text-warning">Low Stock Items (${data.low_stock_medicines.length})</h6>
            <table class="table table-sm mb-4">
                <thead><tr><th>Medicine</th><th>Current Qty</th></tr></thead>
                <tbody>
                    ${data.low_stock_medicines.map(m => `<tr><td>${m.medicine_name}</td><td><span class="text-danger fw-bold">${m.quantity}</span></td></tr>`).join('')}
                </tbody>
            </table>
        `;
    },

    async renderProfitReport(start, end) {
        const res = await api.get(`/reports/profit?start_date=${start}&end_date=${end}`);
        const p = res.data;

        document.getElementById('reportContent').innerHTML = `
            <div class="card bg-primary text-white p-4 mb-4 border-0">
                <p class="mb-1 opacity-75">Net Profit Margin</p>
                <h2 class="fw-bold mb-0">${p.profit_margin_percent || 0}%</h2>
            </div>
            <div class="row g-4">
                <div class="col-md-4"><p class="text-muted mb-1 small">Total Revenue</p><h5>₹ ${p.total_revenue || 0}</h5></div>
                <div class="col-md-4"><p class="text-muted mb-1 small">Product Costs</p><h5>₹ ${p.total_cost || 0}</h5></div>
                <div class="col-md-4"><p class="text-muted mb-1 small">Gross Profit</p><h5 class="text-success">₹ ${p.gross_profit || 0}</h5></div>
            </div>
        `;
    },

    async renderExpiryReport() {
        const res = await api.get('/reports/expiring?days=90');
        const data = res.data;

        document.getElementById('reportContent').innerHTML = `
            <h6 class="fw-bold mb-3 text-danger">Expired Medicines (${data.expired.length})</h6>
            <table class="table table-sm mb-5">
                <thead><tr><th>Medicine</th><th>Expiry Date</th><th>Action</th></tr></thead>
                <tbody>
                    ${data.expired.map(m => `<tr><td>${m.medicine_name}</td><td class="text-danger">${new Date(m.expiry_date).toLocaleDateString()}</td><td><span class="badge bg-danger">Dispose</span></td></tr>`).join('')}
                </tbody>
            </table>

            <h6 class="fw-bold mb-3 text-warning">Expiring in next 90 days (${data.expiring_soon.length})</h6>
            <table class="table table-sm">
                <thead><tr><th>Medicine</th><th>Expiry Date</th></tr></thead>
                <tbody>
                    ${data.expiring_soon.map(m => `<tr><td>${m.medicine_name}</td><td>${new Date(m.expiry_date).toLocaleDateString()}</td></tr>`).join('')}
                </tbody>
            </table>
        `;
    }
};
