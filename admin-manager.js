// VERSÃO FINAL E ESTÁVEL - 23/07/2025
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('gcm-app-container')) {
        initializeManagerApp();
    }
});

function initializeManagerApp() {
    const appContainer = document.getElementById('gcm-app-container');
    if (!appContainer) return;

    appContainer.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div><h1 class="text-3xl font-bold text-white">Seus Produtos</h1><p class="text-gray-400 mt-1">Gerencie e publique seus produtos de afiliação na sua loja.</p></div>
            <div class="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
                 <button id="settings-btn" class="p-2 rounded-lg bg-gray-600 hover:bg-gray-700" title="Configurações"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-gear-fill" viewBox="0 0 16 16"><path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311a1.464 1.464 0 0 1 0 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105 0l.17.31c.698 1.283 2.686.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 0-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105 0l-.17-.31zM8 10.93a2.929 2.929 0 1 1 0-5.858 2.929 2.929 0 0 1 0 5.858z"/></svg></button>
                 <div class="relative inline-block text-left">
                    <div><button type="button" id="backup-menu-btn" class="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-700">Backup/Restore<svg class="-mr-1 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" /></svg></button></div>
                    <div id="backup-menu" class="hidden absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-gray-700 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"><div class="py-1"><a href="#" id="backup-btn" class="text-gray-200 block px-4 py-2 text-sm hover:bg-gray-600">Salvar Backup</a><a href="#" id="restore-btn" class="text-gray-200 block px-4 py-2 text-sm hover:bg-gray-600">Restaurar</a></div></div>
                 </div>
                 <button id="add-product-btn" class="w-full md:w-auto bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">+ Adicionar Produto</button>
                 <input type="file" id="restore-input" class="hidden" accept=".json">
            </div>
        </div>
        <div class="flex justify-between items-center mb-4 flex-wrap gap-4">
            <div id="bulk-actions-bar" class="hidden bg-gray-700 p-3 rounded-lg flex items-center justify-between gap-2">
                <span id="selection-count" class="font-bold text-white"></span>
                 <div class="flex items-center space-x-2">
                    <button id="bulk-publish-woo-btn" class="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1 px-3 rounded-md text-sm">Publicar no Woo</button>
                    <button id="bulk-edit-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded-md text-sm">Edição em Massa</button>
                    <button id="bulk-delete-btn" class="bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-3 rounded-md text-sm">Excluir</button>
                </div>
            </div>
            <div class="flex-grow flex items-center gap-4 justify-end">
                <input type="search" id="product-search-input" placeholder="Buscar produtos..." class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2">
                <select id="category-filter" class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2"><option value="all">Todas as Categorias</option></select>
            </div>
        </div>
        <div class="bg-gray-800 rounded-lg shadow-lg overflow-x-auto">
            <table class="w-full text-sm text-left text-gray-300">
                <thead class="text-xs text-gray-400 uppercase bg-gray-700">
                    <tr>
                        <th scope="col" class="p-4"><input type="checkbox" id="select-all-checkbox" class="bg-gray-700"></th>
                        <th scope="col" class="px-6 py-3">ID</th>
                        <th scope="col" class="px-6 py-3">Produto</th>
                        <th scope="col" class="px-6 py-3">Cliques</th>
                        <th scope="col" class="px-6 py-3">Preço</th>
                        <th scope="col" class="px-6 py-3">Categoria</th>
                        <th scope="col" class="px-6 py-3">Ações</th>
                    </tr>
                </thead>
                <tbody id="product-table-body"></tbody>
             </table>
            <div id="table-placeholder" class="text-center py-16 text-gray-500"><div class="loader mx-auto"></div><p class="mt-4">Carregando produtos...</p></div>
        </div>
        <div id="pagination-controls" class="flex justify-between items-center mt-4 text-sm text-gray-400"></div>
        <div id="modal-container"></div>
    `;

    const { api_url, nonce } = gcm_data;
    let products = [];
    let categories = [];
    let geminiApiKey = '';
    let googleTtsApiKey = '';
    let currentFilter = 'all';
    let currentPage = 1;
    let currentSearch = '';
    let totalPages = 1;
    let searchDebounceTimeout;

    const modalContainer = document.getElementById('modal-container');
    const productTableBody = document.getElementById('product-table-body');
    const tablePlaceholder = document.getElementById('table-placeholder');
    const bulkActionsBar = document.getElementById('bulk-actions-bar');
    const selectionCount = document.getElementById('selection-count');
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const categoryFilter = document.getElementById('category-filter');
    const searchInput = document.getElementById('product-search-input');
    const paginationControls = document.getElementById('pagination-controls');
    
    const api = {
        async request(endpoint, options = {}) {
            const headers = { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce, ...options.headers };
            const response = await fetch(api_url + endpoint, { ...options, headers });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido.' }));
                throw new Error(errorData.message || 'Erro na comunicação com a API.');
            }
            if (response.status === 204 || response.headers.get('Content-Length') === '0') return null;
            return response.json();
        },
        getProducts: (page = 1, search = '', category = 'all') => api.request(`products?page=${page}&s=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`),
        createProduct: (data) => api.request('products', { method: 'POST', body: JSON.stringify(data) }),
        updateProduct: (id, data) => api.request(`products/${id}`, { method: 'POST', body: JSON.stringify(data) }),
        deleteProducts: (ids) => api.request('products', { method: 'DELETE', body: JSON.stringify({ ids }) }),
        bulkUpdateProducts: (data) => api.request('products/bulk-update', { method: 'POST', body: JSON.stringify(data) }),
        getSettings: () => api.request('settings'),
        updateSettings: (data) => api.request('settings', { method: 'POST', body: JSON.stringify(data) }),
        publishToWoo: (ids) => api.request('products/publish-to-woocommerce', { method: 'POST', body: JSON.stringify({ ids }) }),
        extractFromUrl: (targetUrl) => api.request('tools/extract-from-url', { method: 'POST', body: JSON.stringify({ target_url: targetUrl }) }),
        generateAudio: (text) => api.request('tools/generate-audio', { method: 'POST', body: JSON.stringify({ text }) })
    };

    const copyToClipboard = (text, buttonElement) => {
        if (typeof text !== 'string' || !text) return;
        navigator.clipboard.writeText(text).then(() => {
            if (buttonElement) {
                const originalContent = buttonElement.innerHTML;
                buttonElement.innerHTML = `Copiado!`;
                buttonElement.classList.add('bg-green-500');
                setTimeout(() => { 
                    buttonElement.innerHTML = originalContent;
                    buttonElement.classList.remove('bg-green-500');
                }, 2000);
            }
         }).catch(err => console.error('Falha ao copiar texto: ', err));
    };
	
    const stripHtml = (html) => {
       if (!html) return "";
       const doc = new DOMParser().parseFromString(html, 'text/html');
       doc.querySelectorAll('audio').forEach(audio => audio.remove());
       return doc.body.textContent || "";
    };

    const renderPagination = () => {
        if (totalPages <= 1) {
            paginationControls.innerHTML = '';
            return;
        }
        
        paginationControls.innerHTML = `
            <button id="prev-page-btn" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
            <span>Página ${currentPage} de ${totalPages}</span>
            <button id="next-page-btn" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg" ${currentPage === totalPages ? 'disabled' : ''}>Próxima</button>
        `;
    };
    const renderTable = () => {
        productTableBody.innerHTML = '';
        tablePlaceholder.style.display = 'block';

        if (products.length === 0) {
            if (currentSearch) {
                 tablePlaceholder.innerHTML = `<p>Nenhum produto encontrado para o termo "${currentSearch}".</p>`;
            } else if (currentFilter !== 'all') {
                 tablePlaceholder.innerHTML = `<p>Nenhum produto encontrado na categoria "${currentFilter}".</p>`;
            } else {
                 tablePlaceholder.innerHTML = '<p>Nenhum produto adicionado ainda.</p><p class="text-sm">Clique em "+ Adicionar Produto" para começar.</p>';
            }
        } else {
            tablePlaceholder.style.display = 'none';
            products.forEach(product => {
                const tr = document.createElement('tr');
                tr.className = 'bg-gray-800 border-b border-gray-700 hover:bg-gray-600';
                const publishedBadge = product.woo_id ? `<span class="ml-2 text-xs font-medium bg-green-900 text-green-300 px-2 py-0.5 rounded">Publicado</span>` : '';
                
                tr.innerHTML = `
                    <td class="w-4 p-4"><input type="checkbox" class="product-checkbox bg-gray-700" data-id="${product.id}" ${product.woo_id ? 'disabled' : ''}></td>
                    <td class="px-6 py-4 font-bold">${product.id}</td>
                    <td class="px-6 py-4 font-medium text-white">
                        <div class="flex items-center space-x-3">
                            <img class="w-10 h-10 rounded-md object-cover" src="${(product.images && product.images[0]) || ''}" alt="${product.title}" onerror="this.src='https://placehold.co/40x40/374151/9ca3af?text=Img'"/>
                            <span>${product.title || 'Produto sem título'}${publishedBadge}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-center">${product.click_count || 0}</td>
                    <td class="px-6 py-4">${product.price || 'N/A'}</td>
                    <td class="px-6 py-4">${product.category || 'Sem Categoria'}</td>
                    <td class="px-6 py-4">
                         <div class="flex items-center space-x-4">
                            <button class="details-btn text-blue-400 hover:text-blue-300" title="Editar Detalhes" data-id="${product.id}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></button>
                            <button class="share-btn text-green-400 hover:text-green-300" title="Compartilhar Anúncio" data-id="${product.id}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-share-fill" viewBox="0 0 16 16"><path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z"/></svg></button>
                            <button class="copy-link-btn text-cyan-400 hover:text-cyan-300" title="Copiar Link de Afiliado" data-id="${product.id}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-link-45deg" viewBox="0 0 16 16"><path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z"/><path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z"/></svg></button>
                        </div>
                    </td>`;
                productTableBody.appendChild(tr);
            });
        }
        updateBulkActions();
        renderPagination();
    };

    const fetchProducts = async (page, search, category) => {
        tablePlaceholder.innerHTML = '<div class="loader mx-auto"></div><p class="mt-4">Carregando produtos...</p>';
        tablePlaceholder.style.display = 'block';
        productTableBody.innerHTML = '';

        try {
            const data = await api.getProducts(page, search, category);
            products = data.products;
            totalPages = data.pagination.total_pages;
            currentPage = data.pagination.current_page;
            renderTable();
        } catch (error) {
            tablePlaceholder.innerHTML = `<p class="text-red-400">Erro ao carregar produtos: ${error.message}</p>`;
        }
    };

    const renderCategories = () => {
        categoryFilter.innerHTML = '<option value="all">Todas as Categorias</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categoryFilter.appendChild(option);
        });
        categoryFilter.value = currentFilter;
    };

    const loadInitialData = async () => {
        try {
            const settingsData = await api.getSettings();
            categories = settingsData.categories;
            geminiApiKey = settingsData.geminiApiKey;
            googleTtsApiKey = settingsData.googleTtsApiKey;
            renderCategories();
            await fetchProducts(currentPage, currentSearch, currentFilter);
        } catch (error) {
            tablePlaceholder.innerHTML = `<p class="text-red-400">Erro ao carregar dados do servidor: ${error.message}</p>`;
            tablePlaceholder.style.display = 'block';
        }
    };
    
    const handleExtractData = async (targetUrl, affiliateUrl, openDetailsModalOnSave, button) => {
        const errorDiv = document.getElementById('modal-error');
        
        try {
            const extractedData = await api.extractFromUrl(targetUrl);

            if(!extractedData || !extractedData.title) {
                throw new Error('A extração retornou dados vazios. Verifique as regras de extração (seletores CSS) para este domínio na página "Lojas".');
            }

            let finalDescription = `<p>${(extractedData.description || 'Descrição não encontrada.').replace(/\s+/g, ' ').trim()}</p>`;
            if (extractedData.specs_html) {
                 finalDescription += `<hr><h4>Especificações Técnicas:</h4>${extractedData.specs_html}`;
            }

            const newProductData = {
                title: (extractedData.title || 'Título não encontrado').split('|')[0].trim(),
                price: `R$ ${extractedData.price.replace(/[^\d,]/g, '')}`,
                affiliateUrl,
                images: extractedData.images || [],
                description: finalDescription,
                specifications: extractedData.parsed_specifications || '',
                brand: '', category: 'Sem Categoria', seoTitle: '', seoSlug: '',
                metaDescription: '', focusKeyphrase: '', tags: '',
                productType: affiliateUrl ? 'afiliado' : 'loja',
                videoUrl: extractedData.videoUrl || ''
            };

            const savedProduct = await api.createProduct(newProductData);
            await fetchProducts(1, '', 'all');
            closeModal('add-product-modal');
            if (openDetailsModalOnSave) {
                openProductDetailsModal(savedProduct.id);
            }

        } catch (error) {
            errorDiv.textContent = `Falha na extração: ${error.message}`;
            errorDiv.classList.remove('hidden');
        } finally {
            button.disabled = false;
            const loader = button.querySelector('.loader');
            if(loader) loader.classList.add('hidden');
        }
    };
    const generateAIDescription = async (product, button) => {
         if (!geminiApiKey) { openAlertModal("Adicione sua Chave de API da Gemini nas Configurações."); return; }
         const originalText = button.innerHTML;
         button.disabled = true;
         button.innerHTML = `<div class="loader-sm"></div> Gerando Texto...`;
         const prompt = `Você é um especialista em copywriting e SEO. Sua tarefa é criar conteúdo otimizado para o produto '${product.title}'. A descrição base é: "${stripHtml(product.description)}". Siga estritamente as seguintes instruções e formato de saída: 1. **Título para SEO:** Crie um título otimizado para buscadores, com cerca de 60 caracteres, sem formatação markdown como asteriscos. 2. **Slug:** Crie um slug de URL amigável, em minúsculas, com palavras separadas por hífen. 3. **Descrição Principal:** Crie uma descrição de produto detalhada, robusta e persuasiva. Use parágrafos claros (<p>). Otimize para SEO. Insira o nome da loja "camelomix" 3 vezes, transformando-o em um link HTML para 'http://www.camelomix.com.br'. Não use markdown como asteriscos para negrito. 4. **Meta Descrição:** Crie uma meta descrição otimizada para SEO com um máximo estrito de 160 caracteres. 5. **Frase-chave de Foco:** Defina a principal frase-chave (3 a 5 palavras). 6. **Tags:** Liste de 5 a 10 palavras-chave relevantes para serem usadas como tags, separadas por vírgula. O formato de saída OBRIGATORIAMENTE deve usar '::::' como separador: [Título para SEO aqui]::::[Slug aqui]::::[Descrição Principal aqui]::::[Meta Descrição aqui]::::[Frase-chave de Foco aqui]::::[Tags aqui]`;
         try {
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) { throw new Error((await response.json())?.error?.message || `Erro HTTP: ${response.status}`); }
            const result = await response.json();
            if (result.candidates && result.candidates[0].content?.parts[0]?.text) {
                const cleanAIOutput = (text) => text.replace(/\*\*/g, '');
                const parts = result.candidates[0].content.parts[0].text.split('::::');
                const [seoTitle, seoSlug, mainDesc, metaDesc, keyphrase, tags] = parts.map(p => (p || '').trim());
                const newAIDescription = cleanAIOutput(mainDesc);
                const separatorIndex = product.description.indexOf('<hr>');
                let finalDescription = newAIDescription;
                if (separatorIndex !== -1) finalDescription += product.description.substring(separatorIndex);
                document.getElementById('details-seo-title').value = cleanAIOutput(seoTitle);
                document.getElementById('details-seo-slug').value = seoSlug;
                document.getElementById('details-description').innerHTML = finalDescription;
                document.getElementById('details-meta-description').value = cleanAIOutput(metaDesc);
                document.getElementById('details-focus-keyphrase').value = cleanAIOutput(keyphrase);
                document.getElementById('details-tags').value = tags;
                
                button.innerHTML = `<div class="loader-sm"></div> Gerando Áudio...`;
                
                if (!googleTtsApiKey) {
                    openAlertModal('Texto gerado com sucesso! Para gerar áudio, adicione a Chave de API do Google Text-to-Speech nas Configurações.');
                    button.disabled = false;
                    button.innerHTML = originalText;
                    return;
                }

                const textForAudio = stripHtml(newAIDescription);
                try {
                    const audioResponse = await api.generateAudio(textForAudio);
                    if (audioResponse && audioResponse.audio_url) {
                        const audioPlayer = `<audio controls src="${audioResponse.audio_url}" style="width: 100%; margin-bottom: 1rem;"></audio>`;
                        const descContainer = document.getElementById('details-description');
                        descContainer.innerHTML = audioPlayer + descContainer.innerHTML;
                    }
                } catch (audioError) {
                    openAlertModal(`Texto gerado com sucesso, mas falha ao criar áudio: ${audioError.message}`);
                }

            } else { throw new Error("A resposta da IA não continha um texto válido."); }
         } catch (error) { openAlertModal(`Não foi possível gerar o conteúdo. Detalhes: ${error.message}`); }
         finally { button.disabled = false; button.innerHTML = originalText; }
    };
    
    const createModal = (id, title, content, footer, size = 'max-w-3xl') => {
        closeModal(id);
        const modalWrapper = document.createElement('div');
        modalWrapper.id = id;
        modalWrapper.className = 'gcm-modal-wrapper';
        modalWrapper.innerHTML = `<div class="modal-backdrop"></div><div class="modal w-full ${size} bg-gray-800 rounded-lg shadow-xl p-0" style="max-height: 90vh;"><div class="p-6 border-b border-gray-700"><h2 class="text-2xl font-bold">${title}</h2></div><div class="modal-content text-gray-300 space-y-4 p-6 overflow-y-auto flex-grow">${content}</div><div class="modal-footer mt-auto p-6 flex justify-end items-center space-x-3 bg-gray-800 border-t border-gray-700">${footer}</div></div>`;
        modalContainer.appendChild(modalWrapper);
        modalWrapper.querySelector('.modal-backdrop').addEventListener('click', () => closeModal(id));
    };

    const closeModal = (id) => { const modalRoot = document.getElementById(id); if (modalRoot) modalRoot.remove(); };
	
    const openAlertModal = (message) => {
        createModal('alert-modal', 'Aviso', `<p>${message}</p>`, `<button id="alert-ok-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">OK</button>`, 'max-w-md');
        document.getElementById('alert-ok-btn').addEventListener('click', () => closeModal('alert-modal'));
    };
	
    const openConfirmationModal = (message, onConfirm) => {
        createModal('confirm-modal', 'Confirmação', `<p>${message}</p>`, `<button id="confirm-cancel" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button><button id="confirm-ok" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Confirmar</button>`, 'max-w-md');
        document.getElementById('confirm-cancel').addEventListener('click', () => closeModal('confirm-modal'));
        document.getElementById('confirm-ok').addEventListener('click', () => { onConfirm(); closeModal('confirm-modal'); });
    };

    const openProductDetailsModal = (productId) => {
        const product = products.find(p => p.id === productId);
        if (!product) { openAlertModal(`Erro: Produto com ID ${productId} não foi encontrado.`); return; }
        
        const modalId = `details-modal-${productId}`;
        const content = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div class="space-y-4 md:col-span-2"><h4 class="font-bold">Informações Básicas</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                        <div><label class="text-sm font-medium">Título do Produto</label><input type="text" id="details-title" class="w-full bg-gray-700 mt-1 p-2 rounded-md"></div>
                        <div><label class="text-sm font-medium">Preço</label><input type="text" id="details-price" class="w-full bg-gray-700 mt-1 p-2 rounded-md"></div>
                        <div><label class="text-sm font-medium">Marca</label><input type="text" id="details-brand" class="w-full bg-gray-700 mt-1 p-2 rounded-md"></div>
                        <div><label class="text-sm font-medium">Tipo</label><select id="details-product-type" class="w-full bg-gray-700 mt-1 p-2 rounded-md"><option value="loja">Loja (Simples)</option><option value="afiliado">Afiliado (Externo)</option></select></div>
                        <div class="lg:col-span-2"><label class="text-sm font-medium">URL de Afiliado</label><input type="url" id="details-affiliate-url" class="w-full bg-gray-700 mt-1 p-2 rounded-md"></div>
                        <div><label class="text-sm font-medium">Categoria</label><select id="details-category-select" class="w-full bg-gray-700 mt-1 p-2 rounded-md"></select></div>
                        <div class="lg:col-span-2"><label class="text-sm font-medium">URL do Vídeo</label><input type="url" id="details-video-url" class="w-full bg-gray-700 mt-1 p-2 rounded-md"></div>
                    </div>
                </div>
                <div class="space-y-4 md:col-span-2"><h4 class="font-bold">Conteúdo e SEO</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div><label class="text-sm font-medium">Título para SEO</label><input type="text" id="details-seo-title" class="w-full bg-gray-700 mt-1 p-2 rounded-md text-sm"></div>
                        <div><label class="text-sm font-medium">Slug</label><input type="text" id="details-seo-slug" class="w-full bg-gray-700 mt-1 p-2 rounded-md text-sm"></div>
                        <div class="md:col-span-2"><label class="text-sm font-medium">Meta Descrição</label><textarea id="details-meta-description" class="w-full bg-gray-700 mt-1 p-2 rounded-md text-sm" rows="2"></textarea></div>
                        <div><label class="text-sm font-medium">Frase-chave</label><input type="text" id="details-focus-keyphrase" class="w-full bg-gray-700 mt-1 p-2 rounded-md text-sm"></div>
                        <div><label class="text-sm font-medium">Tags</label><textarea id="details-tags" class="w-full bg-gray-700 mt-1 p-2 rounded-md text-sm" rows="1"></textarea></div>
                    </div>
                    <div class="md:col-span-2"><label class="text-sm font-medium">Descrição Principal</label><div id="details-description" class="editable-description" contenteditable="true"></div></div>
                    <div class="md:col-span-2"><label class="text-sm font-medium">Especificações (Atributos)</label><textarea id="details-specifications" class="w-full bg-gray-700 mt-1 p-2 rounded-md text-sm" rows="5" placeholder="Ex:&#10;Cor: Azul&#10;Material: Algodão"></textarea></div>
                </div>
                <div class="space-y-4 md:col-span-2"><h4 class="font-bold">Galeria</h4>
                    <div class="flex items-center justify-between mb-2">
                        <button id="delete-selected-images-btn" class="bg-red-600 hover:bg-red-700 text-white font-semibold px-3 py-1 rounded-md text-sm">Excluir Selecionadas</button>
                        <div class="flex items-center gap-2">
                            <input type="url" id="add-image-url-input" class="w-full bg-gray-700 p-2 rounded-md text-sm" placeholder="Cole a URL da imagem...">
                            <button id="add-image-url-btn" class="bg-indigo-600 text-white font-semibold px-4 py-2 rounded-md text-sm">Adicionar</button>
                        </div>
                    </div>
                    <div id="details-gallery" class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2"></div>
                </div>
            </div>`;
        const footer = `<button id="delete-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Excluir</button> <button id="generate-ai-desc-btn" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-stars" viewBox="0 0 16 16"><path d="M7.657 6.247c.11-.33.576-.33.686 0l.645 1.937a2.89 2.89 0 0 0 1.829 1.828l1.936.645c.33.11.33.576 0 .686l-1.937.645a2.89 2.89 0 0 0-1.828 1.829l-.645 1.936a.361.361 0 0 1-.686 0l-.645-1.937a2.89 2.89 0 0 0-1.828-1.828l-1.937-.645a.361.361 0 0 1 0-.686l1.937.645a2.89 2.89 0 0 0 1.828-1.828zM3.794 1.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162-.387A1.73 1.73 0 0 0 4.593 5.9l-.387 1.162a.217.217 0 0 1-.412 0L3.407 5.9A1.73 1.73 0 0 0 2.31 4.807l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387A1.73 1.73 0 0 0 3.407 2.31zM10.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774-.258a1.16 1.16 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.16 1.16 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774.258c.346-.115.617-.386.732-.732z"/></svg>Criar com IA </button> <button id="save-details-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Salvar e Fechar</button>`;
        createModal(modalId, 'Editar Detalhes do Produto', content, footer, 'max-w-4xl');

        document.getElementById('details-title').value = product.title || '';
        document.getElementById('details-price').value = product.price || '';
        document.getElementById('details-brand').value = product.brand || '';
        document.getElementById('details-affiliate-url').value = product.affiliateUrl || '';
        document.getElementById('details-category-select').innerHTML = categories.map(c => `<option value="${c}" ${c === product.category ? 'selected' : ''}>${c}</option>`).join('');
        document.getElementById('details-seo-title').value = product.seoTitle || '';
        document.getElementById('details-seo-slug').value = product.seoSlug || '';
        document.getElementById('details-meta-description').value = product.metaDescription || '';
        document.getElementById('details-focus-keyphrase').value = product.focusKeyphrase || '';
        document.getElementById('details-tags').value = product.tags || '';
        document.getElementById('details-description').innerHTML = product.description || '';
        document.getElementById('details-specifications').value = product.specifications || '';
        document.getElementById('details-product-type').value = product.productType || 'afiliado';
        document.getElementById('details-video-url').value = product.videoUrl || '';

        const galleryContainer = document.getElementById('details-gallery');
        const renderGallery = (images) => {
            galleryContainer.innerHTML = (images || []).map(src => `
                <div class="gallery-image-container relative" data-image-src="${src}">
                    <img src="${src}" class="w-full h-auto object-cover aspect-square rounded-md"/>
                    <input type="checkbox" class="image-delete-checkbox absolute top-1 left-1 h-4 w-4 rounded bg-gray-900 border-gray-600 text-indigo-600 focus:ring-indigo-500">
                </div>
            `).join('');
        };
        renderGallery(product.images);

        const getModalFieldValues = () => ({
            title: document.getElementById('details-title').value,
            price: document.getElementById('details-price').value,
            brand: document.getElementById('details-brand').value,
            affiliateUrl: document.getElementById('details-affiliate-url').value,
            category: document.getElementById('details-category-select').value,
            seoTitle: document.getElementById('details-seo-title').value,
            seoSlug: document.getElementById('details-seo-slug').value,
            metaDescription: document.getElementById('details-meta-description').value,
            focusKeyphrase: document.getElementById('details-focus-keyphrase').value,
            tags: document.getElementById('details-tags').value,
            description: document.getElementById('details-description').innerHTML,
            specifications: document.getElementById('details-specifications').value,
            productType: document.getElementById('details-product-type').value,
            videoUrl: document.getElementById('details-video-url').value,
            images: Array.from(galleryContainer.querySelectorAll('.gallery-image-container')).map(el => el.dataset.imageSrc),
        });

        document.getElementById('delete-selected-images-btn').addEventListener('click', () => {
            const checkedImages = document.querySelectorAll('#details-gallery .image-delete-checkbox:checked');
            if (checkedImages.length === 0) {
                openAlertModal('Nenhuma imagem selecionada para exclusão.');
                return;
            }
            openConfirmationModal(`Tem certeza que deseja excluir as ${checkedImages.length} imagens selecionadas?`, () => {
                checkedImages.forEach(checkbox => {
                    checkbox.closest('.gallery-image-container').remove();
                });
            });
        });

        document.getElementById('add-image-url-btn').addEventListener('click', () => {
             const input = document.getElementById('add-image-url-input');
             const url = input.value.trim();
             if(url) {
                const currentImages = getModalFieldValues().images;
                renderGallery([...currentImages, url]);
                input.value = '';
             }
        });

        document.getElementById('save-details-btn').addEventListener('click', async () => {
            try {
                await api.updateProduct(productId, getModalFieldValues());
                await fetchProducts(currentPage, currentSearch, currentFilter);
                closeModal(modalId);
            } catch (error) { openAlertModal(`Erro ao salvar: ${error.message}`); }
        });

        document.getElementById('delete-btn').addEventListener('click', () => {
            openConfirmationModal('Tem certeza que deseja excluir este produto?', async () => {
                try {
                    await api.deleteProducts([productId]);
                    await fetchProducts(currentPage, currentSearch, currentFilter);
                    closeModal(modalId);
                } catch (error) { openAlertModal(`Erro ao excluir: ${error.message}`); }
            });
        });

        document.getElementById('generate-ai-desc-btn').addEventListener('click', (e) => generateAIDescription(getModalFieldValues(), e.currentTarget));
    };

    const openShareModal = (product) => {
        if (!product.shareLink || product.shareLink === '') {
            openAlertModal('Este produto ainda não foi publicado no WooCommerce e não pode ser compartilhado. Publique-o primeiro.');
            return;
        }
        const shareUrl = encodeURIComponent(product.shareLink);
        const shareText = encodeURIComponent(`🔥 Oferta Imperdível! 🔥\n\n${product.title}\n\n`);
        
        const content = `
            <div class="space-y-4 text-center">
                <p class="text-gray-400">Clique em uma das redes abaixo para compartilhar a oferta. A imagem, título e preço serão adicionados automaticamente.</p>
                <div class="flex justify-center items-center gap-4 flex-wrap">
                    <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" class="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-bold">Facebook</a>
                    <a href="https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}" target="_blank" class="p-4 bg-gray-500 hover:bg-gray-600 rounded-lg text-white font-bold">X (Twitter)</a>
                    <a href="https://api.whatsapp.com/send?text=${shareText}${shareUrl}" target="_blank" class="p-4 bg-green-500 hover:bg-green-600 rounded-lg text-white font-bold">WhatsApp</a>
                </div>
                <div class="pt-4">
                    <label class="text-sm font-medium">Ou copie o link manualmente:</label>
                    <div class="flex items-center gap-2 mt-1">
                        <input type="text" id="manual-share-link" class="w-full bg-gray-700 p-2 rounded-md" value="${product.shareLink}" readonly>
                        <button id="copy-share-link-btn" class="bg-indigo-600 text-white font-semibold px-4 py-2 rounded-md text-sm">Copiar</button>
                    </div>
                </div>
                <p class="text-xs text-gray-500 pt-2"><b>Nota:</b> O compartilhamento direto no Instagram não é permitido pela API da plataforma. Para o Instagram, copie o link e adicione-o manualmente na sua bio ou stories.</p>
            </div>`;
        
        createModal(`share-modal-${product.id}`, `Compartilhar Oferta: ${product.title}`, content, `<button id="close-share-modal" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Fechar</button>`, 'max-w-lg');

        document.getElementById('close-share-modal').addEventListener('click', () => closeModal(`share-modal-${product.id}`));
        document.getElementById('copy-share-link-btn').addEventListener('click', (e) => {
            const link = document.getElementById('manual-share-link').value;
            copyToClipboard(link, e.currentTarget);
        });
    };

    const openAddProductModal = () => {
        const content = `<div><label for="product-url" class="block text-sm font-medium">URL do Produto</label><input type="url" id="product-url" class="mt-1 w-full bg-gray-700 p-2"></div><div><label for="affiliate-url" class="block text-sm font-medium">Sua URL de Afiliado (deixe em branco para produto da loja)</label><input type="url" id="affiliate-url" class="mt-1 w-full bg-gray-700 p-2"></div><div class="flex items-center"><input id="open-details-on-save" type="checkbox" checked class="h-4 w-4 rounded"><label for="open-details-on-save" class="ml-2 text-sm">Abrir detalhes após salvar</label></div><div id="modal-error" class="hidden text-red-400"></div>`;
        const footer = `<button id="cancel-btn" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button><button id="extract-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center">Extrair e Salvar<div class="loader hidden ml-2"></div></button>`;
        createModal('add-product-modal', 'Extrair Dados de Produto', content, footer, 'max-w-lg');
        
        document.getElementById('cancel-btn').addEventListener('click', () => closeModal('add-product-modal'));
        document.getElementById('extract-btn').addEventListener('click', (e) => {
            const url = document.getElementById('product-url').value;
            const affUrl = document.getElementById('affiliate-url').value;
            const openDetails = document.getElementById('open-details-on-save').checked;
            const button = e.currentTarget;
            handleExtractData(url, affUrl, openDetails, button);
        });
    };

    const openSettingsModal = () => {
        const modalContent = `
            <div class="space-y-4">
                <div>
                    <label for="api-key-input" class="text-sm font-medium">Chave de API - Google AI (Gemini)</label>
                    <input type="password" id="api-key-input" class="w-full bg-gray-700 p-2 rounded-md mt-1" value="${geminiApiKey}">
                    <p class="text-xs text-gray-400 mt-1">Usada para gerar textos, títulos, etc.</p>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-xs text-blue-400 hover:underline">Obtenha sua chave do Gemini.</a>
                </div>
                <div>
                    <label for="tts-api-key-input" class="text-sm font-medium">Chave de API - Google Cloud (Text-to-Speech)</label>
                    <input type="password" id="tts-api-key-input" class="w-full bg-gray-700 p-2 rounded-md mt-1" value="${googleTtsApiKey || ''}">
                    <p class="text-xs text-gray-400 mt-1">Usada para gerar o áudio da descrição. Requer um projeto no Google Cloud.</p>
                     <a href="https://console.cloud.google.com/apis/credentials" target="_blank" class="text-xs text-blue-400 hover:underline">Obtenha sua chave do Google Cloud.</a>
                </div>
            </div>`;
        
        createModal('settings-modal', 'Configurações', modalContent, `<button id="save-settings-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Salvar</button>`, 'max-w-lg');
        
        document.getElementById('save-settings-btn').addEventListener('click', async () => {
            const newGeminiApiKey = document.getElementById('api-key-input').value.trim();
            const newTtsApiKey = document.getElementById('tts-api-key-input').value.trim();
             try {
                await api.updateSettings({ 
                    geminiApiKey: newGeminiApiKey,
                    googleTtsApiKey: newTtsApiKey 
                });
                geminiApiKey = newGeminiApiKey;
                googleTtsApiKey = newTtsApiKey;
                closeModal('settings-modal');
                openAlertModal('Configurações salvas com sucesso!');
            } catch(error) {
                openAlertModal(`Erro ao salvar configurações: ${error.message}`);
            }
        });
    };

    const openBulkEditModal = () => {
        const selectedIds = Array.from(document.querySelectorAll('.product-checkbox:checked:not(:disabled)')).map(cb => parseInt(cb.dataset.id));
        if (selectedIds.length === 0) return;

        const content = `<div class="space-y-4"><p class="text-sm text-gray-400">Marque os campos que deseja alterar para os ${selectedIds.length} produtos selecionados.</p><div class="flex items-center gap-3"><input type="checkbox" id="bulk-edit-category-check" class="h-4 w-4 rounded"><label for="bulk-edit-category" class="w-24">Categoria</label><select id="bulk-edit-category" class="w-full bg-gray-600 p-2 rounded-md text-sm">${categories.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div><div class="flex items-center gap-3"><input type="checkbox" id="bulk-edit-brand-check" class="h-4 w-4 rounded"><label for="bulk-edit-brand" class="w-24">Marca</label><input type="text" id="bulk-edit-brand" class="w-full bg-gray-600 p-2 rounded-md text-sm"></div></div>`;
        createModal('bulk-edit-modal', 'Edição em Massa', content, `<button id="cancel-bulk-edit-btn" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button><button id="save-bulk-edit-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Salvar Alterações</button>`, 'max-w-lg');
        
        document.getElementById('cancel-bulk-edit-btn').addEventListener('click', () => closeModal('bulk-edit-modal'));
        document.getElementById('save-bulk-edit-btn').addEventListener('click', async () => {
            const updates = {};
            if (document.getElementById('bulk-edit-category-check').checked) updates.category = document.getElementById('bulk-edit-category').value;
            if (document.getElementById('bulk-edit-brand-check').checked) updates.brand = document.getElementById('bulk-edit-brand').value;

            if (Object.keys(updates).length === 0) {
                openAlertModal('Nenhum campo foi marcado para atualização.');
                return;
            }

            try {
                await api.bulkUpdateProducts({ ids: selectedIds, updates: updates });
                await fetchProducts(currentPage, currentSearch, currentFilter);
                closeModal('bulk-edit-modal');
                openAlertModal('Produtos atualizados com sucesso!');
            } catch (error) {
                openAlertModal(`Erro na edição em massa: ${error.message}`);
            }
        });
    };
    
    const updateBulkActions = () => {
        const selectedCheckboxes = document.querySelectorAll('.product-checkbox:checked:not(:disabled)');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.dataset.id));
        bulkActionsBar.classList.toggle('hidden', selectedIds.length === 0);
        selectionCount.textContent = `${selectedIds.length} selecionado(s)`;
        
        const allCheckboxes = document.querySelectorAll('#product-table-body .product-checkbox:not(:disabled)');
        selectAllCheckbox.checked = allCheckboxes.length > 0 && selectedIds.length === allCheckboxes.length;
    };
    
    const handlePublish = async () => {
        const selectedIds = Array.from(document.querySelectorAll('.product-checkbox:checked:not(:disabled)')).map(cb => parseInt(cb.dataset.id));
        if (selectedIds.length === 0) return openAlertModal("Nenhum produto selecionado para publicar.");
        
        openConfirmationModal(`Tem certeza que deseja publicar ${selectedIds.length} produto(s) no WooCommerce?`, async () => {
             try {
                const response = await api.publishToWoo(selectedIds);
                openAlertModal(response.message);
                await fetchProducts(currentPage, currentSearch, currentFilter);
            } catch (error) { openAlertModal(`Erro ao publicar: ${error.message}`); }
        });
    };

    const handleRestore = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                const productsToImport = Array.isArray(data) ? data : (data.products || []);
                if (!productsToImport.length) {
                    return openAlertModal('Arquivo de backup inválido ou vazio.');
                }
                openConfirmationModal(`Você está prestes a importar ${productsToImport.length} produtos. Deseja continuar?`, async () => {
                    createModal('import-loader', 'Importando...', '<div class="text-center"><div class="loader mx-auto"></div><p id="import-status" class="mt-4">Iniciando...</p></div>', '', 'max-w-sm');
                    const statusEl = document.getElementById('import-status');
                    let successCount = 0;
                    for (let i = 0; i < productsToImport.length; i++) {
                        statusEl.textContent = `Importando ${i + 1} de ${productsToImport.length}...`;
                        const { id, woo_id, click_count, ...productData } = productsToImport[i];
                        try {
                            await api.createProduct(productData);
                            successCount++;
                        } catch (err) {
                            console.error(`Falha ao importar ${productData.title}:`, err);
                        }
                    }
                    closeModal('import-loader');
                    openAlertModal(`Importação concluída! ${successCount} de ${productsToImport.length} produtos importados com sucesso.`);
                    await fetchProducts(1, '', 'all');
                });
            } catch (error) {
                openAlertModal('Erro ao ler o arquivo de backup.');
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input for re-uploading the same file
    };

    // --- EVENT LISTENERS ---
    searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounceTimeout);
        searchDebounceTimeout = setTimeout(() => {
            currentPage = 1;
            currentSearch = searchInput.value;
            fetchProducts(currentPage, currentSearch, currentFilter);
        }, 500);
    });

    paginationControls.addEventListener('click', (e) => {
        if (e.target.id === 'prev-page-btn') {
            if (currentPage > 1) {
                currentPage--;
                fetchProducts(currentPage, currentSearch, currentFilter);
            }
        }
        if (e.target.id === 'next-page-btn') {
            if (currentPage < totalPages) {
                currentPage++;
                fetchProducts(currentPage, currentSearch, currentFilter);
            }
        }
    });

    categoryFilter.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        currentPage = 1;
        fetchProducts(currentPage, currentSearch, currentFilter);
    });

    document.getElementById('add-product-btn').addEventListener('click', openAddProductModal);
    document.getElementById('settings-btn').addEventListener('click', openSettingsModal);
    
    selectAllCheckbox.addEventListener('click', (e) => { 
        document.querySelectorAll('#product-table-body .product-checkbox:not(:disabled)').forEach(cb => cb.checked = e.target.checked); 
        updateBulkActions(); 
    });
	
    productTableBody.addEventListener('click', (e) => {
        const target = e.target;
        const button = target.closest('button');
        const checkbox = target.closest('.product-checkbox');

        if (checkbox) {
            updateBulkActions();
            return;
        }
        if (!button) return;

        const id = parseInt(button.dataset.id);
        const product = products.find(p => p.id === id);
        if (!product) return;

        if (button.classList.contains('details-btn')) openProductDetailsModal(id);
        else if (button.classList.contains('share-btn')) openShareModal(product);
        else if (button.classList.contains('copy-link-btn')) copyToClipboard(product.affiliateUrl, button);
    });

    document.getElementById('bulk-delete-btn').addEventListener('click', () => {
        const selectedIds = Array.from(document.querySelectorAll('.product-checkbox:checked:not(:disabled)')).map(cb => parseInt(cb.dataset.id));
        if(selectedIds.length === 0) return;
        openConfirmationModal(`Tem certeza que deseja excluir ${selectedIds.length} produto(s)?`, async () => {
            try {
                await api.deleteProducts(selectedIds);
                await fetchProducts(currentPage, currentSearch, currentFilter);
            } catch (error) { openAlertModal(`Erro ao excluir produtos: ${error.message}`); }
        });
    });

    document.getElementById('bulk-edit-btn').addEventListener('click', openBulkEditModal);
    document.getElementById('bulk-publish-woo-btn').addEventListener('click', handlePublish);

    document.getElementById('backup-menu-btn').addEventListener('click', (e) => { 
        e.stopPropagation(); 
        document.getElementById('backup-menu').classList.toggle('hidden'); 
    });
    document.addEventListener('click', () => {
        const backupMenu = document.getElementById('backup-menu');
        if (backupMenu && !backupMenu.classList.contains('hidden')) {
            backupMenu.classList.add('hidden');
        }
    });
    document.getElementById('backup-btn').addEventListener('click', (e) => { e.preventDefault(); /* handleBackup logic will go here */ });
    document.getElementById('restore-btn').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('restore-input').click(); });
    document.getElementById('restore-input').addEventListener('change', handleRestore);

    // --- INITIAL LOAD ---
    loadInitialData();
}