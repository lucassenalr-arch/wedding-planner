let evolutionChart = null;

export function initFinance(app) {
    const form = document.getElementById("form-goals");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            calculateGoals(app);
        });
    }

    const dateSlider = document.getElementById("date-simulator-range");
    if (dateSlider) {
        dateSlider.addEventListener("input", () => {
            updateDateSimulation(app);
        });
    }

    const finSavingsInput = document.getElementById("fin-current-savings");
    if (finSavingsInput) {
        finSavingsInput.addEventListener("input", (e) => {
            const val = parseFloat(e.target.value) || 0;
            if (!app.state.goals) app.state.goals = {};
            app.state.goals.currentSavings = val;

            // Sync with goals tab
            const goalSavingsInput = document.getElementById("goal-current-savings");
            if (goalSavingsInput) {
                goalSavingsInput.value = val;
            }

            app.saveState();
            calculateGoals(app);
            app.updateAll();
        });
    }
}

export function updateFinanceSummary(app) {
    let totalBudget = 0;
    let closedContracts = 0;
    let pendingContracts = 0;
    let totalPaid = 0;
    let closedCount = 0;

    // We can default categories to have a budget estimate or just sum the ones in our database.
    // If no vendor exists for a category, we assume it's pending.
    // Let's first compute from existing vendors.
    app.state.vendors.forEach(v => {
        const val = v.negotiatedValue || v.budgetValue || 0;
        totalBudget += val;
        
        if (v.status === "Fechado") {
            closedContracts += v.negotiatedValue || 0;
            closedCount++;
        } else if (v.status !== "Cancelado") {
            pendingContracts += v.budgetValue || 0;
        }
    });

    // Also get total paid from registered contract payments/installments
    app.state.payments.forEach(p => {
        if (p.status === "Pago") {
            totalPaid += p.amount;
        }
    });

    const balanceDue = Math.max(0, closedContracts - totalPaid);

    // Update Finance Tab UI elements
    const elements = {
        "fin-total-budget": totalBudget,
        "fin-closed-contracts": closedContracts,
        "fin-pending-contracts": pendingContracts,
        "fin-total-paid": totalPaid,
        "fin-balance-due": balanceDue,
        "quick-total-budget": totalBudget,
        "quick-total-paid": totalPaid
    };

    for (const [id, val] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = app.formatCurrency(val);
    }

    // Sync the "Valor Guardado" input value
    const finSavingsInput = document.getElementById("fin-current-savings");
    if (finSavingsInput && app.state.goals && document.activeElement !== finSavingsInput) {
        finSavingsInput.value = app.state.goals.currentSavings || 0;
    }

    const closedCountEl = document.getElementById("fin-closed-count");
    if (closedCountEl) {
        closedCountEl.textContent = `${closedCount} contratos fechados`;
    }

    const paidPctEl = document.getElementById("fin-paid-percentage");
    if (paidPctEl && closedContracts > 0) {
        const pct = ((totalPaid / closedContracts) * 100).toFixed(0);
        paidPctEl.textContent = `${pct}% do valor fechado pago`;
    } else if (paidPctEl) {
        paidPctEl.textContent = "0% pago";
    }

    // Update Progress Bar in header
    const totalTasks = app.state.tasks.length;
    const completedTasks = app.state.tasks.filter(t => t.completed).length;
    const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const progressFill = document.getElementById("quick-progress-fill");
    const progressText = document.getElementById("quick-progress-text");
    if (progressFill) progressFill.style.width = `${progressPct}%`;
    if (progressText) progressText.textContent = `${progressPct}%`;

    // Render Charts
    renderFinanceCharts(app);
}

function renderFinanceCharts(app) {
    // Gastos por Categoria Chart
    const ctxCategory = document.getElementById("chart-finance-categories");
    if (ctxCategory) {
        const categoriesMap = {};
        app.state.vendors.forEach(v => {
            if (v.status !== "Cancelado") {
                categoriesMap[v.category] = (categoriesMap[v.category] || 0) + (v.negotiatedValue || v.budgetValue || 0);
            }
        });

        const labels = Object.keys(categoriesMap);
        const data = Object.values(categoriesMap);

        if (window.financeCategoryChart) window.financeCategoryChart.destroy();

        window.financeCategoryChart = new Chart(ctxCategory, {
            type: 'bar',
            data: {
                labels: labels.length ? labels : ["Nenhum"],
                datasets: [{
                    label: 'Gasto por Categoria (R$)',
                    data: data.length ? data : [0],
                    backgroundColor: 'rgba(191, 161, 129, 0.7)',
                    borderColor: '#bfa181',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    // Proporção de Custos Chart (Fechados vs Pendentes)
    const ctxDist = document.getElementById("chart-finance-distribution");
    if (ctxDist) {
        let closed = 0;
        let pending = 0;
        app.state.vendors.forEach(v => {
            if (v.status === "Fechado") closed += v.negotiatedValue;
            else if (v.status !== "Cancelado") pending += v.budgetValue;
        });

        if (window.financeDistChart) window.financeDistChart.destroy();

        window.financeDistChart = new Chart(ctxDist, {
            type: 'doughnut',
            data: {
                labels: ['Contratos Fechados', 'Previsão Não Fechados'],
                datasets: [{
                    data: [closed, pending],
                    backgroundColor: ['#6e9a7e', '#d99c43'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // Also render on dashboard if canvas exists
        const ctxDash = document.getElementById("chart-dashboard-finance");
        if (ctxDash) {
            if (window.dashFinanceChart) window.dashFinanceChart.destroy();
            window.dashFinanceChart = new Chart(ctxDash, {
                type: 'doughnut',
                data: {
                    labels: ['Fechados', 'Pendentes'],
                    datasets: [{
                        data: [closed, pending],
                        backgroundColor: ['#bfa181', '#2b3147'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }
    }
}

export function calculateGoals(app) {
    const targetDateInput = document.getElementById("goal-target-date");
    const targetDateVal = targetDateInput ? targetDateInput.value : "";

    if (!targetDateVal) {
        const activeTab = document.querySelector(".nav-item.active")?.getAttribute("data-tab") || "";
        if (activeTab === "goals") {
            alert("Por favor, selecione a data do casamento.");
        }
        return;
    }

    const currentSavings = parseFloat(document.getElementById("goal-current-savings").value) || 0;
    const monthlySavings = parseFloat(document.getElementById("goal-monthly-savings").value) || 0;
    const monthlyInvestment = parseFloat(document.getElementById("goal-monthly-investment").value) || 0;

    // Save goal preferences
    app.state.goals = {
        currentSavings,
        monthlySavings,
        monthlyInvestment,
        targetDate: targetDateVal
    };
    app.saveState();

    const targetDate = new Date(targetDateVal);
    const today = new Date();
    
    // Calculate months difference
    const monthsRemaining = Math.max(1, (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth()));
    
    // Total budget of the wedding
    let totalNeeded = 0;
    app.state.vendors.forEach(v => {
        if (v.status !== "Cancelado") {
            totalNeeded += v.negotiatedValue || v.budgetValue || 0;
        }
    });

    const netNeeded = Math.max(0, totalNeeded - currentSavings);
    const requiredMonthly = (netNeeded / monthsRemaining);

    // Update status card
    const statusCard = document.getElementById("goal-status-card");
    const statusBadge = document.getElementById("goal-status-badge");
    const statusTitle = document.getElementById("goal-status-title");
    const statusDesc = document.getElementById("goal-status-description");

    const totalSavedByTarget = currentSavings + (monthlySavings * monthsRemaining);

    if (totalSavedByTarget >= totalNeeded) {
        statusCard.className = "card result-card text-center success-bg";
        statusBadge.innerHTML = '<i data-lucide="check-circle" class="text-success" style="width: 32px; height: 32px;"></i>';
        statusTitle.textContent = "Meta Atingível!";
        statusTitle.className = "text-success";
        statusDesc.textContent = `No ritmo atual, você juntará ${app.formatCurrency(totalSavedByTarget)} até o casamento, o que cobre o orçamento de ${app.formatCurrency(totalNeeded)}.`;
    } else {
        statusCard.className = "card result-card text-center danger-bg";
        statusBadge.innerHTML = '<i data-lucide="alert-circle" class="text-danger" style="width: 32px; height: 32px;"></i>';
        statusTitle.textContent = "Atenção: Meta não atingida";
        statusTitle.className = "text-danger";
        statusDesc.innerHTML = `No ritmo atual, você acumulará ${app.formatCurrency(totalSavedByTarget)}. Faltam <strong>${app.formatCurrency(totalNeeded - totalSavedByTarget)}</strong>. É necessário economizar <strong>${app.formatCurrency(requiredMonthly)}</strong> por mês.`;
    }

    // Calculations for scenarios (Future Value of annuity)
    // Monthly interest rates (approximate)
    const rateCons = 0.06 / 12; // 6% annual / 12
    const rateReal = 0.105 / 12; // 10.5% annual / 12
    const rateOpt = 0.14 / 12; // 14% annual / 12

    const fvCons = calculateFV(currentSavings, monthlyInvestment + monthlySavings, rateCons, monthsRemaining);
    const fvReal = calculateFV(currentSavings, monthlyInvestment + monthlySavings, rateReal, monthsRemaining);
    const fvOpt = calculateFV(currentSavings, monthlyInvestment + monthlySavings, rateOpt, monthsRemaining);

    document.getElementById("scenario-cons-total").textContent = app.formatCurrency(fvCons);
    document.getElementById("scenario-cons-status").textContent = fvCons >= totalNeeded ? "Meta Atingida" : "Abaixo da Meta";
    document.getElementById("scenario-cons-status").className = fvCons >= totalNeeded ? "text-success" : "text-danger";

    document.getElementById("scenario-real-total").textContent = app.formatCurrency(fvReal);
    document.getElementById("scenario-real-status").textContent = fvReal >= totalNeeded ? "Meta Atingida" : "Abaixo da Meta";
    document.getElementById("scenario-real-status").className = fvReal >= totalNeeded ? "text-success" : "text-danger";

    document.getElementById("scenario-opt-total").textContent = app.formatCurrency(fvOpt);
    document.getElementById("scenario-opt-status").textContent = fvOpt >= totalNeeded ? "Meta Atingida" : "Abaixo da Meta";
    document.getElementById("scenario-opt-status").className = fvOpt >= totalNeeded ? "text-success" : "text-danger";

    renderEvolutionChart(currentSavings, monthlySavings + monthlyInvestment, monthsRemaining, rateReal, totalNeeded);
    lucide.createIcons();
}

function calculateFV(pv, pmt, rate, nper) {
    // FV = PV*(1+r)^n + PMT * [((1+r)^n - 1) / r]
    const compInterest = pv * Math.pow(1 + rate, nper);
    const annuity = pmt * ((Math.pow(1 + rate, nper) - 1) / rate);
    return compInterest + annuity;
}

function renderEvolutionChart(pv, pmt, months, rate, targetValue) {
    const ctx = document.getElementById("chart-goals-evolution").getContext("2d");
    if (evolutionChart) evolutionChart.destroy();

    const labels = [];
    const dataPoints = [];
    const targetPoints = [];

    for (let i = 0; i <= months; i++) {
        labels.push(`Mês ${i}`);
        dataPoints.push(Math.round(calculateFV(pv, pmt, rate, i)));
        targetPoints.push(targetValue);
    }

    evolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Patrimônio Estimado (Realista)',
                    data: dataPoints,
                    borderColor: '#bfa181',
                    backgroundColor: 'rgba(191, 161, 129, 0.1)',
                    fill: true,
                    tension: 0.1
                },
                {
                    label: 'Meta de Custo (Casamento)',
                    data: targetPoints,
                    borderColor: '#c35c5c',
                    borderDash: [5, 5],
                    fill: false,
                    pointStyle: 'none',
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function updateDateSimulation(app) {
    const monthsOffset = parseInt(document.getElementById("date-simulator-range").value);
    document.getElementById("date-sim-months-display").textContent = `${monthsOffset >= 0 ? '+' : ''}${monthsOffset} meses`;

    const baseDateVal = document.getElementById("goal-target-date").value || app.state.weddingDate;
    if (!baseDateVal) return;

    const baseDate = new Date(baseDateVal);
    baseDate.setMonth(baseDate.getMonth() + monthsOffset);

    // Format new date
    const formattedDate = baseDate.toLocaleDateString('pt-BR');
    document.getElementById("sim-date-result").textContent = formattedDate;

    // Recalculate monthly needed
    const today = new Date();
    const monthsRemaining = Math.max(1, (baseDate.getFullYear() - today.getFullYear()) * 12 + (baseDate.getMonth() - today.getMonth()));

    let totalNeeded = 0;
    app.state.vendors.forEach(v => {
        if (v.status !== "Cancelado") {
            totalNeeded += v.negotiatedValue || v.budgetValue || 0;
        }
    });

    const currentSavings = app.state.goals?.currentSavings || 0;
    const netNeeded = Math.max(0, totalNeeded - currentSavings);
    const requiredMonthly = (netNeeded / monthsRemaining);

    document.getElementById("sim-monthly-required").textContent = app.formatCurrency(requiredMonthly);
}
