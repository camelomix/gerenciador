document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('gcm-dashboard-container');
    if (!container) return;

    container.innerHTML = `
        <div class="mb-6 flex justify-between items-center">
            <h1 class="text-3xl font-bold text-white">Dashboard de Cliques</h1>
        </div>
        
        <div class="bg-gray-800 p-4 rounded-lg shadow-lg mb-6 flex flex-wrap items-center justify-between gap-4">
             <div id="period-selector" class="flex items-center gap-2 flex-wrap">
                <button data-period="today" class="period-btn px-3 py-1 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-700 text-white">Hoje</button>
                <button data-period="week-1" class="period-btn active px-3 py-1 text-sm font-semibold rounded-md bg-indigo-600 text-white">7 Dias</button>
                <button data-period="month-1" class="period-btn px-3 py-1 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-700 text-white">30 Dias</button>
                <button data-period="year" class="period-btn px-3 py-1 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-700 text-white">Ano</button>
            </div>
            <div id="custom-period-selector" class="flex items-center gap-2 text-sm flex-wrap">
                <input type="date" id="start-date" class="bg-gray-700 border-gray-600 text-white p-1 rounded-md">
                <span class="text-gray-400">até</span>
                <input type="date" id="end-date" class="bg-gray-700 border-gray-600 text-white p-1 rounded-md">
                <button id="apply-custom-period" class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-1 px-3 rounded-md">Aplicar</button>
            </div>
        </div>

        <div class="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
            <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h2 class="text-xl font-bold text-white">Relatório do Monitor de Links e Preços</h2>
                <button id="run-monitor-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-repeat" viewBox="0 0 16 16"><path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/><path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.5A4.5 4.5 0 0 0 8 3zM3.5 12A4.5 4.5 0 0 0 8 13c1.552 0 2.94-.707 3.857-1.818a.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.5A4.5 4.5 0 0 0 8 13z"/></svg>
                    Verificar Agora
                </button>
            </div>
            <div id="monitor-report-container" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                </div>
            <div id="monitor-report-placeholder" class="text-center py-8 text-gray-500"><p>Carregando relatórios...</p></div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div class="col-span-1 lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 class="text-lg font-semibold text-gray-400 uppercase">Histórico de Cliques no Período</h3>
                <div id="chart-container" style="height: 250px;">
                    <canvas id="clicks-chart"></canvas>
                </div>
                <div id="chart-placeholder" class="text-center py-16 text-gray-500"><div class="loader mx-auto"></div><p class="mt-4">Carregando dados do gráfico...</p></div>
            </div>

            <div class="col-span-1 bg-gray-800 p-6 rounded-lg shadow-lg text-center flex flex-col justify-center">
                <h3 class="text-lg font-semibold text-gray-400 uppercase">Total de Cliques (Geral)</h3>
                <p id="total-clicks" class="text-6xl font-bold text-white mt-4">0</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
                 <h3 class="text-lg font-semibold text-gray-400 uppercase mb-4">Cliques por Produto no Período</h3>
                 <div id="detailed-clicks-list" class="space-y-2"></div>
                 <div id="detailed-clicks-placeholder" class="text-center py-8 text-gray-500"><p>Carregando...</p></div>
                 <div id="pagination-controls" class="flex justify-between items-center mt-4 text-sm"></div>
            </div>

            <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 class="text-lg font-semibold text-gray-400 uppercase mb-4">Top 10 Produtos Mais Clicados (Geral)</h3>
                <div id="top-products-container">
                    <ul id="top-products-list" class="space-y-3"></ul>
                    <div id="top-products-placeholder" class="text-center py-8 text-gray-500"><p>Nenhum clique registrado para gerar o Top 10.</p></div>
                </div>
            </div>
        </div>
        `;

    const { api_url, nonce } = gcm_data;
    let clicksChart = null;
    let currentPage = 1;
    let currentPeriod = 'week-1';
    let customStartDate = '';
    let customEndDate = '';

    const fetchAndRenderDashboard = async () => {
        document.getElementById('chart-placeholder').style.display = 'block';
        document.getElementById('chart-container').style.display = 'none';
        document.getElementById('detailed-clicks-placeholder').innerHTML = '<div class="loader mx-auto"></div>';

        const params = new URLSearchParams({ page: currentPage });
        if (currentPeriod === 'custom' && customStartDate && customEndDate) {
            params.append('start', customStartDate);
            params.append('end', customEndDate);
        } else {
            params.append('period', currentPeriod);
        }
        
        try {
            const response = await fetch(`${api_url}dashboard?${params.toString()}`, {
                headers: { 'X-WP-Nonce': nonce }
            });
            if (!response.ok) throw new Error('Falha na resposta da rede.');
            const data = await response.json();
            
            document.getElementById('total-clicks').textContent = data.total_clicks || 0;
            renderChart(data.history?.labels, data.history?.data);
            renderTopProducts(data.top_products);
            renderDetailedClicks(data.detailed_clicks?.items);
            renderPagination(data.detailed_clicks?.pagination);

        } catch (error) {
            document.getElementById('chart-placeholder').innerHTML = `<p class="text-red-400">Erro ao carregar dados: ${error.message}</p>`;
            document.getElementById('detailed-clicks-placeholder').innerHTML = `<p class="text-red-400">Erro ao carregar produtos.</p>`;
        }
    };
    
    const fetchAndRenderMonitorReports = async () => {
        const placeholder = document.getElementById('monitor-report-placeholder');
        const container = document.getElementById('monitor-report-container');
        placeholder.innerHTML = '<div class="loader mx-auto"></div><p class="mt-4">Carregando relatórios...</p>';
        placeholder.style.display = 'block';
        container.innerHTML = '';

        try {
            const response = await fetch(`${api_url}dashboard/monitor-report`, {
                headers: { 'X-WP-Nonce': nonce }
            });
            if (!response.ok) throw new Error('Falha ao buscar relatórios.');
            const data = await response.json();

            placeholder.style.display = 'none';
            
            let brokenLinksHtml = `
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h4 class="font-semibold text-red-400 mb-3">Links Quebrados</h4>`;
            if (data.broken_links && data.broken_links.length > 0) {
                brokenLinksHtml += '<ul class="space-y-2 text-sm">';
                data.broken_links.forEach(link => {
                    brokenLinksHtml += `
                        <li class="flex justify-between items-center flex-wrap gap-2">
                            <a href="/wp-admin/post.php?post=${link.id}&action=edit" target="_blank" class="text-gray-300 hover:text-white">${link.name}</a>
                            <span class="font-mono text-xs bg-red-900 text-red-300 px-2 py-1 rounded-md">Status: ${link.status}</span>
                        </li>`;
                });
                brokenLinksHtml += '</ul>';
            } else {
                brokenLinksHtml += '<p class="text-sm text-gray-400">Nenhum link quebrado encontrado. Tudo certo!</p>';
            }
            brokenLinksHtml += '</div>';
            
            let priceChangesHtml = `
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h4 class="font-semibold text-green-400 mb-3">Preços Atualizados</h4>`;
            if (data.price_changes && data.price_changes.length > 0) {
                priceChangesHtml += '<ul class="space-y-2 text-sm">';
                data.price_changes.forEach(change => {
                    priceChangesHtml += `
                        <li class="flex justify-between items-center flex-wrap gap-2">
                            <a href="/wp-admin/post.php?post=${change.id}&action=edit" target="_blank" class="text-gray-300 hover:text-white">${change.name}</a>
                            <span class="text-gray-400">R$ ${Number(change.old_price).toFixed(2)} &rarr; <strong class="text-white">R$ ${Number(change.new_price).toFixed(2)}</strong></span>
                        </li>`;
                });
                priceChangesHtml += '</ul>';
            } else {
                priceChangesHtml += '<p class="text-sm text-gray-400">Nenhum preço foi alterado na última verificação.</p>';
            }
            priceChangesHtml += '</div>';

            container.innerHTML = brokenLinksHtml + priceChangesHtml;

        } catch (error) {
            placeholder.innerHTML = `<p class="text-red-400">Erro ao carregar relatórios: ${error.message}</p>`;
        }
    };
    
    const renderChart = (labels, data) => {
        const chartPlaceholder = document.getElementById('chart-placeholder');
        const chartContainer = document.getElementById('chart-container');
        if (labels && labels.length > 0 && data.some(d => d > 0)) {
            chartPlaceholder.style.display = 'none';
            chartContainer.style.display = 'block';
            const ctx = document.getElementById('clicks-chart').getContext('2d');
            if (clicksChart) clicksChart.destroy();
            clicksChart = new Chart(ctx, {
                type: 'line',
                data: { labels, datasets: [{ label: 'Cliques', data, backgroundColor: 'rgba(79, 70, 229, 0.2)', borderColor: 'rgba(79, 70, 229, 1)', borderWidth: 2, tension: 0.3, fill: true }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { color: '#9ca3af', precision: 0 }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }, x: { ticks: { color: '#9ca3af' }, grid: { display: false } } }, plugins: { legend: { display: false } } }
            });
        } else {
            chartPlaceholder.style.display = 'block';
            chartContainer.style.display = 'none';
            chartPlaceholder.innerHTML = '<p>Nenhum clique registrado no período para gerar o gráfico.</p>';
        }
    };

    const renderTopProducts = (products) => {
        const list = document.getElementById('top-products-list');
        const placeholder = document.getElementById('top-products-placeholder');
        if (products && products.length > 0) {
            placeholder.style.display = 'none';
            list.innerHTML = products.map(p => `
                <li class="flex justify-between items-center text-sm text-gray-300 pb-2 border-b border-gray-700">
                    <div class="flex items-center gap-3">
                        <img src="${p.thumbnail_url}" alt="${p.post_title}" class="w-10 h-10 rounded-md object-cover">
                        <span class="font-medium text-white">${p.post_title}</span>
                    </div>
                    <span class="font-bold text-white bg-gray-700 px-2 py-1 rounded-md">${p.clicks} cliques</span>
                </li>
            `).join('');
        } else {
            placeholder.style.display = 'block';
            list.innerHTML = '';
        }
    };
    
    const renderDetailedClicks = (items) => {
        const list = document.getElementById('detailed-clicks-list');
        const placeholder = document.getElementById('detailed-clicks-placeholder');
        if (items && items.length > 0) {
            placeholder.style.display = 'none';
            list.innerHTML = items.map(p => `
                <div class="flex justify-between items-center text-sm text-gray-300 p-2 rounded-md hover:bg-gray-700">
                    <div class="flex items-center gap-3">
                        <img src="${p.thumbnail_url}" alt="${p.post_title}" class="w-10 h-10 rounded-md object-cover">
                        <span class="font-medium text-white">${p.post_title}</span>
                    </div>
                    <span class="font-bold text-white bg-gray-600 px-2 py-1 rounded-md">${p.clicks} cliques</span>
                </div>
            `).join('');
        } else {
            placeholder.style.display = 'block';
            list.innerHTML = '';
            placeholder.innerHTML = '<p>Nenhum produto foi clicado neste período.</p>';
        }
    };

    const renderPagination = (pagination) => {
        const controls = document.getElementById('pagination-controls');
        if (!pagination || pagination.total_pages <= 1) {
            controls.innerHTML = '';
            return;
        }
        const { current_page, total_pages } = pagination;
        controls.innerHTML = `
            <button id="prev-page" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md" ${current_page === 1 ? 'disabled' : ''}>Anterior</button>
            <span class="text-gray-400">Página ${current_page} de ${total_pages}</span>
            <button id="next-page" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md" ${current_page === total_pages ? 'disabled' : ''}>Próximo</button>
        `;
    };

    document.querySelectorAll('.period-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active', 'bg-indigo-600'));
            this.classList.add('active', 'bg-indigo-600');
            currentPeriod = this.dataset.period;
            currentPage = 1;
            fetchAndRenderDashboard();
        });
    });

    document.getElementById('apply-custom-period').addEventListener('click', () => {
        const start = document.getElementById('start-date').value;
        const end = document.getElementById('end-date').value;
        if (start && end) {
            document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active', 'bg-indigo-600'));
            currentPeriod = 'custom';
            customStartDate = start;
            customEndDate = end;
            currentPage = 1;
            fetchAndRenderDashboard();
        } else {
            alert('Por favor, selecione as datas de início e fim.');
        }
    });

    document.getElementById('run-monitor-btn').addEventListener('click', async (e) => {
        const button = e.currentTarget;
        const originalContent = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<div class="loader-sm"></div><span class="ml-2">Verificando...</span>';

        try {
            const response = await fetch(`${api_url}tools/run-monitor`, {
                method: 'POST',
                headers: { 'X-WP-Nonce': nonce }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Erro desconhecido');
            
            await fetchAndRenderMonitorReports();

        } catch (error) {
            alert(`Erro ao executar o monitor: ${error.message}`);
        } finally {
            button.disabled = false;
            button.innerHTML = originalContent;
        }
    });


    container.addEventListener('click', e => {
        if (e.target.id === 'prev-page') {
            if (currentPage > 1) {
                currentPage--;
                fetchAndRenderDashboard();
            }
        }
        if (e.target.id === 'next-page') {
            currentPage++;
            fetchAndRenderDashboard();
        }
    });

    fetchAndRenderDashboard();
    fetchAndRenderMonitorReports();
});