document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('gcm-sharing-container');
    if (!container) return;

    const { api_url, nonce } = gcm_data;

    const api = {
        getProducts: () => fetch(api_url + 'sharing/products', { headers: { 'X-WP-Nonce': nonce } }).then(res => res.json())
    };

    const copyToClipboard = (text, buttonElement) => {
        navigator.clipboard.writeText(text).then(() => {
            if (buttonElement) {
                const originalText = buttonElement.textContent;
                buttonElement.textContent = 'Copiado!';
                setTimeout(() => { buttonElement.textContent = originalText; }, 2000);
            }
        });
    };

    const openShareModal = (product) => {
        const shareUrl = encodeURIComponent(product.shareLink);
        const shareText = encodeURIComponent(`🔥 Oferta Imperdível! 🔥\n\n${product.title}\n\n`);
        
        const modalId = `share-modal-${product.id}`;
        const modalContent = `
            <div class="space-y-4 text-center">
                <p class="text-gray-400">Clique para compartilhar ou copie o link. A rede social criará um card com a imagem e título do produto.</p>
                <div class="flex justify-center items-center gap-4 flex-wrap">
                    <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" class="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-bold">Facebook</a>
                    <a href="https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}" target="_blank" class="p-4 bg-gray-500 hover:bg-gray-600 rounded-lg text-white font-bold">X (Twitter)</a>
                    <a href="https://api.whatsapp.com/send?text=${shareText}${shareUrl}" target="_blank" class="p-4 bg-green-500 hover:bg-green-600 rounded-lg text-white font-bold">WhatsApp</a>
                </div>
                <div class="pt-4">
                    <input type="text" id="manual-share-link-${product.id}" class="w-full bg-gray-700 p-2 rounded-md" value="${product.shareLink}" readonly>
                </div>
                <p class="text-xs text-gray-500 pt-2"><b>Nota:</b> Para o Instagram, copie o link e adicione-o na sua bio ou stories.</p>
            </div>`;
        
        const modalContainer = document.getElementById('modal-container');
        const modalWrapper = document.createElement('div');
        modalWrapper.id = modalId;
        modalWrapper.className = 'gcm-modal-wrapper';
        modalWrapper.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal w-full max-w-lg bg-gray-800 rounded-lg shadow-xl">
                <div class="p-6 border-b border-gray-700"><h2 class="text-2xl font-bold">Compartilhar: ${product.title}</h2></div>
                <div class="modal-content text-gray-300 space-y-4 p-6">${modalContent}</div>
                <div class="modal-footer p-6 flex justify-end items-center space-x-3 bg-gray-800 border-t border-gray-700">
                    <button class="modal-close-btn bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Fechar</button>
                </div>
            </div>`;
        
        modalContainer.appendChild(modalWrapper);
        modalWrapper.querySelector('.modal-backdrop').addEventListener('click', () => modalWrapper.remove());
        modalWrapper.querySelector('.modal-close-btn').addEventListener('click', () => modalWrapper.remove());
    };

    const render = (products) => {
        container.innerHTML = `
            <div class="mb-6">
                <h1 class="text-3xl font-bold text-white">Compartilhar Produtos</h1>
                <p class="text-gray-400 mt-1">Gere links de compartilhamento para seus produtos já publicados no WooCommerce.</p>
            </div>
            <div id="modal-container"></div>
            <div class="bg-gray-800 rounded-lg shadow-lg">
                <table class="w-full text-sm text-left text-gray-300">
                    <thead class="text-xs text-gray-400 uppercase bg-gray-700">
                        <tr>
                            <th scope="col" class="px-6 py-3">Produto</th>
                            <th scope="col" class="px-6 py-3">Preço</th>
                            <th scope="col" class="px-6 py-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="sharing-table-body">
                        ${products.map(p => `
                            <tr class="bg-gray-800 border-b border-gray-700 hover:bg-gray-600">
                                <td class="px-6 py-4 font-medium text-white">
                                    <div class="flex items-center space-x-3">
                                        <img class="w-10 h-10 rounded-md object-cover" src="${p.image}" alt="${p.title}"/>
                                        <span>${p.title}</span>
                                    </div>
                                </td>
                                <td class="px-6 py-4">${p.price}</td>
                                <td class="px-6 py-4">
                                    <button class="share-btn text-green-400 hover:text-green-300" title="Compartilhar Anúncio" data-product-id="${p.id}">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-share-fill" viewBox="0 0 16 16"><path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z"/></svg>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('sharing-table-body').addEventListener('click', e => {
            const button = e.target.closest('.share-btn');
            if (button) {
                const productId = parseInt(button.dataset.productId);
                const product = products.find(p => p.id === productId);
                if (product) {
                    openShareModal(product);
                }
            }
        });
    };

    container.innerHTML = `<div class="text-center py-16 text-gray-500"><div class="loader mx-auto"></div><p class="mt-4">Carregando produtos...</p></div>`;
    api.getProducts().then(render).catch(err => {
        container.innerHTML = `<p class="text-red-400 text-center">Erro ao carregar produtos: ${err.message}</p>`;
    });
});