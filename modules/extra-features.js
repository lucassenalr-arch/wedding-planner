export function initExtraFeatures(app) {
    // Sub-tab Navigation
    const subTabButtons = document.querySelectorAll(".sub-tab-btn");
    subTabButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            const subtab = e.target.getAttribute("data-subtab");
            
            // Toggle active class on buttons
            subTabButtons.forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            
            // Toggle active class on panes
            document.querySelectorAll(".subtab-pane").forEach(pane => pane.classList.remove("active"));
            document.getElementById(`subtab-${subtab}`).classList.add("active");
            
            renderSubTab(app, subtab);
        });
    });

    // Form handlers
    // Gift
    const formGift = document.getElementById("form-gift");
    if (formGift) {
        formGift.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = document.getElementById("gift-name").value;
            const giver = document.getElementById("gift-giver").value;
            const status = document.getElementById("gift-status").value;

            app.state.gifts.push({
                id: "gft_" + Date.now(),
                name,
                giver,
                status
            });
            app.saveState();
            document.getElementById("modal-gift").classList.remove("active");
            formGift.reset();
            renderGifts(app);
        });
    }

    // Member
    const formMember = document.getElementById("form-member");
    if (formMember) {
        formMember.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = document.getElementById("member-name").value;
            const role = document.getElementById("member-role").value;
            const side = document.getElementById("member-side").value;
            const attire = document.getElementById("member-attire").value;
            const presence = document.getElementById("member-presence").value;

            app.state.weddingParty.push({
                id: "memb_" + Date.now(),
                name,
                role,
                side,
                attire,
                presence
            });
            app.saveState();
            document.getElementById("modal-member").classList.remove("active");
            formMember.reset();
            renderWeddingParty(app);
        });
    }

    // Venue
    const formVenue = document.getElementById("form-venue");
    if (formVenue) {
        formVenue.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = document.getElementById("venue-name").value;
            const capacity = parseInt(document.getElementById("venue-capacity").value) || 1;
            const cost = parseFloat(document.getElementById("venue-cost").value) || 0;
            const address = document.getElementById("venue-address").value;
            const services = document.getElementById("venue-services").value;

            app.state.venues.push({
                id: "ven_" + Date.now(),
                name,
                capacity,
                cost,
                address,
                services: services ? services.split(",").map(s => s.trim()) : []
            });
            app.saveState();
            document.getElementById("modal-venue").classList.remove("active");
            formVenue.reset();
            renderVenues(app);
        });
    }

    // Inspiration
    const formInspiration = document.getElementById("form-inspiration");
    if (formInspiration) {
        formInspiration.addEventListener("submit", (e) => {
            e.preventDefault();
            const title = document.getElementById("inspire-title").value;
            const url = document.getElementById("inspire-url").value;
            const tag = document.getElementById("inspire-tag").value;

            app.state.inspirations.push({
                id: "insp_" + Date.now(),
                title,
                url,
                tag
            });
            app.saveState();
            document.getElementById("modal-inspiration").classList.remove("active");
            formInspiration.reset();
            renderInspirations(app);
        });
    }
}

export function renderSubTab(app, subtab) {
    if (subtab === "gifts") renderGifts(app);
    if (subtab === "wedding-party") renderWeddingParty(app);
    if (subtab === "venues") renderVenues(app);
    if (subtab === "inspirations") renderInspirations(app);
}

// Sub-renders
function renderGifts(app) {
    const tbody = document.getElementById("gifts-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (app.state.gifts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-light">Nenhum presente registrado ainda.</td></tr>`;
        return;
    }

    app.state.gifts.forEach(g => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${g.name}</strong></td>
            <td>${g.giver}</td>
            <td><span class="badge ${g.status === 'Recebido' ? 'badge-recebido' : 'badge-fechado'}">${g.status}</span></td>
            <td>
                <button class="btn-icon toggle-gift" data-id="${g.id}" title="Alternar status agradecido"><i data-lucide="check"></i></button>
                <button class="btn-icon text-danger delete-gift" data-id="${g.id}"><i data-lucide="trash-2"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".toggle-gift").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            const gift = app.state.gifts.find(g => g.id === id);
            if (gift) {
                gift.status = gift.status === "Recebido" ? "Agradecido" : "Recebido";
                app.saveState();
                renderGifts(app);
            }
        });
    });

    tbody.querySelectorAll(".delete-gift").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            app.state.gifts = app.state.gifts.filter(g => g.id !== id);
            app.saveState();
            renderGifts(app);
        });
    });

    lucide.createIcons();
}

function renderWeddingParty(app) {
    const container = document.getElementById("wedding-party-container");
    if (!container) return;
    container.innerHTML = "";

    if (app.state.weddingParty.length === 0) {
        container.innerHTML = `<div class="col-span-4 text-center text-light">Nenhum membro adicionado ao cortejo.</div>`;
        return;
    }

    app.state.weddingParty.forEach(m => {
        const card = document.createElement("div");
        card.className = "party-member-card";
        card.innerHTML = `
            <div class="member-avatar">
                <i data-lucide="user"></i>
            </div>
            <h4>${m.name}</h4>
            <span class="member-role-badge">${m.role} (${m.side})</span>
            ${m.attire ? `<span class="member-attire">Traje: ${m.attire}</span>` : ''}
            <span class="badge ${m.presence === 'Sim' ? 'badge-fechado' : 'badge-cancelado'}">
                ${m.presence === 'Sim' ? 'Confirmado' : 'Pendente'}
            </span>
            <button class="btn-icon text-danger delete-member" data-id="${m.id}" style="margin-top: 8px;"><i data-lucide="trash-2"></i></button>
        `;
        container.appendChild(card);
    });

    container.querySelectorAll(".delete-member").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            app.state.weddingParty = app.state.weddingParty.filter(m => m.id !== id);
            app.saveState();
            renderWeddingParty(app);
        });
    });

    lucide.createIcons();
}

function renderVenues(app) {
    const container = document.getElementById("venues-container");
    if (!container) return;
    container.innerHTML = "";

    if (app.state.venues.length === 0) {
        container.innerHTML = `<div class="col-span-4 text-center text-light">Nenhum espaço cadastrado.</div>`;
        return;
    }

    app.state.venues.forEach(v => {
        const card = document.createElement("div");
        card.className = "venue-card";
        const costPerGuest = v.capacity > 0 ? (v.cost / v.capacity).toFixed(2) : 0;

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <h4>${v.name}</h4>
                <button class="btn-icon text-danger delete-venue" data-id="${v.id}"><i data-lucide="trash-2"></i></button>
            </div>
            <div class="venue-stat">
                <span>Capacidade:</span>
                <strong>${v.capacity} pessoas</strong>
            </div>
            <div class="venue-stat">
                <span>Custo Total:</span>
                <strong>${app.formatCurrency(v.cost)}</strong>
            </div>
            <div class="venue-stat">
                <span>Custo p/ Convidado:</span>
                <strong class="text-primary">${app.formatCurrency(costPerGuest)} / pessoa</strong>
            </div>
            ${v.address ? `<div style="font-size:0.75rem; color:var(--text-light);"><i data-lucide="map-pin" style="width:12px; height:12px;"></i> ${v.address}</div>` : ''}
            ${v.services.length ? `
                <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:8px;">
                    ${v.services.map(s => `<span class="badge badge-primary">${s}</span>`).join("")}
                </div>
            ` : ''}
        `;
        container.appendChild(card);
    });

    container.querySelectorAll(".delete-venue").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            app.state.venues = app.state.venues.filter(v => v.id !== id);
            app.saveState();
            renderVenues(app);
        });
    });

    lucide.createIcons();
}

function renderInspirations(app) {
    const container = document.getElementById("inspirations-container");
    if (!container) return;
    container.innerHTML = "";

    if (app.state.inspirations.length === 0) {
        container.innerHTML = `<div class="col-span-4 text-center text-light">Mural de inspirações vazio.</div>`;
        return;
    }

    app.state.inspirations.forEach(i => {
        const item = document.createElement("div");
        item.className = "inspiration-item";
        item.innerHTML = `
            <img src="${i.url}" alt="${i.title}" onerror="this.src='https://images.unsplash.com/photo-1519741497674-611481863552?w=500&auto=format&fit=crop';">
            <div class="inspiration-details">
                <h5>${i.title} <span class="badge badge-primary" style="font-size:0.65rem;">${i.tag}</span></h5>
                <button class="btn-remove-inspire delete-inspiration" data-id="${i.id}"><i data-lucide="trash-2" style="width:14px; height:14px;"></i></button>
            </div>
        `;
        container.appendChild(item);
    });

    container.querySelectorAll(".delete-inspiration").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            app.state.inspirations = app.state.inspirations.filter(i => i.id !== id);
            app.saveState();
            renderInspirations(app);
        });
    });

    lucide.createIcons();
}

// Seeding Initial Inspiration Board
export function seedInspirations(app) {
    if (app.state.inspirations.length === 0) {
        app.state.inspirations = [
            {
                id: "insp1",
                title: "Decoração de Mesa Rústica",
                url: "https://images.unsplash.com/photo-1519225495810-7512c696505a?w=500&auto=format&fit=crop",
                tag: "Decoração"
            },
            {
                id: "insp2",
                title: "Vestido com Renda Boho",
                url: "https://images.unsplash.com/photo-1549417229-aa67d3263c09?w=500&auto=format&fit=crop",
                tag: "Vestido"
            },
            {
                id: "insp3",
                title: "Bolo de Casamento Rústico / Naked",
                url: "https://images.unsplash.com/photo-1535254973040-607b474cb50d?w=500&auto=format&fit=crop",
                tag: "Bolo"
            },
            {
                id: "insp4",
                title: "Arranjo Floral Clássico",
                url: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=500&auto=format&fit=crop",
                tag: "Flores"
            }
        ];
        app.saveState();
    }
}
