<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class GCM_API_Settings_Controller {

    public function register_routes() {
        register_rest_route('gcm/v1', '/settings', [
            ['methods' => WP_REST_Server::READABLE, 'callback' => [ $this, 'get_settings' ], 'permission_callback' => [ $this, 'permission_check' ]],
            ['methods' => WP_REST_Server::CREATABLE, 'callback' => [ $this, 'update_settings' ], 'permission_callback' => [ $this, 'permission_check' ]],
        ]);
    }

    public function permission_check() {
        return current_user_can('manage_options');
    }

    /**
     * Função auxiliar recursiva para construir a árvore de categorias.
     * Inclui uma trava de segurança de profundidade para evitar loops infinitos.
     */
    private function build_category_tree($elements, $parentId = 0, $depth = 0) {
        // --- CORREÇÃO: Adicionada trava de segurança ---
        if ($depth > 10) {
            return []; // Evita recursão infinita em caso de dados corrompidos ou estruturas muito profundas
        }

        $branch = [];
        foreach ($elements as $element) {
            if ($element->parent == $parentId) {
                $prefix = str_repeat('— ', $depth);
                $branch[] = [ 'name' => $prefix . $element->name, 'id' => $element->term_id ];
                
                $children = $this->build_category_tree($elements, $element->term_id, $depth + 1);
                if ($children) {
                    $branch = array_merge($branch, $children);
                }
            }
        }
        return $branch;
    }

    public function get_settings() {
        $woo_categories_formatted = [];
        if (class_exists('WooCommerce')) {
            $product_categories_terms = get_terms([
                'taxonomy'   => 'product_cat',
                'orderby'    => 'name',
                'order'      => 'ASC',
                'hide_empty' => false,
            ]);

            if (!is_wp_error($product_categories_terms) && !empty($product_categories_terms)) {
                $tree = $this->build_category_tree($product_categories_terms);
                foreach ($tree as $item) {
                     $woo_categories_formatted[] = $item['name'];
                }
            }
        }
        
        if (empty($woo_categories_formatted)) {
            $woo_categories_formatted = ['Sem Categoria'];
        }

        return new WP_REST_Response([
            'categories' => $woo_categories_formatted, 
            'geminiApiKey' => get_option('gcm_gemini_api_key', ''),
            'googleTtsApiKey' => get_option('gcm_google_tts_api_key', '')
        ], 200);
    }
    
    public function update_settings(WP_REST_Request $request) {
        $data = $request->get_json_params();
        if (isset($data['geminiApiKey'])) { 
            update_option('gcm_gemini_api_key', sanitize_text_field($data['geminiApiKey'])); 
        }
        if (isset($data['googleTtsApiKey'])) { 
            update_option('gcm_google_tts_api_key', sanitize_text_field($data['googleTtsApiKey'])); 
        }
        return new WP_REST_Response(['message' => 'Configurações salvas.'], 200);
    }
}