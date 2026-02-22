/**
 * Medicines inventory module
 */
const medicinesModule = {
    medicines: [],

    async init() {
        this.bindEvents();
        await this.fetchMedicines();
    },

    bindEvents() {
        const addForm = document.getElementById('addMedicineForm');
        if (addForm) {
            addForm.addEventListener('submit', (e) => this.handleAddMedicine(e));
        }

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => {
                    this.fetchMedicines(e.target.value);
                }, 500);
            });
        }
    },

    async fetchMedicines(search = '') {
        const tableBody = document.getElementById('medicineTableBody');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-5"><div class="spinner-border text-primary spinner-border-sm"></div> Loading...</td></tr>`;
        }

        try {
            const result = await api.get(`/medicines${search ? `?search=${search}` : ''}`);
            this.medicines = result.data;
            this.renderMedicines(this.medicines);
        } catch (err) {
            console.error(err);
            if (tableBody) tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error loading medicines</td></tr>`;
        }
    },

    renderMedicines(list) {
        const tableBody = document.getElementById('medicineTableBody');
        if (!tableBody) return;

        if (list.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-5 text-muted">No medicines found</td></tr>`;
            return;
        }

        tableBody.innerHTML = list.map(med => {
            const isLowStock = med.quantity <= 10;
            const expiryDate = med.expiry_date ? new Date(med.expiry_date).toLocaleDateString() : 'N/A';
            const imageUrl = med.image_url || 'assets/img/medicine-placeholder.png';

            return `
                <tr>
                    <td class="fw-medium">
                        <div class="d-flex align-items-center gap-2">
                            <img src="${imageUrl}" class="rounded border" style="width: 32px; height: 32px; object-fit: cover;" onerror="this.src='assets/img/medicine-placeholder.png'">
                            ${med.medicine_name}
                        </div>
                    </td>
                    <td><span class="badge bg-light text-dark border">${med.category}</span></td>
                    <td class="small text-muted">${med.manufacturer || '-'}</td>
                    <td class="small">${med.batch_number || '-'}</td>
                    <td class="small">${expiryDate}</td>
                    <td>
                        <span class="badge ${isLowStock ? 'bg-danger bg-opacity-10 text-danger' : 'bg-success bg-opacity-10 text-success'}">
                            ${med.quantity} unit(s)
                        </span>
                    </td>
                    <td class="fw-bold text-primary">₹ ${med.selling_price}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary" onclick="medicinesModule.editMedicine(${med.medicine_id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="medicinesModule.deleteMedicine(${med.medicine_id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async handleAddMedicine(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
            await api.post('/medicines', formData);
            const modal = bootstrap.Modal.getInstance(document.getElementById('addMedicineModal'));
            if (modal) modal.hide();
            e.target.reset();
            this.fetchMedicines();
            api.showNotification("Medicine added successfully");
        } catch (err) {
            api.showNotification("Error adding medicine: " + err.message, "error");
        }
    },

    async deleteMedicine(id) {
        if (await api.confirm("Are you sure you want to delete this medicine?")) {
            try {
                await api.delete(`/medicines/${id}`);
                this.fetchMedicines();
                api.showNotification("Medicine deleted successfully");
            } catch (err) {
                api.showNotification(err.message, "error");
            }
        }
    },

    editMedicine(id) {
        // Edit logic can be added here
        api.showNotification("Edit functionality coming soon for ID: " + id, "info");
    }
};
