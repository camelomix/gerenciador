<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class GCM_CPT {

    public function __construct() {
        add_action( 'init', [ $this, 'init_hook' ] );
    }

    public function init_hook() {
        self::setup_post_type();
    }

    public static function setup_post_type() {
        $labels = [
            'name'          => 'Produtos GCM',
            'singular_name' => 'Produto GCM',
            'menu_name'     => 'Gerenciador GCM'
        ];
        $args = [
            'labels'          => $labels,
            'public'          => false,
            'show_ui'         => true,
            'show_in_menu'    => false, // MODIFICADO: Esconde o menu padrão do CPT
            'capability_type' => 'post',
            'supports'        => ['title', 'editor', 'custom-fields', 'excerpt']
        ];
        register_post_type( 'gcm_produto', $args );
        // REMOVIDO: add_image_size desnecessário para o backend
    }

    // REMOVIDO: A função set_default_appearance_options() foi completamente removida.
}