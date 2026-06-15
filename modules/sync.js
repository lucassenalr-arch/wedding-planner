let isSyncing = false;

export async function syncWithCloud(app, forceManual = false) {
    if (isSyncing) return;

    const config = app.state.syncConfig;
    if (!config || config.provider === 'none') {
        updateSyncStatusUI('offline', 'Sincronização Desativada');
        return;
    }

    isSyncing = true;
    updateSyncStatusUI('syncing', 'Sincronizando...');

    try {
        let remoteState = null;

        if (config.provider === 'gist') {
            if (!config.gistId || !config.gistToken) {
                throw new Error('Gist ID e Token são obrigatórios.');
            }

            const response = await fetch(`https://api.github.com/gists/${config.gistId}`, {
                headers: {
                    'Authorization': `token ${config.gistToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`GitHub API retornou status ${response.status}`);
            }

            const gistData = await response.json();
            const file = gistData.files && gistData.files['wedding_planner_state.json'];
            if (file && file.content) {
                try {
                    remoteState = JSON.parse(file.content);
                } catch (e) {
                    console.warn('Gist content is not valid JSON, initializing...');
                    remoteState = {};
                }
            } else {
                remoteState = {};
            }

        } else if (config.provider === 'firebase') {
            if (!config.firebaseUrl) {
                throw new Error('URL do Firebase é obrigatória.');
            }

            const response = await fetch(config.firebaseUrl);
            if (!response.ok) {
                throw new Error(`Firebase retornou status ${response.status}`);
            }

            const text = await response.text();
            if (text && text !== 'null') {
                remoteState = JSON.parse(text);
            } else {
                remoteState = {};
            }
        }

        const localBeforeSync = JSON.stringify(app.state);
        let shouldPush = false;
        let shouldSaveAndUIUpdate = false;

        if (remoteState && Object.keys(remoteState).length > 0) {
            // Run chronological state-level merge
            mergeStates(app.state, remoteState);
            
            const localAfterSync = JSON.stringify(app.state);
            
            if (localBeforeSync !== localAfterSync) {
                // Local state changed because of the merge (we pulled remote changes)
                shouldSaveAndUIUpdate = true;
            }
            
            if (localAfterSync !== JSON.stringify(remoteState)) {
                // Local state has some local modifications that are not on the remote
                shouldPush = true;
            }
        } else {
            // Remote is empty, push our local state to initialize it
            shouldPush = true;
        }

        if (shouldSaveAndUIUpdate) {
            app.saveState(true); // Save locally without triggering sync or bumping updatedAt
            app.updateAll();
        }

        if (shouldPush) {
            // Bump overall updatedAt and save locally before pushing
            app.state.updatedAt = Date.now();
            app.saveState(true);
            
            const mergedContent = JSON.stringify(app.state);

            if (config.provider === 'gist') {
                const response = await fetch(`https://api.github.com/gists/${config.gistId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `token ${config.gistToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        files: {
                            'wedding_planner_state.json': {
                                'content': mergedContent
                            }
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error(`Erro ao salvar no Gist (Status ${response.status})`);
                }
            } else if (config.provider === 'firebase') {
                const response = await fetch(config.firebaseUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: mergedContent
                });

                if (!response.ok) {
                    throw new Error(`Erro ao salvar no Firebase (Status ${response.status})`);
                }
            }
        }

        const syncTime = new Date().toLocaleTimeString('pt-BR');
        updateSyncStatusUI('online', `Sincronizado às ${syncTime}`);
        
        if (forceManual) {
            alert('Sincronização concluída com sucesso!');
        }

    } catch (error) {
        console.error('Erro de sincronização:', error);
        updateSyncStatusUI('error', 'Falha na Sincronização');
        if (forceManual) {
            alert(`Erro na sincronização: ${error.message}`);
        }
    } finally {
        isSyncing = false;
    }
}

function updateSyncStatusUI(status, text) {
    const syncStatusText = document.getElementById("sync-status-text");
    const syncStatusIcon = document.getElementById("sync-status-icon");
    const mobileSyncIcon = document.getElementById("btn-mobile-sync")?.querySelector("i");

    if (syncStatusText) syncStatusText.textContent = text;
    
    if (syncStatusIcon) {
        syncStatusIcon.className = `sync-icon ${status}`;
        if (status === 'offline') {
            syncStatusIcon.style.color = 'var(--text-light)';
        } else if (status === 'syncing') {
            syncStatusIcon.style.color = 'var(--warning)';
        } else if (status === 'online') {
            syncStatusIcon.style.color = 'var(--success)';
        } else if (status === 'error') {
            syncStatusIcon.style.color = 'var(--danger)';
        }
    }

    if (mobileSyncIcon) {
        if (status === 'syncing') {
            mobileSyncIcon.style.color = 'var(--warning)';
            mobileSyncIcon.classList.add("spin-animation");
        } else if (status === 'online') {
            mobileSyncIcon.style.color = 'var(--success)';
            mobileSyncIcon.classList.remove("spin-animation");
        } else if (status === 'error') {
            mobileSyncIcon.style.color = 'var(--danger)';
            mobileSyncIcon.classList.remove("spin-animation");
        } else {
            mobileSyncIcon.style.color = 'var(--text-secondary)';
            mobileSyncIcon.classList.remove("spin-animation");
        }
    }
}

function mergeDeleted(localDel, remoteDel) {
    const merged = { ...(localDel || {}) };
    if (remoteDel) {
        Object.keys(remoteDel).forEach(key => {
            const localTime = merged[key] || 0;
            const remoteTime = remoteDel[key] || 0;
            if (remoteTime > localTime) {
                merged[key] = remoteTime;
            }
        });
    }
    return merged;
}

function mergeScores(localScores, remoteScores, preferRemote) {
    const merged = { ...(localScores || {}) };
    if (!remoteScores) return merged;
    
    Object.keys(remoteScores).forEach(vendorId => {
        if (merged[vendorId] === undefined) {
            merged[vendorId] = remoteScores[vendorId];
        } else {
            if (preferRemote) {
                merged[vendorId] = remoteScores[vendorId];
            }
        }
    });
    return merged;
}

function mergeGoals(localGoals, remoteGoals, preferRemote) {
    if (!localGoals) return remoteGoals || {};
    if (!remoteGoals) return localGoals || {};
    return preferRemote ? remoteGoals : localGoals;
}

function mergeArrays(localArr, remoteArr, deletedMap) {
    const map = new Map();
    const isDeleted = (item) => {
        if (!item || !item.id) return true;
        const delTime = deletedMap[item.id];
        if (delTime !== undefined) {
            const itemTime = item.updatedAt || 0;
            if (itemTime <= delTime) {
                return true;
            }
        }
        return false;
    };

    if (localArr) {
        localArr.forEach(item => {
            if (item && item.id && !isDeleted(item)) {
                map.set(item.id, item);
            }
        });
    }
    
    if (remoteArr) {
        remoteArr.forEach(item => {
            if (item && item.id && !isDeleted(item)) {
                const localItem = map.get(item.id);
                if (!localItem) {
                    map.set(item.id, item);
                } else {
                    const localTime = localItem.updatedAt || 0;
                    const remoteTime = item.updatedAt || 0;
                    if (remoteTime >= localTime) {
                        map.set(item.id, item);
                    }
                }
            }
        });
    }
    
    return Array.from(map.values());
}

function mergeStates(local, remote) {
    if (!remote) return;
    
    const localTime = local.updatedAt || 0;
    const remoteTime = remote.updatedAt || 0;
    const preferRemote = remoteTime > localTime;
    
    // 1. Merge deleted map
    local.deleted = mergeDeleted(local.deleted, remote.deleted);
    
    // 2. Merge weddingDate
    if (preferRemote && remote.weddingDate) {
        local.weddingDate = remote.weddingDate;
    }
    
    // 3. Merge scores
    local.scores = mergeScores(local.scores, remote.scores, preferRemote);
    
    // 4. Merge goals
    local.goals = mergeGoals(local.goals, remote.goals, preferRemote);
    
    // 5. Merge arrays
    const arrayKeys = ['vendors', 'tasks', 'events', 'documents', 'payments', 'guests', 'gifts', 'weddingParty', 'venues', 'inspirations', 'auditLog'];
    arrayKeys.forEach(key => {
        local[key] = mergeArrays(local[key], remote[key], local.deleted);
    });
}

export function initSync(app) {
    // Ensure syncConfig is initialized
    if (!app.state.syncConfig) {
        app.state.syncConfig = {
            provider: 'none',
            gistId: '',
            gistToken: '',
            firebaseUrl: '',
            lastSynced: 0
        };
    }

    const modal = document.getElementById("modal-sync");
    const btnSyncSettings = document.getElementById("btn-sync-settings");
    const btnMobileSync = document.getElementById("btn-mobile-sync");
    const form = document.getElementById("form-sync");
    const providerSelect = document.getElementById("sync-provider");
    const gistFields = document.getElementById("sync-gist-fields");
    const firebaseFields = document.getElementById("sync-firebase-fields");
    const autoDetectFields = document.getElementById("sync-auto-detect");
    const btnImportRF = document.getElementById("btn-import-routineflow-sync");

    // Toggle fields based on provider selection
    const toggleFields = (provider) => {
        if (gistFields) gistFields.style.display = provider === 'gist' ? 'flex' : 'none';
        if (firebaseFields) firebaseFields.style.display = provider === 'firebase' ? 'flex' : 'none';
    };

    if (providerSelect) {
        providerSelect.addEventListener("change", (e) => {
            toggleFields(e.target.value);
        });
    }

    // Open Sync Modal
    const openSyncModal = () => {
        if (app.state.syncConfig) {
            if (providerSelect) {
                providerSelect.value = app.state.syncConfig.provider || 'none';
                toggleFields(app.state.syncConfig.provider);
            }
            const gistIdEl = document.getElementById("sync-gist-id");
            if (gistIdEl) gistIdEl.value = app.state.syncConfig.gistId || '';
            
            const gistTokenEl = document.getElementById("sync-gist-token");
            if (gistTokenEl) gistTokenEl.value = app.state.syncConfig.gistToken || '';
            
            const firebaseUrlEl = document.getElementById("sync-firebase-url");
            if (firebaseUrlEl) firebaseUrlEl.value = app.state.syncConfig.firebaseUrl || '';
        }

        // Check for routine-flow credentials in localStorage
        try {
            const rfStateRaw = localStorage.getItem("routineflow_state");
            if (rfStateRaw) {
                const rfState = JSON.parse(rfStateRaw);
                const rfSync = rfState.syncConfig;
                if (rfSync && rfSync.provider !== 'none' && (rfSync.gistId || rfSync.firebaseUrl)) {
                    if (autoDetectFields) autoDetectFields.style.display = 'flex';
                } else {
                    if (autoDetectFields) autoDetectFields.style.display = 'none';
                }
            } else {
                if (autoDetectFields) autoDetectFields.style.display = 'none';
            }
        } catch (e) {
            if (autoDetectFields) autoDetectFields.style.display = 'none';
        }

        if (modal) modal.classList.add("active");
    };

    if (btnSyncSettings) btnSyncSettings.addEventListener("click", openSyncModal);
    if (btnMobileSync) btnMobileSync.addEventListener("click", () => syncWithCloud(app, true));

    // Import RoutineFlow Credentials
    if (btnImportRF) {
        btnImportRF.addEventListener("click", () => {
            try {
                const rfStateRaw = localStorage.getItem("routineflow_state");
                if (rfStateRaw) {
                    const rfState = JSON.parse(rfStateRaw);
                    const rfSync = rfState.syncConfig;
                    if (rfSync) {
                        if (providerSelect) {
                            providerSelect.value = rfSync.provider;
                            toggleFields(rfSync.provider);
                        }
                        const gistIdEl = document.getElementById("sync-gist-id");
                        if (gistIdEl) gistIdEl.value = rfSync.gistId || '';
                        
                        const gistTokenEl = document.getElementById("sync-gist-token");
                        if (gistTokenEl) gistTokenEl.value = rfSync.gistToken || '';
                        
                        const firebaseUrlEl = document.getElementById("sync-firebase-url");
                        if (firebaseUrlEl) firebaseUrlEl.value = rfSync.firebaseUrl || '';
                        
                        if (autoDetectFields) autoDetectFields.style.display = 'none';
                    }
                }
            } catch (e) {
                console.error("Erro ao importar credenciais do RoutineFlow:", e);
            }
        });
    }

    // Form submission
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            
            const provider = providerSelect.value;
            const gistId = document.getElementById("sync-gist-id").value.trim();
            const gistToken = document.getElementById("sync-gist-token").value.trim();
            const firebaseUrl = document.getElementById("sync-firebase-url").value.trim();

            app.state.syncConfig = {
                provider,
                gistId,
                gistToken,
                firebaseUrl,
                lastSynced: Date.now()
            };

            app.saveState();
            
            if (modal) modal.classList.remove("active");
            
            // Trigger sync immediately
            syncWithCloud(app, true);
        });
    }

    // Auto-sync on startup
    if (app.state.syncConfig && app.state.syncConfig.provider !== 'none') {
        syncWithCloud(app);
        
        // Setup periodic sync every 60 seconds
        setInterval(() => {
            syncWithCloud(app);
        }, 60000);
    }
}
