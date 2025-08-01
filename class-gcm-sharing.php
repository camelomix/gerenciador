<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class GCM_Sharing {

    public function __construct() {
        add_action('template_redirect', [ $this, 'handle_share_link' ]);
    }

    public function handle_share_link() {
        if ( !isset($_GET['gcm_share_id']) || empty($_GET['gcm_share_id']) ) {
            return;
        }

        $product_id = intval($_GET['gcm_share_id']);
        if ( $product_id <= 0 ) {
            return;
        }

        if ( !function_exists('wc_get_product') ) {
            return;
        }

        $product = wc_get_product($product_id);

        if (!$product) {
            wp_safe_redirect(home_url(), 301);
            exit;
        }

        $user_agent = isset($_SERVER['HTTP_USER_AGENT']) ? strtolower($_SERVER['HTTP_USER_AGENT']) : '';
        $is_social_bot = preg_match('/(facebookexternalhit|twitterbot|pinterest|whatsapp|linkedinbot|discordbot)/', $user_agent);

        if ($is_social_bot) {
            $this->show_opengraph_tags($product);
            exit;
        }

        // Para usuários reais, registra o clique e redireciona para a página do produto na loja.
        $destination_url = $product->get_permalink();

        global $wpdb;
        $table_name = $wpdb->prefix . 'gcm_click_log';
        $wpdb->insert(
            $table_name,
            ['product_id' => $product->get_id(), 'click_time' => current_time('mysql')],
            ['%d', '%s']
        );
        
        wp_safe_redirect($destination_url, 301);
        exit;
    }

    private function show_opengraph_tags($product) {
        $title = $product->get_name();
        $image_id = $product->get_image_id();
        $image_url = $image_id ? wp_get_attachment_image_url($image_id, 'large') : (function_exists('wc_placeholder_img_src') ? wc_placeholder_img_src('large') : '');
        $url = home_url('/?gcm_share_id=' . $product->get_id());
        $description = $product->get_short_description() ?: wp_strip_all_tags($product->get_description());

        header('Content-Type: text/html; charset=utf-8');
        echo '<!DOCTYPE html><html><head>';
        echo '<meta charset="utf-8">';
        echo '<title>' . esc_attr($title) . '</title>';
        echo '<meta property="og:title" content="' . esc_attr($title) . '" />';
        echo '<meta property="og:description" content="' . esc_attr(wp_trim_words($description, 25)) . '" />';
        echo '<meta property="og:type" content="product" />';
        echo '<meta property="og:url" content="' . esc_url($url) . '" />';
        echo '<meta property="og:site_name" content="' . esc_attr(get_bloginfo('name')) . '" />';
        echo '<meta property="og:image" content="' . esc_url($image_url) . '" />';
        echo '<meta property="og:image:width" content="1200" />';
        echo '<meta property="og:image:height" content="630" />';
        echo '<meta name="twitter:card" content="summary_large_image">';
        echo '<meta name="twitter:title" content="' . esc_attr($title) . '">';
        echo '<meta name="twitter:description" content="' . esc_attr(wp_trim_words($description, 25)) . '">';
        echo '<meta name="twitter:image" content="' . esc_url($image_url) . '">';
        echo '</head><body></body></html>';
    }
}