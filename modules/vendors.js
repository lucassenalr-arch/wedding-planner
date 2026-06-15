// Categoria de fornecedores pré-definidas
export const CATEGORIES = [
    "Fotografia", "Filmagem", "Cerimonial", "Decoração", "Buffet", 
    "Doces", "Bolo", "Espaço", "Música/Banda", "DJ", 
    "Vestido", "Traje do Noivo", "Convites", "Lua de Mel", 
    "Transporte", "Beleza e Maquiagem", "Outros"
];

export const STATUS_LIST = [
    "Pesquisando", "Orçamento recebido", "Em negociação", "Fechado", "Cancelado"
];

export function renderVendors(app) {
    const container = document.getElementById("vendors-list-container");
    if (!container) return;

    const searchQuery = document.getElementById("search-vendor").value.toLowerCase();
    const categoryFilter = document.getElementById("filter-vendor-category").value;
    const statusFilter = document.getElementById("filter-vendor-status").value;

    container.innerHTML = "";

    const filtered = app.state.vendors.filter(vendor => {
        const matchesSearch = vendor.name.toLowerCase().includes(searchQuery) || 
                              (vendor.notes && vendor.notes.toLowerCase().includes(searchQuery));
        const matchesCategory = !categoryFilter || vendor.category === categoryFilter;
        const matchesStatus = !statusFilter || vendor.status === statusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-span-4 empty-state" style="grid-column: 1 / -1;">
                <i data-lucide="users-2"></i>
                <h3>Nenhum fornecedor encontrado</h3>
                <p>Cadastre um novo fornecedor ou ajuste os filtros.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    filtered.forEach(vendor => {
        const card = document.createElement("div");
        card.className = "vendor-card";
        
        const formattedBudget = app.formatCurrency(vendor.budgetValue);
        const formattedNegotiated = app.formatCurrency(vendor.negotiatedValue);
        
        let statusBadgeClass = `badge-${vendor.status.toLowerCase().replace("ç", "c").replace("ã", "a").replace(" ", "-")}`;
        
        card.innerHTML = `
            <div class="vendor-card-header">
                <span class="vendor-category-tag">${vendor.category}</span>
                <div class="vendor-card-actions">
                    <button class="btn-icon edit-vendor" data-id="${vendor.id}"><i data-lucide="edit-3"></i></button>
                    <button class="btn-icon text-danger delete-vendor" data-id="${vendor.id}"><i data-lucide="trash-2"></i></button>
                </div>
            </div>
            <div class="vendor-title-section">
                <h3>${vendor.name}</h3>
                <span class="vendor-priority-tag ${getPriorityClass(vendor.priority)}">${vendor.priority || 'Importante'}</span>
            </div>
            <div class="vendor-details-list">
                ${vendor.phone ? `<div class="vendor-detail-item"><i data-lucide="phone"></i> <span>${vendor.phone}</span></div>` : ''}
                ${vendor.whatsapp ? `<div class="vendor-detail-item"><i data-lucide="message-square"></i> <a href="https://wa.me/${vendor.whatsapp.replace(/\D/g, '')}" target="_blank">WhatsApp</a></div>` : ''}
                ${vendor.instagram ? `<div class="vendor-detail-item"><i data-lucide="instagram"></i> <a href="https://instagram.com/${vendor.instagram.replace('@', '')}" target="_blank">${vendor.instagram}</a></div>` : ''}
                ${vendor.website ? `<div class="vendor-detail-item"><i data-lucide="globe"></i> <a href="${vendor.website}" target="_blank">Website</a></div>` : ''}
                ${vendor.notes ? `<div class="vendor-detail-item"><i data-lucide="file-text"></i> <span>${vendor.notes}</span></div>` : ''}
            </div>
            <div class="vendor-financials">
                <div class="vendor-fin-item">
                    <span>Orçado</span>
                    <strong>${formattedBudget}</strong>
                </div>
                <div class="vendor-fin-item">
                    <span>Fechado</span>
                    <strong class="${vendor.status === 'Fechado' ? 'text-success' : ''}">${formattedNegotiated}</strong>
                </div>
            </div>
            <div class="vendor-status-bar">
                <span>Status:</span>
                <span class="badge ${statusBadgeClass}">${vendor.status}</span>
            </div>
        `;
        container.appendChild(card);
    });

    // Wire up event listeners
    container.querySelectorAll(".edit-vendor").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            openEditVendorModal(app, id);
        });
    });

    container.querySelectorAll(".delete-vendor").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            if (confirm("Tem certeza que deseja excluir este fornecedor?")) {
                app.state.vendors = app.state.vendors.filter(v => v.id !== id);
                app.saveState();
                app.updateAll();
            }
        });
    });

    lucide.createIcons();
}

function getPriorityClass(priority) {
    if (priority === "Essencial") return "essential";
    if (priority === "Desejável") return "desirable";
    return "important";
}

export function populateCategorySelects() {
    const selects = ["vendor-category", "filter-vendor-category", "comparator-category-select", "decision-category-select"];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        
        // Save initial option if it exists (like "Todas as Categorias" or "Selecione...")
        const firstOption = select.options[0];
        select.innerHTML = "";
        if (firstOption) select.appendChild(firstOption);
        
        CATEGORIES.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat;
            opt.textContent = cat;
            select.appendChild(opt);
        });
    });
}

function openEditVendorModal(app, id) {
    const vendor = app.state.vendors.find(v => v.id === id);
    if (!vendor) return;

    document.getElementById("modal-vendor-title").textContent = "Editar Fornecedor";
    document.getElementById("vendor-id").value = vendor.id;
    document.getElementById("vendor-name").value = vendor.name;
    document.getElementById("vendor-category").value = vendor.category;
    document.getElementById("vendor-status").value = vendor.status;
    document.getElementById("vendor-budget-value").value = vendor.budgetValue;
    document.getElementById("vendor-negotiated-value").value = vendor.negotiatedValue;
    document.getElementById("vendor-phone").value = vendor.phone || "";
    document.getElementById("vendor-whatsapp").value = vendor.whatsapp || "";
    document.getElementById("vendor-instagram").value = vendor.instagram || "";
    document.getElementById("vendor-website").value = vendor.website || "";
    document.getElementById("vendor-quote-date").value = vendor.quoteDate || "";
    document.getElementById("vendor-priority").value = vendor.priority || "Importante";
    document.getElementById("vendor-notes").value = vendor.notes || "";

    document.getElementById("modal-vendor").classList.add("active");
}
