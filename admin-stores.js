document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('gcm-stores-container');
    if (!container) return;

    const { api_url, nonce } = gcm_data;

    const api = {
        getRules: () => fetch(api_url + 'stores', { headers: { 'X-WP-Nonce': nonce } }).then(res => res.json()),
        saveRules: (data) => fetch(api_url + 'stores', {
            method: 'POST',
            headers: { 'X-WP-Nonce': nonce, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).then(res => res.json())
    };

    // --- INÍCIO DA ALTERAÇÃO ---
    // Renderiza a regra com os dois novos campos para preço e remove o campo antigo.
    const renderRule = (rule = {}, index) => {
        const currentRule = rule || {};
        return `
            <tr class="gcm-rule-item">
                <td class="p-4 border-b border-gray-700" colspan="2">
                    <div class="bg-gray-700 p-4 rounded-lg space-y-3">
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-bold text-white">Regra #${index + 1}</h3>
                            <button class="remove-rule-btn bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-3 rounded-md text-sm">Remover</button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium">Domínio da Loja (sem www)</label>
                                <input type="text" value="${currentRule.domain || ''}" class="gcm-rule-input gcm-rule-domain w-full bg-gray-600 p-2 rounded-md mt-1 text-sm" placeholder="ex: amazon.com.br">
                            </div>
                            <div>
                                <label class="block text-sm font-medium">Seletor CSS do Título</label>
                                <input type="text" value="${currentRule.title_selector || ''}" class="gcm-rule-input gcm-rule-title_selector w-full bg-gray-600 p-2 rounded-md mt-1 text-sm" placeholder="ex: #productTitle">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-green-400">Seletor de Preço PROMOCIONAL</label>
                                <input type="text" value="${currentRule.sale_price_selector || ''}" class="gcm-rule-input gcm-rule-sale_price_selector w-full bg-gray-600 p-2 rounded-md mt-1 text-sm" placeholder="Seletor para o preço atual/baixo">
                            </div>
                             <div>
                                <label class="block text-sm font-medium text-gray-400">Seletor de Preço REGULAR (Fallback)</label>
                                <input type="text" value="${currentRule.regular_price_selector || ''}" class="gcm-rule-input gcm-rule-regular_price_selector w-full bg-gray-600 p-2 rounded-md mt-1 text-sm" placeholder="Seletor para o preço antigo/riscado">
                            </div>
                            <div>
                                <label class="block text-sm font-medium">Seletor CSS da Descrição</label>
                                <input type="text" value="${currentRule.desc_selector || ''}" class="gcm-rule-input gcm-rule-desc_selector w-full bg-gray-600 p-2 rounded-md mt-1 text-sm" placeholder="ex: #feature-bullets">
                            </div>
                            <div>
                                <label class="block text-sm font-medium">Seletor CSS da Galeria (Imagens)</label>
                                <input type="text" value="${currentRule.gallery_selector || ''}" class="gcm-rule-input gcm-rule-gallery_selector w-full bg-gray-600 p-2 rounded-md mt-1 text-sm" placeholder="ex: #altImages img">
                            </div>
                            <div>
                                <label class="block text-sm font-medium">Seletor CSS das Especificações (Tabela)</label>
                                <input type="text" value="${currentRule.specs_selector || ''}" class="gcm-rule-input gcm-rule-specs_selector w-full bg-gray-600 p-2 rounded-md mt-1 text-sm" placeholder="ex: #productDetails_techSpec_section_1">
                            </div>
                            <div>
                                <label class="block text-sm font-medium">Seletor CSS do Vídeo (iframe)</label>
                                <input type="text" value="${currentRule.video_selector || ''}" class="gcm-rule-input gcm-rule-video_selector w-full bg-gray-600 p-2 rounded-md mt-1 text-sm" placeholder="ex: .video-container iframe">
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    };

    const handleSave = async (e) => {
        const button = e.currentTarget;
        button.disabled = true;
        button.textContent = 'Salvando...';

        const newRules = [];
        document.querySelectorAll('.gcm-rule-item').forEach(item => {
            newRules.push({
                domain: item.querySelector('.gcm-rule-domain').value.trim(),
                title_selector: item.querySelector('.gcm-rule-title_selector').value.trim(),
                sale_price_selector: item.querySelector('.gcm-rule-sale_price_selector').value.trim(),
                regular_price_selector: item.querySelector('.gcm-rule-regular_price_selector').value.trim(),
                desc_selector: item.querySelector('.gcm-rule-desc_selector').value.trim(),
                gallery_selector: item.querySelector('.gcm-rule-gallery_selector').value.trim(),
                specs_selector: item.querySelector('.gcm-rule-specs_selector').value.trim(),
                video_selector: item.querySelector('.gcm-rule-video_selector').value.trim(),
            });
        });
        // --- FIM DA ALTERAÇÃO ---

        try {
            const response = await api.saveRules(newRules);
            alert(response.message || 'Regras salvas!');
        } catch (error) {
            alert(`Erro ao salvar: ${error.message}`);
        } finally {
            button.disabled = false;
            button.textContent = 'Salvar Todas as Regras';
        }
    };
    
    const setupEventListeners = () => {
        const saveBtn = document.getElementById('save-rules-btn');
        const addBtn = document.getElementById('add-rule-btn');
        const rulesListBody = document.getElementById('rules-list-body');

        if (saveBtn) {
            saveBtn.addEventListener('click', handleSave);
        }

        if (addBtn) {
            addBtn.addEventListener('click', () => {
                if (rulesListBody.querySelector('td') && rulesListBody.querySelector('td').colSpan !== 2) {
                    rulesListBody.innerHTML = '';
                }
                const newIndex = document.querySelectorAll('.gcm-rule-item').length;
                rulesListBody.insertAdjacentHTML('beforeend', renderRule({}, newIndex));
            });
        }
        
        if (rulesListBody) {
             rulesListBody.addEventListener('click', e => {
                if (e.target.classList.contains('remove-rule-btn')) {
                    if (confirm('Tem certeza que deseja remover esta regra?')) {
                        e.target.closest('.gcm-rule-item').remove();
                    }
                }
            });
        }
    };

    const render = () => {
        container.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h1 class="text-3xl font-bold text-white">Lojas e Regras de Extração</h1>
                    <p class="text-gray-400 mt-1">Configure os seletores CSS para cada loja que você usa.</p>
                </div>
                <div>
                    <button id="add-rule-btn" class="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700">+ Adicionar Nova Regra</button>
                    <button id="save-rules-btn" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 ml-2">Salvar Todas as Regras</button>
                </div>
            </div>
            <div class="bg-gray-800 rounded-lg shadow-lg">
                <table class="w-full">
                    <tbody id="rules-list-body">
                        </tbody>
                </table>
                 <div id="rules-list-placeholder" class="text-center py-16 text-gray-500"><div class="loader mx-auto"></div><p class="mt-4">Carregando regras...</p></div>
            </div>
        `;
        
        const rulesListBody = document.getElementById('rules-list-body');
        const placeholder = document.getElementById('rules-list-placeholder');

        api.getRules().then(data => {
            const rules = data || [];
            placeholder.style.display = 'none';
            if (rules.length > 0) {
                rulesListBody.innerHTML = rules.map(renderRule).join('');
            } else {
                rulesListBody.innerHTML = '<tr><td class="text-center py-8 text-gray-400">Nenhuma regra adicionada ainda.</td></tr>';
            }
            setupEventListeners();
        }).catch(err => {
            placeholder.innerHTML = `<p class="text-red-400 text-center">Erro ao carregar regras: ${err.message}</p>`;
        });
    };

    render();
});