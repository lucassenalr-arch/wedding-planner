export function initGuests(app) {
    const form = document.getElementById("form-guest");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const id = document.getElementById("guest-id").value;
            const name = document.getElementById("guest-name").value;
            const type = document.getElementById("guest-type").value;
            const rsvp = document.getElementById("guest-rsvp").value;
            const table = document.getElementById("guest-table").value;
            const companion = document.getElementById("guest-companion").value;

            if (id) {
                // Edit existing
                const guestIndex = app.state.guests.findIndex(g => g.id === id);
                if (guestIndex !== -1) {
                    app.state.guests[guestIndex] = { ...app.state.guests[guestIndex], name, type, rsvpStatus: rsvp, table, companionOf: companion };
                    app.logAction(`Convidado "${name}" editado.`);
                }
            } else {
                // New guest
                const newGuest = {
                    id: "gst_" + Date.now(),
                    name,
                    type,
                    rsvpStatus: rsvp,
                    table,
                    companionOf: companion
                };
                app.state.guests.push(newGuest);
                app.logAction(`Convidado "${name}" adicionado à lista.`);
            }

            app.saveState();
            document.getElementById("modal-guest").classList.remove("active");
            form.reset();
            renderGuests(app);
            app.updateAll();
        });
    }

    const searchInput = document.getElementById("search-guest");
    if (searchInput) {
        searchInput.addEventListener("input", () => renderGuests(app));
    }

    const rsvpFilter = document.getElementById("filter-guest-rsvp");
    if (rsvpFilter) {
        rsvpFilter.addEventListener("change", () => renderGuests(app));
    }
}

export function renderGuests(app) {
    const tbody = document.getElementById("guests-table-body");
    if (!tbody) return;

    tbody.innerHTML = "";

    const searchQuery = document.getElementById("search-guest").value.toLowerCase();
    const rsvpFilter = document.getElementById("filter-guest-rsvp").value;

    const filtered = app.state.guests.filter(g => {
        const matchesSearch = g.name.toLowerCase().includes(searchQuery) ||
                              (g.companionOf && g.companionOf.toLowerCase().includes(searchQuery)) ||
                              (g.table && g.table.toLowerCase().includes(searchQuery));
        const matchesRsvp = !rsvpFilter || g.rsvpStatus === rsvpFilter;
        return matchesSearch && matchesRsvp;
    });

    // Update Stats
    updateGuestStats(app);

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-light">Nenhum convidado encontrado.</td>
            </tr>
        `;
        return;
    }

    filtered.forEach(g => {
        const tr = document.createElement("tr");
        let badgeClass = "badge-pesquisando"; // Pending
        if (g.rsvpStatus === "Confirmado") badgeClass = "badge-fechado";
        if (g.rsvpStatus === "Recusado") badgeClass = "badge-cancelado";

        tr.innerHTML = `
            <td><strong>${g.name}</strong></td>
            <td>${g.type}</td>
            <td>${g.companionOf || '-'}</td>
            <td>${g.table ? `Mesa ${g.table}` : '-'}</td>
            <td><span class="badge ${badgeClass}">${g.rsvpStatus}</span></td>
            <td>
                <button class="btn-icon edit-guest" data-id="${g.id}"><i data-lucide="edit-3"></i></button>
                <button class="btn-icon text-danger delete-guest" data-id="${g.id}"><i data-lucide="trash-2"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".edit-guest").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            openEditGuestModal(app, id);
        });
    });

    tbody.querySelectorAll(".delete-guest").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            const guest = app.state.guests.find(g => g.id === id);
            if (confirm(`Excluir ${guest ? guest.name : 'este convidado'} da lista?`)) {
                app.state.guests = app.state.guests.filter(g => g.id !== id);
                if (guest) app.logAction(`Convidado "${guest.name}" removido.`);
                app.saveState();
                renderGuests(app);
                app.updateAll();
            }
        });
    });

    lucide.createIcons();
}

function updateGuestStats(app) {
    const total = app.state.guests.length;
    const confirmed = app.state.guests.filter(g => g.rsvpStatus === "Confirmado").length;
    const pending = app.state.guests.filter(g => g.rsvpStatus === "Pendente").length;
    const declined = app.state.guests.filter(g => g.rsvpStatus === "Recusado").length;
    const adults = app.state.guests.filter(g => g.type === "Adulto").length;
    const children = app.state.guests.filter(g => g.type === "Criança").length;

    const elTotal = document.getElementById("guest-stat-total");
    const elConfirmed = document.getElementById("guest-stat-confirmed");
    const elPending = document.getElementById("guest-stat-pending");
    const elDeclined = document.getElementById("guest-stat-declined");
    const elBreakdown = document.getElementById("guest-stat-breakdown");

    if (elTotal) elTotal.textContent = total;
    if (elConfirmed) elConfirmed.textContent = confirmed;
    if (elPending) elPending.textContent = pending;
    if (elDeclined) elDeclined.textContent = declined;
    if (elBreakdown) elBreakdown.textContent = `${adults} ad / ${children} cr`;
}

function openEditGuestModal(app, id) {
    const guest = app.state.guests.find(g => g.id === id);
    if (!guest) return;

    document.getElementById("guest-id").value = guest.id;
    document.getElementById("guest-name").value = guest.name;
    document.getElementById("guest-type").value = guest.type;
    document.getElementById("guest-rsvp").value = guest.rsvpStatus;
    document.getElementById("guest-table").value = guest.table || "";
    document.getElementById("guest-companion").value = guest.companionOf || "";

    document.getElementById("modal-guest").classList.add("active");
}
export function addGuestTemplateData(app) {
    // Inject mock guests if list is empty
    if (app.state.guests.length === 0) {
        app.state.guests = [
            { id: "g1", name: "Maria Clara Souza", type: "Adulto", rsvpStatus: "Confirmado", table: "1", companionOf: "" },
            { id: "g2", name: "João Pedro Silva", type: "Adulto", rsvpStatus: "Confirmado", table: "1", companionOf: "Maria Clara Souza" },
            { id: "g3", name: "Paula Andrade", type: "Adulto", rsvpStatus: "Pendente", table: "", companionOf: "" },
            { id: "g4", name: "Renato Andrade", type: "Adulto", rsvpStatus: "Pendente", table: "", companionOf: "Paula Andrade" },
            { id: "g5", name: "Lucas Andrade", type: "Criança", rsvpStatus: "Pendente", table: "", companionOf: "Paula Andrade" }
        ];
        app.saveState();
    }
}
