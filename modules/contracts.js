export function initContracts(app) {
    const docForm = document.getElementById("form-document");
    if (docForm) {
        docForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const vendorId = document.getElementById("doc-vendor-id").value;
            const type = document.getElementById("doc-type").value;
            const fileName = document.getElementById("doc-file-name").value;
            const size = document.getElementById("doc-file-size").value;

            const vendor = app.state.vendors.find(v => v.id === vendorId);
            const vendorName = vendor ? vendor.name : "Geral";

            const newDoc = {
                id: "doc_" + Date.now(),
                vendorId,
                vendorName,
                type,
                fileName,
                size,
                uploadDate: new Date().toISOString().split('T')[0]
            };

            app.state.documents.push(newDoc);
            
            // Log this action
            app.logAction(`Documento "${type}: ${fileName}" anexado para ${vendorName}`);
            app.saveState();

            document.getElementById("modal-document").classList.remove("active");
            docForm.reset();
            renderContracts(app);
        });
    }
}

export function populateDocumentVendorSelect(app) {
    const select = document.getElementById("doc-vendor-id");
    if (!select) return;
    
    select.innerHTML = "";
    // Only show vendors that are "Fechado" or "Em negociação"
    const relevantVendors = app.state.vendors.filter(v => v.status === "Fechado" || v.status === "Em negociação");
    
    if (relevantVendors.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Nenhum fornecedor qualificado (fechado ou em negociação)";
        select.appendChild(opt);
        return;
    }

    relevantVendors.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v.id;
        opt.textContent = `${v.name} (${v.category})`;
        select.appendChild(opt);
    });
}

export function renderContracts(app) {
    const tableBody = document.getElementById("contracts-table-body");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (app.state.documents.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-light">Nenhum contrato ou comprovante anexado.</td>
            </tr>
        `;
    } else {
        app.state.documents.forEach(doc => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${doc.vendorName}</strong></td>
                <td><span class="badge ${doc.type === 'Contrato' ? 'badge-primary' : doc.type === 'Comprovante' ? 'badge-fechado' : 'badge-pesquisando'}">${doc.type}</span></td>
                <td>${doc.fileName}</td>
                <td>${doc.size}</td>
                <td>${new Date(doc.uploadDate + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td>
                    <button class="btn-icon delete-doc" data-id="${doc.id}"><i data-lucide="trash-2"></i></button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        tableBody.querySelectorAll(".delete-doc").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = e.currentTarget.getAttribute("data-id");
                const doc = app.state.documents.find(d => d.id === id);
                if (confirm(`Excluir documento ${doc ? doc.fileName : ''}?`)) {
                    app.state.documents = app.state.documents.filter(d => d.id !== id);
                    if (doc) app.logAction(`Documento "${doc.fileName}" removido.`);
                    app.saveState();
                    renderContracts(app);
                }
            });
        });
    }

    // Render Installments (payment schedule)
    renderInstallments(app);
    // Render Audit Log
    renderAuditLog(app);

    lucide.createIcons();
}

function renderInstallments(app) {
    const tbody = document.getElementById("installments-table-body");
    if (!tbody) return;

    tbody.innerHTML = "";

    // Generate installments for all "Fechado" contracts if not already present
    // Let's check each vendor with "Fechado" status
    const closedVendors = app.state.vendors.filter(v => v.status === "Fechado");

    closedVendors.forEach(v => {
        // If no payments are registered for this vendor, we auto-create a simple 3-part installment plan
        const existingPayments = app.state.payments.filter(p => p.vendorId === v.id);
        if (existingPayments.length === 0 && v.negotiatedValue > 0) {
            const installmentValue = Math.round(v.negotiatedValue / 3);
            const today = new Date();
            
            for (let i = 1; i <= 3; i++) {
                const dueDate = new Date();
                dueDate.setMonth(today.getMonth() + i);

                app.state.payments.push({
                    id: `pay_${v.id}_${i}`,
                    vendorId: v.id,
                    vendorName: v.name,
                    label: `Parcela ${i}/3`,
                    dueDate: dueDate.toISOString().split('T')[0],
                    amount: i === 3 ? v.negotiatedValue - (installmentValue * 2) : installmentValue, // adjustment for rounding
                    status: "Pendente"
                });
            }
            app.saveState();
        }
    });

    // Render all payments
    if (app.state.payments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-light">Nenhuma parcela cadastrada. Feche um contrato para gerar parcelas automáticas.</td>
            </tr>
        `;
        return;
    }

    // Sort by due date
    const sortedPayments = [...app.state.payments].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    sortedPayments.forEach(p => {
        const tr = document.createElement("tr");
        const formattedDate = new Date(p.dueDate + 'T00:00:00').toLocaleDateString('pt-BR');
        const isPaid = p.status === "Pago";

        tr.innerHTML = `
            <td><strong>${p.vendorName}</strong></td>
            <td>${p.label}</td>
            <td>${formattedDate}</td>
            <td>${app.formatCurrency(p.amount)}</td>
            <td><span class="badge ${isPaid ? 'badge-fechado' : 'badge-recebido'}">${p.status}</span></td>
            <td>
                ${!isPaid ? 
                    `<button class="btn btn-sm btn-primary mark-paid" data-id="${p.id}"><i data-lucide="check"></i> Confirmar Pago</button>` : 
                    `<button class="btn btn-sm btn-secondary mark-unpaid" data-id="${p.id}"><i data-lucide="undo"></i> Estornar</button>`
                }
            </td>
        `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".mark-paid").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            const pay = app.state.payments.find(p => p.id === id);
            if (pay) {
                pay.status = "Pago";
                app.logAction(`Pagamento registrado: ${pay.vendorName} - ${pay.label} (${app.formatCurrency(pay.amount)})`);
                app.saveState();
                app.updateAll();
            }
        });
    });

    tbody.querySelectorAll(".mark-unpaid").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            const pay = app.state.payments.find(p => p.id === id);
            if (pay) {
                pay.status = "Pendente";
                app.logAction(`Estorno de pagamento: ${pay.vendorName} - ${pay.label}`);
                app.saveState();
                app.updateAll();
            }
        });
    });
}

function renderAuditLog(app) {
    const container = document.getElementById("audit-log-container");
    if (!container) return;

    container.innerHTML = "";

    if (app.state.auditLog.length === 0) {
        container.innerHTML = `<li class="empty-list-message">Nenhum histórico disponível.</li>`;
        return;
    }

    // Show latest 10 logs
    const recentLogs = [...app.state.auditLog].reverse().slice(0, 15);

    recentLogs.forEach(log => {
        const li = document.createElement("li");
        li.className = "audit-log-item";
        
        const time = new Date(log.timestamp).toLocaleString('pt-BR');
        
        li.innerHTML = `
            <span>${time}</span>
            <p>${log.action}</p>
        `;
        container.appendChild(li);
    });
}
export function addAuditLog(app, action) {
    app.state.auditLog.push({
        timestamp: new Date().toISOString(),
        action: action
    });
}
