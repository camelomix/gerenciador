<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class GCM_API_Stores_Controller {

    public function register_routes() {
        register_rest_route('gcm/v1', '/stores', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [ $this, 'get_rules' ],
                'permission_callback' => [ $this, 'permission_check' ]
            ],
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [ $this, 'update_rules' ],
                'permission_callback' => [ $this, 'permission_check' ]
            ],
        ]);
    }

    public function permission_check() {
        return current_user_can('manage_options');
    }

    public function get_rules() {
        $rules = get_option('gcm_store_price_rules', []);
        return new WP_REST_Response($rules, 200);
    }

    public function update_rules(WP_REST_Request $request) {
        $rules = $request->get_json_params();
        $sanitized_rules = [];

        if (is_array($rules)) {
            foreach ($rules as $rule) {
                if (is_array($rule)) {
                    // --- INÍCIO DA CORREÇÃO ---
                    // Adicionado o suporte para os novos seletores de preço e removido o antigo.
                    $sanitized_rule = [
                        'domain'                 => sanitize_text_field($rule['domain'] ?? ''),
                        'title_selector'         => sanitize_text_field($rule['title_selector'] ?? ''),
                        'sale_price_selector'    => sanitize_text_field($rule['sale_price_selector'] ?? ''),
                        'regular_price_selector' => sanitize_text_field($rule['regular_price_selector'] ?? ''),
                        'desc_selector'          => sanitize_text_field($rule['desc_selector'] ?? ''),
                        'gallery_selector'       => sanitize_text_field($rule['gallery_selector'] ?? ''),
                        'specs_selector'         => sanitize_text_field($rule['specs_selector'] ?? ''),
                        'video_selector'         => sanitize_text_field($rule['video_selector'] ?? '')
                    ];
                    // --- FIM DA CORREÇÃO ---
                    $sanitized_rules[] = $sanitized_rule;
                }
            }
        }

        update_option('gcm_store_price_rules', $sanitized_rules);
        return new WP_REST_Response(['message' => 'Regras salvas com sucesso!'], 200);
    }
}