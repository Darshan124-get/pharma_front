/**
 * Billing module for POS operations
 */
const billingModule = {
    cart: [],
    allMedicines: [],

    async init() {
        this.bindEvents();
        await this.loadInitialData();
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
    },

    bindEvents() {
        const medSearch = document.getElementById('medSearch');
        if (medSearch) {
            medSearch.addEventListener('input', (e) => {
                const search = e.target.value.toLowerCase();
                const filtered = this.allMedicines.filter(m =>
                    m.medicine_name.toLowerCase().includes(search) ||
                    (m.barcode && m.barcode.includes(search))
                );
                this.renderSearchResults(filtered);
            });
        }

        const discountInput = document.getElementById('discountInput');
        if (discountInput) {
            discountInput.addEventListener('input', () => this.renderCart());
        }

        const generateBtn = document.getElementById('generateBillBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.handleGenerateBill());
        }
    },

    async loadInitialData() {
        try {
            const result = await api.get('/medicines');
            this.allMedicines = result.data;
            this.renderSearchResults(this.allMedicines);
        } catch (err) {
            console.error("Error loading medicines:", err);
        }
    },

    updateTime() {
        const el = document.getElementById('currentTime');
        if (el) {
            el.textContent = new Date().toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'medium'
            });
        }
    },

    renderSearchResults(list) {
        const body = document.getElementById('searchTableBody');
        if (!body) return;
        body.innerHTML = list.map(med => `
            <tr>
                <td>
                    <div class="fw-medium">${med.medicine_name}</div>
                    <div class="x-small text-muted">${med.category}</div>
                </td>
                <td class="small">${med.batch_number || '-'}</td>
                <td>
                    <span class="badge ${med.quantity <= 10 ? 'bg-danger bg-opacity-10 text-danger' : 'bg-success bg-opacity-10 text-success'}">
                        ${med.quantity} unit
                    </span>
                </td>
                <td class="small">${med.expiry_date ? new Date(med.expiry_date).toLocaleDateString() : '-'}</td>
                <td class="fw-bold">₹ ${med.selling_price}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-primary" ${med.quantity <= 0 ? 'disabled' : ''} onclick="billingModule.addToCart(${med.medicine_id})">
                        <i class="fas fa-plus"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    addToCart(medId) {
        const med = this.allMedicines.find(m => m.medicine_id === medId);
        const existing = this.cart.find(item => item.medicine_id === medId);

        if (existing) {
            if (existing.qty < med.quantity) {
                existing.qty++;
            } else {
                api.showNotification('Maximum stock limit reached in cart', 'warning');
            }
        } else {
            this.cart.push({ ...med, qty: 1 });
        }
        this.renderCart();
    },

    updateQty(id, delta) {
        const item = this.cart.find(i => i.medicine_id === id);
        const med = this.allMedicines.find(m => m.medicine_id === id);

        if (item) {
            const newQty = item.qty + delta;
            if (newQty > 0 && newQty <= med.quantity) {
                item.qty = newQty;
            } else if (newQty === 0) {
                this.cart = this.cart.filter(i => i.medicine_id !== id);
            }
        }
        this.renderCart();
    },

    renderCart() {
        const container = document.getElementById('cartItems');
        const cartCount = document.getElementById('cartCount');
        if (!container) return;

        cartCount.textContent = this.cart.length;

        if (this.cart.length === 0) {
            container.innerHTML = '<div class="text-center py-5 text-muted"><i class="fas fa-shopping-basket fa-3x mb-3 opacity-25"></i><p>Cart is empty</p></div>';
            this.updateSummary(0, 0);
            return;
        }

        container.innerHTML = this.cart.map(item => `
            <div class="mb-3 p-2 border-bottom">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="fw-medium small">${item.medicine_name}</div>
                    <div class="fw-bold small text-primary">₹ ${(item.selling_price * item.qty).toFixed(2)}</div>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-secondary" onclick="billingModule.updateQty(${item.medicine_id}, -1)">-</button>
                        <span class="btn border-secondary-subtle px-3 fw-bold bg-light">${item.qty}</span>
                        <button class="btn btn-outline-secondary" onclick="billingModule.updateQty(${item.medicine_id}, 1)">+</button>
                    </div>
                    <div class="x-small text-muted">@ ₹ ${item.selling_price} + ${item.gst_percent}% GST</div>
                </div>
            </div>
        `).join('');

        let total = 0;
        let gst = 0;
        this.cart.forEach(item => {
            const itemTotal = item.selling_price * item.qty;
            total += itemTotal;
            gst += (itemTotal * item.gst_percent) / 100;
        });

        this.updateSummary(total, gst);
    },

    updateSummary(total, gst) {
        const discInput = document.getElementById('discountInput');
        const disc = discInput ? (parseFloat(discInput.value) || 0) : 0;
        const final = (total + gst) - disc;

        document.getElementById('summaryTotal').textContent = `₹ ${total.toFixed(2)}`;
        document.getElementById('summaryGST').textContent = `₹ ${gst.toFixed(2)}`;
        document.getElementById('finalTotal').textContent = `₹ ${Math.max(0, final).toFixed(2)}`;
    },

    async clearCart() {
        if (await api.confirm("Clear current cart?")) {
            this.cart = [];
            this.renderCart();
        }
    },

    async handleGenerateBill() {
        if (this.cart.length === 0) {
            api.showNotification("Please add items to cart", "warning");
            return;
        }

        const payload = {
            customer: {
                customer_name: document.getElementById('custName').value || 'Walk-in Customer',
                phone: document.getElementById('custPhone').value
            },
            items: this.cart.map(i => ({
                medicine_id: i.medicine_id,
                quantity: i.qty
            })),
            discount: parseFloat(document.getElementById('discountInput').value) || 0,
            payment_method: 'cash'
        };

        const btn = document.getElementById('generateBillBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing...';

        try {
            const result = await api.post('/bills', payload);
            if (result.success) {
                api.showNotification(`Bill #${result.data.bill_number} generated successfully!`);
                this.cart = [];
                this.renderCart();
                await this.loadInitialData(); // Refresh stock
            }
        } catch (err) {
            api.showNotification("Billing Error: " + err.message, "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'FINALIZE';
        }
    }
};
