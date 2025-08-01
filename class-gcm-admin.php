<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class GCM_Admin {

    public function __construct() {
        add_action('admin_menu', [ $this, 'adicionar_paginas_admin' ]);
        add_action('admin_enqueue_scripts', [ $this, 'carregar_scripts_e_estilos_admin' ]);
    }

    public function adicionar_paginas_admin() {
        add_menu_page(
            'Gerenciador GCM',
            'Gerenciador GCM',
            'manage_options',
            'gerenciador_camelomix',
            [ $this, 'render_gerenciador_page' ],
            'dashicons-cart',
            20
        );

        add_submenu_page('gerenciador_camelomix', 'Gerenciador', 'Gerenciador', 'manage_options', 'gerenciador_camelomix', [ $this, 'render_gerenciador_page' ]);
        add_submenu_page('gerenciador_camelomix', 'Dashboard', 'Dashboard', 'manage_options', 'gcm_dashboard', [ $this, 'render_dashboard_page' ]);
        add_submenu_page('gerenciador_camelomix', 'Compartilhar', 'Compartilhar', 'manage_options', 'gcm_sharing', [ $this, 'render_sharing_page' ]); // NOVO MENU
        add_submenu_page('gerenciador_camelomix', 'Lojas e Regras', 'Lojas', 'manage_options', 'gcm_lojas', [ $this, 'render_stores_page' ]);
        add_submenu_page('gerenciador_camelomix', 'Reparo', 'Reparo', 'manage_options', 'gcm_reparo', [ $this, 'render_repair_page' ]);
    }

    public function carregar_scripts_e_estilos_admin($hook) {
        $gcm_pages = [
            'toplevel_page_gerenciador_camelomix',
            'gerenciador-gcm_page_gcm_dashboard',
            'gerenciador-gcm_page_gcm_sharing', // NOVA PÁGINA
            'gerenciador-gcm_page_gcm_lojas',
            'gerenciador-gcm_page_gcm_reparo'
        ];

        if ( !in_array($hook, $gcm_pages) ) {
            return;
        }

        wp_enqueue_style( 'gcm-google-fonts', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap', [], null );
        wp_enqueue_script( 'gcm-tailwindcss', 'https://cdn.tailwindcss.com', [], null, false );
        
        wp_enqueue_style( 'gcm-admin-styles', GCM_PLUGIN_URL . 'assets/css/estilos.css', [], GCM_VERSION );

        $version = GCM_VERSION;
        $deps = ['jquery'];
        $script_handle = '';
        
        $base_url = GCM_PLUGIN_URL . 'assets/js/';
        
        switch ($hook) {
            case 'toplevel_page_gerenciador_camelomix':
                $script_handle = 'gcm-app-manager';
                wp_enqueue_script($script_handle, $base_url . 'admin-manager.js', $deps, $version, true);
                break;
            case 'gerenciador-gcm_page_gcm_dashboard':
                $script_handle = 'gcm-app-dashboard';
                wp_enqueue_script('gcm-chart-js', 'https://cdn.jsdelivr.net/npm/chart.js', [], '4.4.3', true);
                wp_enqueue_script('gcm-chart-adapter', 'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns', ['gcm-chart-js'], '3.0.0', true);
                $deps[] = 'gcm-chart-js';
                $deps[] = 'gcm-chart-adapter';
                wp_enqueue_script($script_handle, $base_url . 'admin-dashboard.js', $deps, $version, true);
                break;
            case 'gerenciador-gcm_page_gcm_sharing': // NOVO CASE
                $script_handle = 'gcm-app-sharing';
                wp_enqueue_script($script_handle, $base_url . 'admin-sharing.js', $deps, $version, true);
                break;
            case 'gerenciador-gcm_page_gcm_reparo':
                $script_handle = 'gcm-app-repair';
                wp_enqueue_script($script_handle, $base_url . 'admin-repair.js', $deps, $version, true);
                break;
            case 'gerenciador-gcm_page_gcm_lojas':
                $script_handle = 'gcm-app-stores';
                wp_enqueue_script($script_handle, $base_url . 'admin-stores.js', $deps, $version, true);
                break;
        }

        if ($script_handle) {
            wp_localize_script($script_handle, 'gcm_data', [
                'api_url' => esc_url_raw(rest_url('gcm/v1/')),
                'nonce'   => wp_create_nonce('wp_rest'),
            ]);
        }
    }

    public function render_gerenciador_page() { echo '<div id="gcm-app-container" class="gcm-wrap"><p>Carregando ferramenta...</p></div>'; }
    public function render_dashboard_page() { echo '<div id="gcm-dashboard-container" class="gcm-wrap"><p>Carregando dashboard...</p></div>'; }
    public function render_sharing_page() { echo '<div id="gcm-sharing-container" class="gcm-wrap"></div>'; } // NOVA FUNÇÃO
    public function render_repair_page() { echo '<div id="gcm-repair-container" class="gcm-wrap"></div>'; }
    public function render_stores_page() { echo '<div id="gcm-stores-container" class="gcm-wrap"></div>'; }
}