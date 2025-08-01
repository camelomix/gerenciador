<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class GCM_API_Sharing_Controller {

    public function register_routes() {
        register_rest_route('gcm/v1', '/sharing/products', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [ $this, 'get_published_products' ],
                'permission_callback' => [ $this, 'permission_check' ],
            ],
        ]);
    }

    public function permission_check() {
        return current_user_can('manage_options');
    }

    public function get_published_products(WP_REST_Request $request) {
        $args = [
            'post_type' => 'product',
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'meta_query' => [
                [
                    'key' => '_gcm_source_id',
                    'compare' => 'EXISTS',
                ],
            ],
            'orderby' => 'date',
            'order' => 'DESC'
        ];

        $query = new WP_Query($args);
        $posts = $query->get_posts();
        $products_data = [];

        foreach ($posts as $post) {
            $product = wc_get_product($post->ID);
            if (!$product) continue;

            $products_data[] = [
                'id' => $product->get_id(),
                'title' => $product->get_name(),
                'price' => $product->get_price_html(),
                'image' => wp_get_attachment_image_url($product->get_image_id(), 'thumbnail') ?: wc_placeholder_img_src(),
                'shareLink' => home_url('/?gcm_share_id=' . $product->get_id()),
            ];
        }

        return new WP_REST_Response($products_data, 200);
    }
}