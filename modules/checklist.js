export const DEFAULT_TASKS = [
    { id: "t1", title: "Definir orçamento máximo do casamento", period: "12m", completed: false, priority: "Alta", dueDate: "" },
    { id: "t2", title: "Contratar assessoria / cerimonial", period: "12m", completed: false, priority: "Alta", dueDate: "" },
    { id: "t3", title: "Pesquisar e reservar o local da cerimônia e festa", period: "12m", completed: false, priority: "Alta", dueDate: "" },
    { id: "t4", title: "Fazer lista de convidados inicial", period: "12m", completed: false, priority: "Média", dueDate: "" },
    
    { id: "t5", title: "Contratar equipe de fotografia e filmagem", period: "9m", completed: false, priority: "Alta", dueDate: "" },
    { id: "t6", title: "Pesquisar e providenciar o vestido de noiva", period: "9m", completed: false, priority: "Alta", dueDate: "" },
    { id: "t7", title: "Contratar buffet e definir cardápio inicial", period: "9m", completed: false, priority: "Alta", dueDate: "" },
    
    { id: "t8", title: "Definir decoração, flores e mobiliário", period: "6m", completed: false, priority: "Média", dueDate: "" },
    { id: "t9", title: "Enviar o 'Save the Date' para convidados", period: "6m", completed: false, priority: "Baixa", dueDate: "" },
    { id: "t10", title: "Contratar banda e/ou DJ para a festa", period: "6m", completed: false, priority: "Alta", dueDate: "" },
    { id: "t11", title: "Organizar roteiro de viagem da Lua de Mel", period: "6m", completed: false, priority: "Média", dueDate: "" },
    
    { id: "t12", title: "Enviar convites oficiais", period: "3m", completed: false, priority: "Alta", dueDate: "" },
    { id: "t13", title: "Fazer degustação e encomendar bolo e doces", period: "3m", completed: false, priority: "Média", dueDate: "" },
    { id: "t14", title: "Definir traje do noivo", period: "3m", completed: false, priority: "Média", dueDate: "" },
    { id: "t15", title: "Comprar alianças", period: "3m", completed: false, priority: "Média", dueDate: "" },
    
    { id: "t16", title: "Realizar teste de maquiagem e cabelo", period: "1m", completed: false, priority: "Média", dueDate: "" },
    { id: "t17", title: "Encerrar confirmações de presença (RSVP)", period: "1m", completed: false, priority: "Alta", dueDate: "" },
    { id: "t18", title: "Passar o cronograma completo para todos os fornecedores", period: "1m", completed: false, priority: "Alta", dueDate: "" },
    { id: "t19", title: "Fazer mapa de mesas dos convidados", period: "1m", completed: false, priority: "Média", dueDate: "" },
    
    { id: "t20", title: "Fazer ensaio geral da cerimônia", period: "1w", completed: false, priority: "Alta", dueDate: "" },
    { id: "t21", title: "Preparar mala da lua de mel e documentos", period: "1w", completed: false, priority: "Média", dueDate: "" },
    { id: "t22", title: "Polir as alianças", period: "1w", completed: false, priority: "Baixa", dueDate: "" },
    { id: "t23", title: "Confirmar contagem final de pessoas com o buffet", period: "1w", completed: false, priority: "Alta", dueDate: "" }
];

export function initChecklist(app) {
    const periodFilters = document.getElementById("checklist-period-filters");
    if (periodFilters) {
        periodFilters.addEventListener("click", (e) => {
            if (e.target.classList.contains("period-btn")) {
                periodFilters.querySelectorAll(".period-btn").forEach(btn => btn.classList.remove("active"));
                e.target.classList.add("active");
                renderChecklist(app, e.target.getAttribute("data-period"));
            }
        });
    }

    const formTask = document.getElementById("form-task");
    if (formTask) {
        formTask.addEventListener("submit", (e) => {
            e.preventDefault();
            const title = document.getElementById("task-title").value;
            const period = document.getElementById("task-period").value;
            const priority = document.getElementById("task-priority").value;
            const dueDate = document.getElementById("task-due-date").value;

            const newTask = {
                id: "task_" + Date.now(),
                title,
                period,
                completed: false,
                priority,
                dueDate
            };

            app.state.tasks.push(newTask);
            app.saveState();
            
            // Close modal & reset
            document.getElementById("modal-task").classList.remove("active");
            formTask.reset();
            
            // Refresh
            const activePeriodBtn = document.querySelector(".period-btn.active");
            const activePeriod = activePeriodBtn ? activePeriodBtn.getAttribute("data-period") : "all";
            renderChecklist(app, activePeriod);
            app.updateAll();
        });
    }
}

export function renderChecklist(app, periodFilter = "all") {
    const container = document.getElementById("checklist-items-container");
    if (!container) return;

    container.innerHTML = "";

    const tasks = app.state.tasks;
    const filteredTasks = periodFilter === "all" ? tasks : tasks.filter(t => t.period === periodFilter);

    // Update Counter
    const totalCount = filteredTasks.length;
    const completedCount = filteredTasks.filter(t => t.completed).length;
    document.getElementById("checklist-task-counter").textContent = `${completedCount} / ${totalCount} concluídas`;

    // Title text
    const titleEl = document.getElementById("checklist-current-view-title");
    if (titleEl) {
        const titleMap = {
            "all": "Todas as Tarefas",
            "12m": "Tarefas: 12 meses antes",
            "9m": "Tarefas: 9 meses antes",
            "6m": "Tarefas: 6 meses antes",
            "3m": "Tarefas: 3 meses antes",
            "1m": "Tarefas: 1 mês antes",
            "1w": "Tarefas: 1 semana antes"
        };
        titleEl.textContent = titleMap[periodFilter] || "Tarefas";
    }

    if (filteredTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="check-square"></i>
                <h3>Nenhuma tarefa cadastrada</h3>
                <p>Crie uma tarefa personalizada clicando no botão "Nova Tarefa".</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    // Sort tasks so completed ones are at the bottom
    const sortedTasks = [...filteredTasks].sort((a, b) => a.completed - b.completed);

    sortedTasks.forEach(task => {
        const item = document.createElement("div");
        item.className = `checklist-item ${task.completed ? 'checked' : ''}`;
        
        let priorityClass = "badge-info";
        if (task.priority === "Alta") priorityClass = "badge-danger";
        if (task.priority === "Média") priorityClass = "badge-warning";

        item.innerHTML = `
            <div class="task-main">
                <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.completed ? 'checked' : ''}>
                <span class="task-title-text">${task.title}</span>
            </div>
            <div class="task-meta">
                ${task.dueDate ? `<span class="task-due"><i data-lucide="calendar"></i> ${new Date(task.dueDate).toLocaleDateString('pt-BR')}</span>` : ''}
                <span class="badge ${priorityClass}">${task.priority}</span>
                <button class="btn-icon delete-task" data-id="${task.id}"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        container.appendChild(item);
    });

    // Wire up checkbox listener
    container.querySelectorAll(".task-checkbox").forEach(chk => {
        chk.addEventListener("change", (e) => {
            const id = e.target.getAttribute("data-id");
            const task = app.state.tasks.find(t => t.id === id);
            if (task) {
                task.completed = e.target.checked;
                app.saveState();
                renderChecklist(app, periodFilter);
                app.updateAll();
            }
        });
    });

    // Wire up delete listener
    container.querySelectorAll(".delete-task").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            if (confirm("Deseja realmente excluir esta tarefa?")) {
                app.state.tasks = app.state.tasks.filter(t => t.id !== id);
                app.saveState();
                renderChecklist(app, periodFilter);
                app.updateAll();
            }
        });
    });

    lucide.createIcons();
}
