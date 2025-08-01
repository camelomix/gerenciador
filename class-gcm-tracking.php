<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class GCM_Tracking {

    public function __construct() {
        // Carrega nosso script de rastreamento nas páginas de produto
        add_action('wp_enqueue_scripts', [ $this, 'enqueue_frontend_scripts' ]);

        // Cria o endpoint no admin-ajax para receber o clique
        add_action('wp_ajax_gcm_track_click', [ $this, 'handle_ajax_click' ]);
        add_action('wp_ajax_nopriv_gcm_track_click', [ $this, 'handle_ajax_click' ]);
    }

    public function enqueue_frontend_scripts() {
        // Só carrega o script na página de um produto
        if ( is_product() ) {
            // --- INÍCIO DA MODIFICAÇÃO ---
            // Corrigindo o caminho para apontar para a pasta /assets/js/
            wp_enqueue_script(
                'gcm-frontend-tracking',
                GCM_PLUGIN_URL . 'assets/js/gcm-frontend-tracking.js', // Caminho corrigido
                ['jquery'],
                GCM_VERSION,
                true
            );
            // --- FIM DA MODIFICAÇÃO ---

            // Envia dados do PHP para o nosso JavaScript
            wp_localize_script('gcm-frontend-tracking', 'gcm_tracking_data', [
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce'    => wp_create_nonce('gcm-tracking-nonce'),
            ]);
        }
    }

    public function handle_ajax_click() {
        // Verifica o nonce de segurança
        check_ajax_referer('gcm-tracking-nonce', 'nonce');

        $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;

        if (empty($product_id)) {
            wp_send_json_error(['message' => 'Product ID inválido.'], 400);
            return;
        }

        global $wpdb;
        $table_name = $wpdb->prefix . 'gcm_click_log';

        $wpdb->insert(
            $table_name,
            ['product_id' => $product_id, 'click_time' => current_time('mysql')],
            ['%d', '%s']
        );

        wp_send_json_success(['message' => 'Clique registrado.']);
    }
}