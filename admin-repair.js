document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('gcm-repair-container')) {
        initializeRepairApp();
    }
});

function initializeRepairApp() {
    const container = document.getElementById('gcm-repair-container');
    const { api_url, nonce } = gcm_data;

    container.innerHTML = `
        <div class="mb-6">
            <h1 class="text-3xl font-bold text-white">Ferramentas de Reparo e Diagnóstico</h1>
            <p class="text-gray-400 mt-1">Use estas ferramentas para corrigir problemas de sincronização e diagnosticar o comportamento dos produtos.</p>
        </div>
        <div id="repair-content" class="space-y-6">
            <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold text-white">1. Ferramenta de Diagnóstico de Produto</h2>
                <p class="text-gray-400 my-4">Se um produto específico não está com o layout correto ou não rastreia cliques, insira o ID do produto WooCommerce aqui para ver um relatório detalhado.</p>
                <div class="flex items-center gap-4">
                    <input type="number" id="debug-product-id" class="form-input" placeholder="Insira o ID do Produto WooCommerce">
                    <button id="run-debug-btn" class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M11.5 8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z"/><path d="M9.428 11.544a.5.5 0 0 0 .707.707l3.536-3.536a.5.5 0 0 0 0-.707l-3.536-3.536a.5.5 0 0 0-.707.707L12.22 7.5H1.5a.5.5 0 0 0 0 1h10.72L9.428 11.544z"/></svg>
                        <span>Verificar Produto</span>
                    </button>
                </div>
                <div id="debug-status" class="mt-4 text-sm font-mono bg-gray-900 p-4 rounded-md hidden whitespace-pre-wrap"></div>
            </div>

            <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold text-white">2. Sincronização Automática</h2>
                <p class="text-gray-400 my-4">Clique no botão para tentar uma sincronização automática baseada na similaridade dos títulos. Isso pode resolver a maioria dos casos.</p>
                <button id="run-auto-sync-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-magic" viewBox="0 0 16 16"><path d="M9.5 2.672a.5.5 0 1 0 1 0V.843a.5.5 0 0 0-1 0v1.829Zm4.5.035A.5.5 0 0 0 13.293 2L12 3.293a.5.5 0 0 0 .707.707L14 2.707a.5.5 0 0 0 0-.707ZM7.293 4L8 3.293a.5.5 0 0 0-.707-.707L6 3.293a.5.5 0 0 0 0 .707L7.293 4Z"/><path d="M13.672 10.5a.5.5 0 1 0 0-1h-1.829a.5.5 0 0 0 0 1h1.829Zm-1.5-2.035a.5.5 0 0 0-.707 0L10.293 9.5a.5.5 0 1 0 .707.707l1.172-1.172a.5.5 0 0 0 0-.707ZM4.5 1.5a.5.5 0 0 0 0 1h1.829a.5.5 0 0 0 0-1H4.5Zm-2.035 1.5a.5.5 0 0 0 0 .707L3.707 4.9a.5.5 0 0 0 .707-.707L3.293 3.03a.5.5 0 0 0-.707 0Zm.001 4.5a.5.5 0 0 0 0 1h1.829a.5.5 0 1 0 0-1H2.466Z"/><path d="M10.293 1.5a.5.5 0 0 0 .707 0l1.172 1.171a.5.5 0 1 0 .707-.707l-1.172-1.171a.5.5 0 0 0-.707 0ZM1.5 4.5a.5.5 0 0 0 1 0V2.672a.5.5 0 0 0-1 0V4.5Zm1.172.707a.5.5 0 0 0 .707 0L4.5 4.03a.5.5 0 0 0-.707-.707L2.672 4.5a.5.5 0 0 0 0 .707Zm10.516-.001a.5.5 0 0 0-.707 0L12 5.672a.5.5 0 0 0 .707.707l1.172-1.172a.5.5 0 0 0 0-.707ZM2.5 10.5a.5.5 0 0 0 0-1H.672a.5.5 0 0 0 0 1H2.5Z"/><path d="M6.378 11.247a.5.5 0 0 0 .707 0l1.172-1.171a.5.5 0 0 0-.707-.708L6.378 10.54a.5.5 0 0 0 0 .707Zm1.829-1.828a.5.5 0 0 0 0-.707L7.034 7.5a.5.5 0 0 0-.707.707l1.172 1.172a.5.5 0 0 0 .707 0ZM6 13.5a.5.5 0 0 0 .5.5h1.829a.5.5 0 0 0 0-1H6.5a.5.5 0 0 0-.5.5Zm3.793-1.707a.5.5 0 0 0 0-.707L8.621 10a.5.5 0 0 0-.707.707l1.172 1.172a.5.5 0 0 0 .707 0Z"/></svg>
                    <span>Tentar Sincronização Automática</span>
                </button>
                <div id="auto-sync-status" class="mt-4 text-sm"></div>
            </div>

            <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold text-white">3. Sincronização Manual</h2>
                <p class="text-gray-400 my-4">Se a sincronização automática não resolver, você pode ligar os produtos manualmente aqui. Selecione o produto WooCommerce correspondente na lista e clique em "Ligar".</p>
                <div id="manual-sync-area" class="mt-4"><div class="loader mx-auto"></div></div>
            </div>
        </div>
        <style>.form-input { background-color: #374151; border: 1px solid #4b5563; color: #d1d5db; width: 100%; border-radius: 0.375rem; padding: 0.5rem 0.75rem; }</style>
    `;

    const apiRequest = async (endpoint, options = {}) => {
        const headers = { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce, ...options.headers };
        const response = await fetch(api_url + endpoint, { ...options, headers });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido.' }));
            throw new Error(errorData.message || 'Falha na comunicação com o servidor.');
        }
        return response.json();
    };

    const renderManualSyncUI = (data) => {
        const syncArea = document.getElementById('manual-sync-area');
        if (!data.unlinked_gcm || data.unlinked_gcm.length === 0) {
            syncArea.innerHTML = '<p class="text-green-400 font-bold">Parabéns! Nenhum produto GCM precisa de sincronização manual.</p>';
            return;
        }

        let wooOptionsHtml = '<option value="">Selecione um produto WooCommerce...</option>';
        data.unlinked_woo.forEach(p => {
            wooOptionsHtml += `<option value="${p.id}">${p.title} (ID: ${p.id})</option>`;
        });

        let tableHtml = `
            <table class="w-full text-sm text-left text-gray-300">
                <thead class="text-xs text-gray-400 uppercase bg-gray-700">
                    <tr>
                        <th class="px-6 py-3">Produto GCM (sem link)</th>
                        <th class="px-6 py-3">Produto WooCommerce Correspondente</th>
                        <th class="px-6 py-3">Ação</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.unlinked_gcm.forEach(p => {
            tableHtml += `
                <tr id="row-gcm-${p.id}" class="bg-gray-800 border-b border-gray-700">
                    <td class="px-6 py-4 font-medium text-white">${p.title} (ID: ${p.id})</td>
                    <td class="px-6 py-4">
                        <select id="select-woo-for-${p.id}" class="form-input text-white" style="background-color: #374151; border-color: #4b5563;">${wooOptionsHtml}</select>
                    </td>
                    <td class="px-6 py-4">
                        <button class="manual-link-btn bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-xs" data-gcm-id="${p.id}">Ligar</button>
                    </td>
                </tr>
            `;
        });

        tableHtml += '</tbody></table>';
        syncArea.innerHTML = tableHtml;
    };

    const loadUnlinkedData = async () => {
        const syncArea = document.getElementById('manual-sync-area');
        try {
            const data = await apiRequest('products/unlinked-data');
            renderManualSyncUI(data);
        } catch(error) {
            syncArea.innerHTML = `<p class="text-red-400">Erro ao carregar dados: ${error.message}</p>`;
        }
    };

    document.getElementById('run-debug-btn').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const statusDiv = document.getElementById('debug-status');
        const productId = document.getElementById('debug-product-id').value;

        if (!productId) {
            alert('Por favor, insira um ID de produto.');
            return;
        }

        btn.disabled = true;
        btn.querySelector('span').textContent = 'Verificando...';
        statusDiv.classList.remove('hidden');
        statusDiv.innerHTML = '<div class="loader-sm mx-auto"></div>';

        try {
            const result = await apiRequest('debug/check-product', {
                method: 'POST',
                body: JSON.stringify({ product_id: productId })
            });
            
            let resultHtml = '<strong>Relatório de Diagnóstico:</strong>\n\n';
            for (const key in result) {
                resultHtml += `${key}: ${result[key]}\n`;
            }
            statusDiv.textContent = resultHtml;

        } catch (error) {
            statusDiv.textContent = `Ocorreu um erro: ${error.message}`;
        } finally {
            btn.disabled = false;
            btn.querySelector('span').textContent = 'Verificar Produto';
        }
    });

    document.getElementById('run-auto-sync-btn').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const statusDiv = document.getElementById('auto-sync-status');
        
        btn.disabled = true;
        btn.querySelector('span').textContent = 'Sincronizando...';
        statusDiv.innerHTML = `<p class="text-yellow-400">Iniciando... Isso pode levar alguns minutos.</p>`;

        try {
            const result = await apiRequest('products/repair-sync', { method: 'POST' });
            statusDiv.innerHTML = `
                <p class="text-green-400 font-bold">Sincronização Automática Concluída!</p>
                <ul>
                    <li class="text-gray-300">- Produtos GCM encontrados: ${result.gcm_products_found}</li>
                    <li class="text-gray-300">- Produtos WooCommerce encontrados: ${result.woo_products_found}</li>
                    <li class="text-gray-300">- Produtos Corrigidos/Sincronizados: ${result.products_relinked}</li>
                </ul>
                <p class="mt-2 text-gray-300">A lista de sincronização manual abaixo foi atualizada.</p>
            `;
            btn.querySelector('span').textContent = 'Rodar Novamente';
            loadUnlinkedData();
        } catch (error) {
            statusDiv.innerHTML = `<p class="text-red-400">Ocorreu um erro: ${error.message}</p>`;
            btn.querySelector('span').textContent = 'Tentar Novamente';
        } finally {
            btn.disabled = false;
        }
    });

    document.getElementById('manual-sync-area').addEventListener('click', async (e) => {
        if (!e.target.classList.contains('manual-link-btn')) return;

        const btn = e.target;
        const gcmId = btn.dataset.gcmId;
        const wooSelect = document.getElementById(`select-woo-for-${gcmId}`);
        const wooId = wooSelect.value;

        if (!wooId) {
            alert('Por favor, selecione um produto WooCommerce para ligar.');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Ligando...';

        try {
            const result = await apiRequest('products/manual-link', {
                method: 'POST',
                body: JSON.stringify({ gcm_id: gcmId, woo_id: wooId })
            });
            const row = document.getElementById(`row-gcm-${gcmId}`);
            row.style.transition = 'opacity 0.5s';
            row.style.opacity = '0';
            setTimeout(() => {
                row.remove();
                if(document.querySelectorAll('#manual-sync-area tbody tr').length === 0){
                     document.getElementById('manual-sync-area').innerHTML = '<p class="text-green-400 font-bold">Parabéns! Nenhum produto GCM precisa de sincronização manual.</p>';
                }
            }, 500);

        } catch (error) {
            alert(`Erro ao ligar os produtos: ${error.message}`);
            btn.disabled = false;
            btn.textContent = 'Ligar';
        }
    });

    loadUnlinkedData();
}