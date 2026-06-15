export function runAILearning(app) {
    const savingsList = document.getElementById("ai-savings-list");
    const risksList = document.getElementById("ai-risks-list");
    const tasksList = document.getElementById("ai-tasks-list");

    if (!savingsList || !risksList || !tasksList) return;

    // Reset lists
    savingsList.innerHTML = "";
    risksList.innerHTML = "";
    tasksList.innerHTML = "";

    // Pull variables from state
    const vendors = app.state.vendors;
    const tasks = app.state.tasks;
    const goals = app.state.goals || { currentSavings: 0, monthlySavings: 0, monthlyInvestment: 0, targetDate: "" };

    let totalBudget = 0;
    let closedContracts = 0;
    let pendingContracts = 0;
    let categoriesClosed = [];
    let categoriesNotClosed = [];

    vendors.forEach(v => {
        const val = v.negotiatedValue || v.budgetValue || 0;
        if (v.status !== "Cancelado") {
            totalBudget += val;
            if (v.status === "Fechado") {
                closedContracts += v.negotiatedValue;
                categoriesClosed.push(v.category);
            } else {
                pendingContracts += v.budgetValue;
                categoriesNotClosed.push(v.category);
            }
        }
    });

    // --- 1. HEALTH SCORE CALCULATION ---
    let score = 100;
    let reasons = [];

    // Factor A: Budget Overrun
    let maxBudgetGoal = 50000; // default target
    if (goals.currentSavings > 0) {
        // Assume target is what they can reasonably save plus current savings
        const today = new Date();
        const target = goals.targetDate ? new Date(goals.targetDate) : new Date();
        const months = Math.max(1, (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth()));
        maxBudgetGoal = goals.currentSavings + ((goals.monthlySavings + goals.monthlyInvestment) * months);
    }

    if (totalBudget > maxBudgetGoal) {
        const overrun = totalBudget - maxBudgetGoal;
        const penalty = Math.min(35, Math.round((overrun / maxBudgetGoal) * 100));
        score -= penalty;
        reasons.push(`Orçamento estimado (${app.formatCurrency(totalBudget)}) excede a capacidade de poupança acumulada até o casamento (${app.formatCurrency(maxBudgetGoal)}).`);
    }

    // Factor B: Task Progress
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const taskRatio = totalTasks > 0 ? completedTasks / totalTasks : 1;
    if (taskRatio < 0.5) {
        const penalty = Math.round((0.5 - taskRatio) * 30);
        score -= penalty;
        reasons.push("Menos de 50% das tarefas do checklist foram concluídas.");
    }

    // Factor C: Savings Gap
    if (goals.targetDate) {
        const today = new Date();
        const target = new Date(goals.targetDate);
        const months = Math.max(1, (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth()));
        const netNeeded = Math.max(0, totalBudget - goals.currentSavings);
        const currentAccumulation = (goals.monthlySavings + goals.monthlyInvestment) * months;
        if (currentAccumulation < netNeeded) {
            score -= 15;
            reasons.push("O ritmo de poupança atual não será suficiente para cobrir os gastos até a data estipulada.");
        }
    }

    score = Math.max(10, Math.min(100, score));

    // Update gauge and texts on dashboard
    updateDashboardGauge(score, reasons);

    // --- 2. RECOMMEND ECONOMIES (Savings List) ---
    const savingsSuggestions = [];

    if (categoriesNotClosed.includes("Decoração")) {
        savingsSuggestions.push({
            icon: "flower-2",
            text: "<strong>Decoração:</strong> Priorize flores da estação e folhagens para os arranjos. Evite excesso de arranjos suspensos, que exigem estruturas caras de montagem. Economia estimada: 15% a 25%."
        });
    }
    if (categoriesNotClosed.includes("Buffet")) {
        savingsSuggestions.push({
            icon: "utensils",
            text: "<strong>Buffet:</strong> Considere o formato 'Finger Food' ou coquetel com ilhas gastronômicas em vez de jantar empratado. Jantares tradicionais encarecem o serviço e a louça. Economia estimada: 20%."
        });
    }
    if (categoriesNotClosed.includes("Convites")) {
        savingsSuggestions.push({
            icon: "mail",
            text: "<strong>Convites:</strong> Adote o convite digital com confirmação de presença (RSVP) online. Deixe convites impressos apenas para familiares muito próximos. Economia estimada: R$ 800 - R$ 1.500."
        });
    }
    if (categoriesNotClosed.includes("Lembrancinhas") || !categoriesClosed.includes("Doces")) {
        savingsSuggestions.push({
            icon: "cookie",
            text: "<strong>Doces & Lembrancinhas:</strong> Diminua a variedade de doces finos. Bem-casados tradicionais ou caixinhas de doces feitas no estilo DIY costumam ser ótimas opções econômicas."
        });
    }

    if (savingsSuggestions.length === 0) {
        savingsSuggestions.push({
            icon: "smile",
            text: "Excelente! Você já negociou a maior parte dos fornecedores essenciais ou está dentro da meta estipulada para as principais categorias."
        });
    }

    savingsSuggestions.forEach(item => {
        const li = document.createElement("li");
        li.className = "ai-advice-info";
        li.innerHTML = `
            <i data-lucide="${item.icon}"></i>
            <span>${item.text}</span>
        `;
        savingsList.appendChild(li);
    });

    // --- 3. IDENTIFY RISKS & WARNINGS ---
    const risks = [];

    if (totalBudget > maxBudgetGoal) {
        risks.push({
            type: "danger",
            icon: "trending-up",
            text: `<strong>Alerta de Orçamento:</strong> Seu custo total estimado está R$ ${(totalBudget - maxBudgetGoal).toFixed(2)} acima do planejado. Evite assinar novos contratos sem reduzir o valor de outras categorias.`
        });
    }

    // Check if wedding is less than 3 months away and key items are not closed
    if (goals.targetDate) {
        const today = new Date();
        const target = new Date(goals.targetDate);
        const diffTime = Math.abs(target - today);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 90) { // Under 3 months
            const crucialMissing = ["Espaço", "Buffet", "Cerimonial", "Fotografia"].filter(c => !categoriesClosed.includes(c));
            if (crucialMissing.length > 0) {
                risks.push({
                    type: "danger",
                    icon: "clock",
                    text: `<strong>Urgência de Cronograma:</strong> Faltam menos de 90 dias para o casamento e você ainda não fechou categorias cruciais: <strong>${crucialMissing.join(", ")}</strong>.`
                });
            }
        }
    }

    // Check if any closed contract has unpaid installments overdue
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueInstallments = app.state.payments.filter(p => p.status === "Pendente" && p.dueDate < todayStr);
    if (overdueInstallments.length > 0) {
        risks.push({
            type: "warning",
            icon: "dollar-sign",
            text: `<strong>Parcelas Atrasadas:</strong> Há ${overdueInstallments.length} parcelas de fornecedores vencidas. Regularize para evitar multas de contrato.`
        });
    }

    if (risks.length === 0) {
        risks.push({
            type: "success",
            icon: "check-circle",
            text: "Nenhum risco crítico detectado no momento. Seu planejamento financeiro e prazos estão sob controle!"
        });
    }

    risks.forEach(item => {
        const li = document.createElement("li");
        li.className = `ai-advice-${item.type}`;
        li.innerHTML = `
            <i data-lucide="${item.icon}"></i>
            <span>${item.text}</span>
        `;
        risksList.appendChild(li);
    });

    // --- 4. SUGGEST UNCOMPLETED HIGH PRIORITY TASKS ---
    const pendingHighTasks = tasks.filter(t => !t.completed && t.priority === "Alta").slice(0, 4);

    if (pendingHighTasks.length === 0) {
        const li = document.createElement("li");
        li.className = "ai-advice-success w-full";
        li.innerHTML = `
            <i data-lucide="award"></i>
            <span>Parabéns! Todas as tarefas de prioridade alta foram concluídas.</span>
        `;
        tasksList.appendChild(li);
    } else {
        pendingHighTasks.forEach(t => {
            const li = document.createElement("li");
            li.className = "ai-advice-warning";
            
            let periodText = "";
            if (t.period === "12m") periodText = "Prazo ideal: 12 meses antes";
            if (t.period === "9m") periodText = "Prazo ideal: 9 meses antes";
            if (t.period === "6m") periodText = "Prazo ideal: 6 meses antes";
            if (t.period === "3m") periodText = "Prazo ideal: 3 meses antes";
            if (t.period === "1m") periodText = "Prazo ideal: 1 mês antes";
            if (t.period === "1w") periodText = "Prazo ideal: 1 semana antes";

            li.innerHTML = `
                <i data-lucide="check-square"></i>
                <div>
                    <strong>${t.title}</strong><br>
                    <span style="font-size:0.75rem; color:var(--text-light);">${periodText}</span>
                </div>
            `;
            tasksList.appendChild(li);
        });
    }

    lucide.createIcons();
}

function updateDashboardGauge(score, reasons) {
    const fill = document.getElementById("health-gauge-fill");
    const valText = document.getElementById("health-score-value");
    const title = document.getElementById("health-score-title");
    const desc = document.getElementById("health-score-desc");

    if (!fill || !valText) return;

    // Map score 0-100 to rotate (0.25turn to 0.75turn)
    // 0 score = 0.25turn (left side of gauge)
    // 100 score = 0.75turn (right side of gauge)
    const turnVal = 0.25 + (score / 100) * 0.5;
    fill.style.transform = `rotate(${turnVal}turn)`;
    valText.textContent = score;

    if (score >= 80) {
        fill.style.borderColor = "var(--success)";
        title.textContent = "Excelente Saúde Financeira!";
        title.className = "text-success";
        desc.textContent = "Seu planejamento está saudável e sob controle.";
    } else if (score >= 50) {
        fill.style.borderColor = "var(--warning)";
        title.textContent = "Atenção Necessária";
        title.className = "text-warning";
        desc.textContent = reasons.length ? reasons[0] : "Monitore seus custos para evitar imprevistos.";
    } else {
        fill.style.borderColor = "var(--danger)";
        title.textContent = "Risco de Orçamento";
        title.className = "text-danger";
        desc.textContent = reasons.length ? reasons[0] : "Gastos muito acima do planejado. Reveja prioridades.";
    }
}
