import { populateCategorySelects, renderVendors } from "./modules/vendors.js";
import { initComparator, renderComparison, renderDecisionMatrix } from "./modules/comparator.js";
import { initFinance, updateFinanceSummary, calculateGoals } from "./modules/finance.js";
import { initChecklist, renderChecklist, DEFAULT_TASKS } from "./modules/checklist.js";
import { initCalendar, renderCalendar } from "./modules/calendar.js";
import { initContracts, renderContracts, populateDocumentVendorSelect, addAuditLog } from "./modules/contracts.js";
import { initGuests, renderGuests, addGuestTemplateData } from "./modules/guests.js";
import { initExtraFeatures, renderSubTab, seedInspirations } from "./modules/extra-features.js";
import { runAILearning } from "./modules/ai-assistant.js";

// Global App State
class WeddingApp {
    constructor() {
        this.state = {
            weddingDate: "",
            vendors: [],
            tasks: [],
            events: [],
            documents: [],
            payments: [],
            guests: [],
            scores: {}, // ratings for vendors: { vendorId: { price, quality, service, location, benefits } }
            goals: {
                currentSavings: 0,
                monthlySavings: 0,
                monthlyInvestment: 0,
                targetDate: ""
            },
            gifts: [],
            weddingParty: [],
            venues: [],
            inspirations: [],
            auditLog: []
        };

        this.loadState();
        this.initTheme();
        this.initEvents();
        this.initModules();
        this.updateAll();
    }

    // Load state from localStorage
    loadState() {
        const saved = localStorage.getItem("amour_wedding_planner_state");
        if (saved) {
            try {
                this.state = JSON.parse(saved);
            } catch (e) {
                console.error("Erro ao carregar o estado, usando dados vazios.", e);
            }
        } else {
            // Seed initial default state
            this.seedDefaultData();
        }
    }

    // Save state to localStorage
    saveState() {
        localStorage.setItem("amour_wedding_planner_state", JSON.stringify(this.state));
    }

    // Log action to audit trail
    logAction(actionText) {
        addAuditLog(this, actionText);
    }

    // Default Seed Data
    seedDefaultData() {
        // Set wedding date to 6 months from now
        const date = new Date();
        date.setMonth(date.getMonth() + 6);
        this.state.weddingDate = date.toISOString().split('T')[0];

        // Seed tasks
        this.state.tasks = [...DEFAULT_TASKS];

        // Seed some initial vendors
        this.state.vendors = [
            {
                id: "v_photo_1",
                name: "Estúdio Memórias Felizes",
                category: "Fotografia",
                status: "Orçamento recebido",
                budgetValue: 4500,
                negotiatedValue: 0,
                phone: "(11) 98888-7777",
                whatsapp: "11988887777",
                instagram: "@memoriasfelizes",
                website: "https://memoriasfelizes.com",
                quoteDate: new Date().toISOString().split('T')[0],
                priority: "Essencial",
                notes: "Pacote ouro inclui álbum impresso e ensaio pré-wedding."
            },
            {
                id: "v_photo_2",
                name: "Ana Fotos & Filmes",
                category: "Fotografia",
                status: "Em negociação",
                budgetValue: 3800,
                negotiatedValue: 0,
                phone: "(11) 97777-6666",
                whatsapp: "11977776666",
                instagram: "@anafotografia",
                website: "",
                quoteDate: new Date().toISOString().split('T')[0],
                priority: "Essencial",
                notes: "Desconto de 5% para pagamento à vista."
            },
            {
                id: "v_cerimonial_1",
                name: "Assessoria Elegance",
                category: "Cerimonial",
                status: "Fechado",
                budgetValue: 5000,
                negotiatedValue: 4800,
                phone: "(11) 96666-5555",
                whatsapp: "11966665555",
                instagram: "@assessoriaelegance",
                website: "https://assessoriaelegance.com.br",
                quoteDate: new Date().toISOString().split('T')[0],
                priority: "Essencial",
                notes: "Assessoria completa contratada. Ótimo atendimento."
            }
        ];

        // Prepopulate default scores for decision matrix
        this.state.scores = {
            "v_photo_1": { price: 6, quality: 9, service: 8, location: 7, benefits: 8 },
            "v_photo_2": { price: 8, quality: 7, service: 8, location: 8, benefits: 7 }
        };

        // Seed guest list
        addGuestTemplateData(this);

        // Seed inspirations
        seedInspirations(this);

        this.logAction("Sistema inicializado com dados de exemplo.");
        this.saveState();
    }

    // Theme toggling
    initTheme() {
        const toggleBtn = document.getElementById("btn-theme-toggle");
        const html = document.documentElement;
        
        const setMode = (mode) => {
            html.setAttribute("data-theme", mode);
            localStorage.setItem("amour_theme", mode);
            
            const darkIcon = toggleBtn.querySelector(".theme-icon-dark");
            const lightIcon = toggleBtn.querySelector(".theme-icon-light");
            const btnText = toggleBtn.querySelector("span");

            if (mode === "dark") {
                darkIcon.style.display = "none";
                lightIcon.style.display = "inline-block";
                btnText.textContent = "Modo Claro";
            } else {
                darkIcon.style.display = "inline-block";
                lightIcon.style.display = "none";
                btnText.textContent = "Modo Escuro";
            }
        };

        // Load saved theme or default to light
        const savedTheme = localStorage.getItem("amour_theme") || "light";
        setMode(savedTheme);

        toggleBtn.addEventListener("click", () => {
            const current = html.getAttribute("data-theme");
            setMode(current === "dark" ? "light" : "dark");
        });
    }

    // App Events (Tab Switching, Date Picker, Modals)
    initEvents() {
        // Tab switching
        const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
        navItems.forEach(item => {
            item.addEventListener("click", (e) => {
                e.preventDefault();
                const tabId = item.getAttribute("data-tab");
                
                navItems.forEach(nav => nav.classList.remove("active"));
                item.classList.add("active");

                document.querySelectorAll(".tab-pane").forEach(pane => {
                    pane.classList.remove("active");
                });
                document.getElementById(`tab-${tabId}`).classList.add("active");

                // Route custom tab triggers
                this.onTabActivate(tabId);

                // Close mobile sidebar drawer if open
                const sidebar = document.getElementById("app-sidebar");
                const overlay = document.getElementById("sidebar-overlay");
                if (sidebar) sidebar.classList.remove("active");
                if (overlay) overlay.classList.remove("active");
            });
        });

        // Wedding Date picker
        const datePicker = document.getElementById("wedding-date-picker");
        if (datePicker) {
            datePicker.value = this.state.weddingDate;
            datePicker.addEventListener("change", (e) => {
                this.state.weddingDate = e.target.value;
                this.logAction(`Data do casamento alterada para ${e.target.value}`);
                this.saveState();
                this.updateAll();
            });
        }

        // Generic Modal opening
        const modalTriggers = [
            { btn: "btn-add-vendor", modal: "modal-vendor" },
            { btn: "btn-add-task", modal: "modal-task" },
            { btn: "btn-add-event", modal: "modal-event" },
            { btn: "btn-add-document", modal: "modal-document" },
            { btn: "btn-add-guest", modal: "modal-guest" },
            { btn: "btn-add-gift", modal: "modal-gift" },
            { btn: "btn-add-member", modal: "modal-member" },
            { btn: "btn-add-venue", modal: "modal-venue" },
            { btn: "btn-add-inspiration", modal: "modal-inspiration" }
        ];

        modalTriggers.forEach(trigger => {
            const btn = document.getElementById(trigger.btn);
            if (btn) {
                btn.addEventListener("click", () => {
                    if (trigger.modal === "modal-vendor") {
                        document.getElementById("modal-vendor-title").textContent = "Adicionar Fornecedor";
                        document.getElementById("form-vendor").reset();
                        document.getElementById("vendor-id").value = "";
                    }
                    if (trigger.modal === "modal-document") {
                        populateDocumentVendorSelect(this);
                    }
                    document.getElementById(trigger.modal).classList.add("active");
                });
            }
        });

        // Generic Modal closing (cancel button and X button)
        document.querySelectorAll(".modal").forEach(modal => {
            const closeBtn = modal.querySelector(".btn-close-modal");
            const cancelBtn = modal.querySelector(".btn-cancel");

            const closeModal = () => modal.classList.remove("active");

            if (closeBtn) closeBtn.addEventListener("click", closeModal);
            if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
            
            // Close when clicking outside content
            modal.addEventListener("click", (e) => {
                if (e.target === modal) closeModal();
            });
        });

        // Form Submission for Vendor
        const formVendor = document.getElementById("form-vendor");
        if (formVendor) {
            formVendor.addEventListener("submit", (e) => {
                e.preventDefault();
                this.handleVendorSubmit();
            });
        }

        // Search & Filter listeners
        const searchVendor = document.getElementById("search-vendor");
        if (searchVendor) searchVendor.addEventListener("input", () => renderVendors(this));
        
        const filterCat = document.getElementById("filter-vendor-category");
        if (filterCat) filterCat.addEventListener("change", () => renderVendors(this));
        
        const filterStatus = document.getElementById("filter-vendor-status");
        if (filterStatus) filterStatus.addEventListener("change", () => renderVendors(this));

        // Export Button
        const btnExport = document.getElementById("btn-quick-export");
        if (btnExport) {
            btnExport.addEventListener("click", () => {
                this.exportCSV();
            });
        }

        // Mobile Drawer Toggle
        const btnMenu = document.getElementById("btn-mobile-menu");
        const sidebar = document.getElementById("app-sidebar");
        const overlay = document.getElementById("sidebar-overlay");
        
        if (btnMenu && sidebar && overlay) {
            btnMenu.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                sidebar.classList.add("active");
                overlay.classList.add("active");
            });
            overlay.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                sidebar.classList.remove("active");
                overlay.classList.remove("active");
            });
        }
    }

    // Callbacks when a Tab is opened
    onTabActivate(tabId) {
        if (tabId === "vendors") renderVendors(this);
        if (tabId === "comparator") {
            const select = document.getElementById("comparator-category-select");
            renderComparison(this, select.value);
        }
        if (tabId === "decision-center") {
            const select = document.getElementById("decision-category-select");
            renderDecisionMatrix(this, select.value);
        }
        if (tabId === "finance") updateFinanceSummary(this);
        if (tabId === "goals") {
            // Fill form values if present
            if (this.state.goals) {
                document.getElementById("goal-current-savings").value = this.state.goals.currentSavings || 0;
                document.getElementById("goal-monthly-savings").value = this.state.goals.monthlySavings || 0;
                document.getElementById("goal-monthly-investment").value = this.state.goals.monthlyInvestment || 0;
                document.getElementById("goal-target-date").value = this.state.goals.targetDate || this.state.weddingDate;
            }
            calculateGoals(this);
        }
        if (tabId === "checklist") {
            const activePeriodBtn = document.querySelector(".period-btn.active");
            renderChecklist(this, activePeriodBtn ? activePeriodBtn.getAttribute("data-period") : "all");
        }
        if (tabId === "calendar") renderCalendar(this);
        if (tabId === "contracts") renderContracts(this);
        if (tabId === "guests") renderGuests(this);
        if (tabId === "ai-assistant") runAILearning(this);
        if (tabId === "extras") {
            const activeSubTabBtn = document.querySelector(".sub-tab-btn.active");
            renderSubTab(this, activeSubTabBtn ? activeSubTabBtn.getAttribute("data-subtab") : "gifts");
        }
    }

    // Init module hooks
    initModules() {
        populateCategorySelects();
        initComparator(this);
        initFinance(this);
        initChecklist(this);
        initCalendar(this);
        initContracts(this);
        initGuests(this);
        initExtraFeatures(this);
    }

    // Handle Vendor Form Submission
    handleVendorSubmit() {
        const id = document.getElementById("vendor-id").value;
        const name = document.getElementById("vendor-name").value;
        const category = document.getElementById("vendor-category").value;
        const status = document.getElementById("vendor-status").value;
        const budgetValue = parseFloat(document.getElementById("vendor-budget-value").value) || 0;
        const negotiatedValue = parseFloat(document.getElementById("vendor-negotiated-value").value) || 0;
        const phone = document.getElementById("vendor-phone").value;
        const whatsapp = document.getElementById("vendor-whatsapp").value;
        const instagram = document.getElementById("vendor-instagram").value;
        const website = document.getElementById("vendor-website").value;
        const quoteDate = document.getElementById("vendor-quote-date").value;
        const priority = document.getElementById("vendor-priority").value;
        const notes = document.getElementById("vendor-notes").value;

        if (id) {
            // Edit existing
            const index = this.state.vendors.findIndex(v => v.id === id);
            if (index !== -1) {
                const oldStatus = this.state.vendors[index].status;
                this.state.vendors[index] = {
                    id, name, category, status, budgetValue, negotiatedValue,
                    phone, whatsapp, instagram, website, quoteDate, priority, notes
                };
                
                // If status changed to Fechado, trigger payment generation
                if (oldStatus !== "Fechado" && status === "Fechado") {
                    this.state.payments = this.state.payments.filter(p => p.vendorId !== id); // clean
                }
                this.logAction(`Fornecedor "${name}" atualizado.`);
            }
        } else {
            // Create new
            const newVendor = {
                id: "v_" + Date.now(),
                name, category, status, budgetValue, negotiatedValue,
                phone, whatsapp, instagram, website, quoteDate, priority, notes
            };
            this.state.vendors.push(newVendor);
            this.logAction(`Novo fornecedor "${name}" adicionado.`);
        }

        this.saveState();
        document.getElementById("modal-vendor").classList.remove("active");
        document.getElementById("form-vendor").reset();
        
        this.updateAll();
        renderVendors(this);
    }

    // Update global elements and numbers across modules
    updateAll() {
        // Update Countdown
        this.updateCountdown();

        // Update Finance Calculations
        updateFinanceSummary(this);

        // Update Dashboard Specific Fields
        const dashDate = document.getElementById("dash-wedding-date");
        if (dashDate) {
            if (this.state.weddingDate) {
                const wDate = new Date(this.state.weddingDate + 'T00:00:00');
                dashDate.textContent = wDate.toLocaleDateString('pt-BR');
            } else {
                dashDate.textContent = "Definir data";
            }
        }

        // Render dashboard upcoming activities
        this.renderDashboardActivities();

        // Run AI diagnosis to keep dashboard health score accurate
        runAILearning(this);
    }

    updateCountdown() {
        if (!this.state.weddingDate) return;
        const today = new Date();
        const wedding = new Date(this.state.weddingDate + 'T00:00:00');
        const diffTime = wedding - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const countdownEl = document.getElementById("countdown-days");
        const countdownDetail = document.getElementById("dash-countdown-details");
        
        if (countdownEl) {
            if (diffDays > 0) {
                countdownEl.textContent = String(diffDays).padStart(3, '0');
                if (countdownDetail) countdownDetail.textContent = `Faltam ${diffDays} dias`;
            } else if (diffDays === 0) {
                countdownEl.textContent = "HOJE";
                if (countdownDetail) countdownDetail.textContent = "É o grande dia!";
            } else {
                countdownEl.textContent = "---";
                if (countdownDetail) countdownDetail.textContent = `Ocorreu há ${Math.abs(diffDays)} dias`;
            }
        }

        const mobileCountdownEl = document.getElementById("mobile-countdown-days");
        if (mobileCountdownEl) {
            if (diffDays > 0) {
                mobileCountdownEl.textContent = String(diffDays);
            } else if (diffDays === 0) {
                mobileCountdownEl.textContent = "HOJE";
            } else {
                mobileCountdownEl.textContent = "---";
            }
        }
    }

    renderDashboardActivities() {
        const list = document.getElementById("dash-activities-list");
        if (!list) return;

        list.innerHTML = "";

        // Collect next 3 items: either pending tasks or upcoming calendar events
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Upcoming events
        const upcomingEvents = this.state.events
            .filter(e => e.date >= todayStr)
            .map(e => ({ type: "event", title: e.title, date: e.date, typeLabel: e.type }));

        // Pending high-priority tasks
        const pendingTasks = this.state.tasks
            .filter(t => !t.completed && t.dueDate && t.dueDate >= todayStr)
            .map(t => ({ type: "task", title: t.title, date: t.dueDate, typeLabel: "Tarefa" }));

        const combined = [...upcomingEvents, ...pendingTasks]
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 3);

        if (combined.length === 0) {
            list.innerHTML = `<li class="empty-list-message">Sem atividades pendentes ou urgentes para os próximos dias.</li>`;
            return;
        }

        combined.forEach(item => {
            const li = document.createElement("li");
            const dateObj = new Date(item.date + 'T00:00:00');
            const formattedDate = dateObj.toLocaleDateString('pt-BR');
            
            li.innerHTML = `
                <div class="activity-icon">
                    <i data-lucide="${item.type === 'event' ? 'calendar' : 'check-square'}"></i>
                </div>
                <div class="activity-details">
                    <h5>${item.title}</h5>
                    <span>${item.typeLabel}</span>
                </div>
                <div class="activity-meta">${formattedDate}</div>
            `;
            list.appendChild(li);
        });
        lucide.createIcons();
    }

    // Helpers
    formatCurrency(val) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    }

    // Export Excel (CSV)
    exportCSV() {
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += "Fornecedor;Categoria;Status;Valor Orçado;Valor Negociado;Prioridade;Telefone\r\n";

        this.state.vendors.forEach(v => {
            const row = `"${v.name}";"${v.category}";"${v.status}";"${v.budgetValue}";"${v.negotiatedValue}";"${v.priority}";"${v.phone || ''}"`;
            csvContent += row + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Planejamento_Casamento_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Initialise App
window.addEventListener("DOMContentLoaded", () => {
    window.app = new WeddingApp();
});
