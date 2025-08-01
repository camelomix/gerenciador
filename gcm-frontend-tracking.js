jQuery(function($) {
    function log(message) {
        console.log('[GCM Tracking]: ' + message);
    }

    log('Script Universal v11 (Solução Definitiva) iniciado.');

    // Passo 1: O script só deve rodar em páginas de produto.
    if (!$('body').hasClass('single-product')) {
        return;
    }
    log('Página de produto detectada.');

    // Passo 2: Encontra o botão principal da página.
    const productButton = $('.single_add_to_cart_button');

    if (productButton.length === 0) {
        log('ERRO: Botão de ação do produto não encontrado.');
        return;
    }

    // --- INÍCIO DA CORREÇÃO FINAL ---
    // A imagem do inspetor mostrou que o link de afiliado está no atributo "action"
    // do formulário (<form class="cart">) que envolve o botão.
    const affiliate_url = productButton.closest('form.cart').attr('action');
    // --- FIM DA CORREÇÃO FINAL ---
    
    if (!affiliate_url) {
        log('Produto não é de afiliação (não foi encontrado um formulário com um link "action"). O rastreamento não será ativado.');
        return;
    }
    
    log('Produto de afiliação detectado. Rastreador de clique pronto e aguardando.');

    productButton.on('click', function(e) {
        log('Clique no botão de afiliado detectado!');
        e.preventDefault();

        let product_id = '0';
        const bodyClasses = $('body').attr('class').split(' ');
        for (let i = 0; i < bodyClasses.length; i++) {
            if (bodyClasses[i].startsWith('postid-')) {
                product_id = bodyClasses[i].replace('postid-', '');
                break;
            }
        }

        log('ID do Produto: ' + product_id);
        log('URL de Afiliado: ' + affiliate_url);

        if (!product_id || product_id === '0' || !affiliate_url) {
            log('ERRO: Não foi possível obter ID ou URL. Redirecionando diretamente.');
            window.location.href = affiliate_url;
            return;
        }

        log('Enviando requisição para registrar o clique...');
        $.ajax({
            type: 'POST',
            url: gcm_tracking_data.ajax_url,
            data: {
                action: 'gcm_track_click',
                nonce: gcm_tracking_data.nonce,
                product_id: product_id
            },
            success: function(response) {
                log('Sucesso no registro! Resposta: ' + JSON.stringify(response));
                window.location.href = affiliate_url; 
            },
            error: function(xhr, status, error) {
                log('ERRO ao registrar. Status: ' + status + '. Erro: ' + error);
                window.location.href = affiliate_url; 
            }
        });
    });
});