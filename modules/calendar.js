let currentDate = new Date();

export function initCalendar(app) {
    const prevBtn = document.getElementById("btn-prev-month");
    const nextBtn = document.getElementById("btn-next-month");

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar(app);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar(app);
        });
    }

    const formEvent = document.getElementById("form-event");
    if (formEvent) {
        formEvent.addEventListener("submit", (e) => {
            e.preventDefault();
            const title = document.getElementById("event-title").value;
            const type = document.getElementById("event-type").value;
            const date = document.getElementById("event-date").value;
            const time = document.getElementById("event-time").value;
            const desc = document.getElementById("event-desc").value;

            const newEvent = {
                id: "ev_" + Date.now(),
                title,
                type,
                date,
                time,
                desc
            };

            app.state.events.push(newEvent);
            app.saveState();

            // Set current calendar month to the event's month
            currentDate = new Date(date);

            document.getElementById("modal-event").classList.remove("active");
            formEvent.reset();
            renderCalendar(app);
            app.updateAll();
        });
    }
}

export function renderCalendar(app) {
    const daysContainer = document.getElementById("calendar-days-container");
    const monthYearLabel = document.getElementById("calendar-month-year");
    const agendaList = document.getElementById("agenda-items-list");

    if (!daysContainer) return;

    daysContainer.innerHTML = "";

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Set Month Year text
    const monthsNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    monthYearLabel.textContent = `${monthsNames[month]} ${year}`;

    // Get first day of the month
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Get total days in the month
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Create empty slots for days of previous month
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyDay = document.createElement("div");
        emptyDay.className = "calendar-day empty";
        daysContainer.appendChild(emptyDay);
    }

    const today = new Date();

    // Create days of the current month
    for (let day = 1; day <= totalDays; day++) {
        const dayCell = document.createElement("div");
        dayCell.className = "calendar-day";
        
        // Check if today
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayCell.classList.add("today");
        }

        // Get events on this specific date
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEvents = app.state.events.filter(e => e.date === dateString);

        let eventsHTML = "";
        if (dayEvents.length > 0) {
            eventsHTML = `<div class="calendar-events-dots">`;
            dayEvents.slice(0, 3).forEach(e => {
                eventsHTML += `<span class="event-dot-tag ${e.type.toLowerCase().replace("ç", "c").replace("ã", "a")}">${e.title}</span>`;
            });
            if (dayEvents.length > 3) {
                eventsHTML += `<span class="event-dot-tag">+${dayEvents.length - 3} mais</span>`;
            }
            eventsHTML += `</div>`;
        }

        dayCell.innerHTML = `
            <span class="calendar-day-number">${day}</span>
            ${eventsHTML}
        `;
        daysContainer.appendChild(dayCell);
    }

    // Render Agenda Sidebar
    agendaList.innerHTML = "";
    const currentMonthEvents = app.state.events.filter(e => {
        const evDate = new Date(e.date + 'T00:00:00');
        return evDate.getFullYear() === year && evDate.getMonth() === month;
    });

    // Sort by date then time
    currentMonthEvents.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.time || "").localeCompare(b.time || "");
    });

    if (currentMonthEvents.length === 0) {
        agendaList.innerHTML = `<li class="empty-list-message">Nenhum compromisso agendado para este mês.</li>`;
        return;
    }

    currentMonthEvents.forEach(e => {
        const li = document.createElement("li");
        li.className = `agenda-item ${e.type.toLowerCase().replace("ç", "c").replace("ã", "a")}`;
        
        const dateObj = new Date(e.date + 'T00:00:00');
        const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
        
        li.innerHTML = `
            <span class="agenda-item-time">${formattedDate} ${e.time ? `- ${e.time}` : ''}</span>
            <div class="agenda-item-title">${e.title}</div>
            ${e.desc ? `<div class="agenda-item-desc">${e.desc}</div>` : ''}
            <button class="btn-icon delete-event" data-id="${e.id}" style="position: absolute; right: 8px; top: 8px;">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
        `;
        agendaList.appendChild(li);
    });

    // Attach delete listeners
    agendaList.querySelectorAll(".delete-event").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            if (confirm("Deseja realmente remover este compromisso?")) {
                app.state.events = app.state.events.filter(ev => ev.id !== id);
                app.saveState();
                renderCalendar(app);
                app.updateAll();
            }
        });
    });

    lucide.createIcons();
}
