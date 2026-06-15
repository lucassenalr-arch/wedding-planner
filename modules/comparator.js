let priceChart = null;

export function initComparator(app) {
    const categorySelect = document.getElementById("comparator-category-select");
    const decisionSelect = document.getElementById("decision-category-select");

    categorySelect.addEventListener("change", () => {
        renderComparison(app, categorySelect.value);
    });

    decisionSelect.addEventListener("change", () => {
        renderDecisionMatrix(app, decisionSelect.value);
    });
}

export function renderComparison(app, category) {
    const emptyState = document.getElementById("comparator-empty-state");
    const content = document.getElementById("comparator-content");
    const cardContainer = document.getElementById("comparator-cards-container");

    if (!category) {
        emptyState.classList.remove("hidden");
        content.classList.add("hidden");
        return;
    }

    const vendors = app.state.vendors.filter(v => v.category === category);

    if (vendors.length === 0) {
        emptyState.classList.remove("hidden");
        content.classList.add("hidden");
        // Update empty state text
        emptyState.querySelector("h3").textContent = "Nenhum fornecedor nesta categoria";
        emptyState.querySelector("p").textContent = "Cadastre fornecedores nesta categoria primeiro.";
        return;
    }

    emptyState.classList.add("hidden");
    content.classList.remove("hidden");
    cardContainer.innerHTML = "";

    // Sort vendors by budget/negotiated price
    const sortedByPrice = [...vendors].sort((a, b) => {
        const valA = a.negotiatedValue || a.budgetValue || 0;
        const valB = b.negotiatedValue || b.budgetValue || 0;
        return valA - valB;
    });

    // Populate comparison cards
    sortedByPrice.forEach(v => {
        const card = document.createElement("div");
        card.className = "compare-card";
        
        // Calculate a mock cost-benefit index (just as an interactive demo feature)
        // In a real app we could base this on user ratings
        const scoreEntry = app.state.scores[v.id] || { price: 5, quality: 5, service: 5, location: 5, benefits: 5 };
        const averageScore = ((scoreEntry.price + scoreEntry.quality + scoreEntry.service + scoreEntry.location + scoreEntry.benefits) / 5).toFixed(1);

        card.innerHTML = `
            <div class="compare-card-title">${v.name}</div>
            <div class="compare-card-body">
                <div class="compare-stat">
                    <span>Orçado:</span>
                    <strong>${app.formatCurrency(v.budgetValue)}</strong>
                </div>
                <div class="compare-stat">
                    <span>Negociado:</span>
                    <strong>${app.formatCurrency(v.negotiatedValue)}</strong>
                </div>
                <div class="compare-stat">
                    <span>Status:</span>
                    <span class="badge badge-primary">${v.status}</span>
                </div>
                <div class="compare-stat">
                    <span>Nota Custo-Benefício:</span>
                    <strong class="text-primary">${averageScore} / 10</strong>
                </div>
            </div>
        `;
        cardContainer.appendChild(card);
    });

    // Determine Highlights
    const cheapest = sortedByPrice[0];
    const dearest = sortedByPrice[sortedByPrice.length - 1];
    
    document.getElementById("compare-cheapest-name").textContent = cheapest.name;
    document.getElementById("compare-cheapest-value").textContent = app.formatCurrency(cheapest.negotiatedValue || cheapest.budgetValue);

    // Calculate best rating and best cost-benefit
    let bestRatingVendor = null;
    let bestRatingScore = -1;
    let bestValueVendor = null;
    let bestValueScore = -1;

    vendors.forEach(v => {
        const score = app.state.scores[v.id] || { price: 5, quality: 5, service: 5, location: 5, benefits: 5 };
        const avg = (score.price + score.quality + score.service + score.location + score.benefits) / 5;
        const price = v.negotiatedValue || v.budgetValue || 1;
        const valueScore = avg / (price / 1000); // Simple heuristic: higher rating, lower price = higher value

        if (avg > bestRatingScore) {
            bestRatingScore = avg;
            bestRatingVendor = v;
        }

        if (valueScore > bestValueScore) {
            bestValueScore = valueScore;
            bestValueVendor = v;
        }
    });

    document.getElementById("compare-best-rating-name").textContent = bestRatingVendor ? bestRatingVendor.name : "-";
    document.getElementById("compare-best-rating-val").textContent = bestRatingVendor ? `${bestRatingScore.toFixed(1)} / 10` : "-";

    document.getElementById("compare-best-value-name").textContent = bestValueVendor ? bestValueVendor.name : "-";
    document.getElementById("compare-best-value-score").textContent = bestValueVendor ? "Baseado nas Notas" : "-";

    // Render comparison chart
    renderPriceChart(vendors);
}

function renderPriceChart(vendors) {
    const ctx = document.getElementById("chart-compare-prices").getContext("2d");
    
    if (priceChart) {
        priceChart.destroy();
    }

    const labels = vendors.map(v => v.name);
    const budgetData = vendors.map(v => v.budgetValue || 0);
    const negotiatedData = vendors.map(v => v.negotiatedValue || 0);

    priceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Valor Orçado (R$)',
                    data: budgetData,
                    backgroundColor: 'rgba(110, 154, 126, 0.6)',
                    borderColor: '#6e9a7e',
                    borderWidth: 1
                },
                {
                    label: 'Valor Fechado/Negociado (R$)',
                    data: negotiatedData,
                    backgroundColor: 'rgba(191, 161, 129, 0.8)',
                    borderColor: '#bfa181',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// DECISION MATRIX
export function renderDecisionMatrix(app, category) {
    const emptyState = document.getElementById("decision-empty-state");
    const content = document.getElementById("decision-content");
    const tbody = document.getElementById("decision-matrix-body");

    if (!category) {
        emptyState.classList.remove("hidden");
        content.classList.add("hidden");
        return;
    }

    const vendors = app.state.vendors.filter(v => v.category === category);

    if (vendors.length === 0) {
        emptyState.classList.remove("hidden");
        content.classList.add("hidden");
        emptyState.querySelector("h3").textContent = "Nenhum fornecedor nesta categoria";
        emptyState.querySelector("p").textContent = "Cadastre fornecedores nesta categoria primeiro.";
        return;
    }

    emptyState.classList.add("hidden");
    content.classList.remove("hidden");
    tbody.innerHTML = "";

    vendors.forEach(v => {
        const score = app.state.scores[v.id] || { price: 5, quality: 5, service: 5, location: 5, benefits: 5 };
        const average = ((score.price + score.quality + score.service + score.location + score.benefits) / 5).toFixed(1);
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${v.name}</strong></td>
            <td><input type="number" class="form-control score-input" data-id="${v.id}" data-type="price" min="1" max="10" value="${score.price}"></td>
            <td><input type="number" class="form-control score-input" data-id="${v.id}" data-type="quality" min="1" max="10" value="${score.quality}"></td>
            <td><input type="number" class="form-control score-input" data-id="${v.id}" data-type="service" min="1" max="10" value="${score.service}"></td>
            <td><input type="number" class="form-control score-input" data-id="${v.id}" data-type="location" min="1" max="10" value="${score.location}"></td>
            <td><input type="number" class="form-control score-input" data-id="${v.id}" data-type="benefits" min="1" max="10" value="${score.benefits}"></td>
            <td><span class="badge badge-primary" id="avg-${v.id}">${average} / 10</span></td>
            <td><button class="btn btn-sm btn-primary save-scores" data-id="${v.id}">Salvar</button></td>
        `;
        tbody.appendChild(tr);
    });

    // Attach listeners for saving
    tbody.querySelectorAll(".save-scores").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.target.getAttribute("data-id");
            const rowInputs = tbody.querySelectorAll(`.score-input[data-id="${id}"]`);
            
            if (!app.state.scores[id]) {
                app.state.scores[id] = {};
            }

            rowInputs.forEach(input => {
                const type = input.getAttribute("data-type");
                app.state.scores[id][type] = parseFloat(input.value) || 0;
            });

            app.saveState();
            
            // Recalculate average
            const s = app.state.scores[id];
            const avg = ((s.price + s.quality + s.service + s.location + s.benefits) / 5).toFixed(1);
            document.getElementById(`avg-${id}`).textContent = `${avg} / 10`;
            
            updateRecommendation(app, category);
        });
    });

    updateRecommendation(app, category);
}

function updateRecommendation(app, category) {
    const vendors = app.state.vendors.filter(v => v.category === category);
    let bestVendor = null;
    let highestScore = -1;

    vendors.forEach(v => {
        const score = app.state.scores[v.id] || { price: 5, quality: 5, service: 5, location: 5, benefits: 5 };
        const avg = (score.price + score.quality + score.service + score.location + score.benefits) / 5;
        if (avg > highestScore) {
            highestScore = avg;
            bestVendor = v;
        }
    });

    const boxText = document.getElementById("decision-recommendation-text");
    if (bestVendor && highestScore > 0) {
        boxText.innerHTML = `Com base nas avaliações inseridas, a melhor escolha é <strong>${bestVendor.name}</strong> com pontuação média de <strong>${highestScore.toFixed(1)}/10</strong> nas categorias avaliadas (Preço, Qualidade, Atendimento, Localização e Benefícios).`;
    } else {
        boxText.textContent = "Insira notas acima (clique em salvar) para ver a recomendação automática.";
    }
}
