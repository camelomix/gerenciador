<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class GCM_API_Products_Controller {

    public function register_routes() {
        register_rest_route('gcm/v1', '/products', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [ $this, 'get_products' ],
                'permission_callback' => [ $this, 'permission_check' ],
                'args' => [
                    'page' => [ 'type' => 'integer', 'sanitize_callback' => 'absint', 'default' => 1 ],
                    's'    => [ 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field' ],
                    'category' => [ 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field' ],
                ]
            ],
            [ 'methods' => WP_REST_Server::CREATABLE, 'callback' => [ $this, 'create_product' ], 'permission_callback' => [ $this, 'permission_check' ] ],
            [ 'methods' => WP_REST_Server::DELETABLE, 'callback' => [ $this, 'delete_products' ], 'permission_callback' => [ $this, 'permission_check' ] ],
        ]);
        register_rest_route('gcm/v1', '/products/(?P<id>\d+)', [
            'methods' => WP_REST_Server::CREATABLE, 'callback' => [ $this, 'update_product' ], 'permission_callback' => [ $this, 'permission_check' ],
        ]);
        register_rest_route('gcm/v1', '/products/bulk-update', [
            'methods' => WP_REST_Server::CREATABLE, 'callback' => [ $this, 'bulk_update_products' ], 'permission_callback' => [ $this, 'permission_check' ] ]);
        register_rest_route( 'gcm/v1', '/products/publish-to-woocommerce', [
            'methods' => WP_REST_Server::CREATABLE, 'callback' => [ $this, 'publish_to_woocommerce' ], 'permission_callback' => [ $this, 'permission_check' ],
        ]);
    }

    public function permission_check() {
        return current_user_can('manage_options');
    }

    private function get_attachment_id_from_url( $url ) {
        global $wpdb;
        $attachment_id = 0;
        if ( !empty($url) ) {
            $attachment_id = $wpdb->get_col($wpdb->prepare("SELECT ID FROM $wpdb->posts WHERE guid='%s';", $url ));
            if ( $attachment_id ) {
                return $attachment_id[0];
            }
        }
        return 0;
    }

    public function get_products(WP_REST_Request $request) {
        $page = $request->get_param('page');
        $search_term = $request->get_param('s');
        $category = $request->get_param('category');

        $args = [
            'post_type' => 'gcm_produto',
            'post_status' => 'publish',
            'posts_per_page' => 20,
            'paged' => $page,
            's' => $search_term,
            'orderby' => 'date',
            'order' => 'DESC'
        ];

        if ($category && $category !== 'all') {
            $category_clean = ltrim($category, '— ');
            $args['meta_query'] = [
                [
                    'key'     => 'gcm_category',
                    'value'   => $category_clean,
                    'compare' => '=',
                ],
            ];
        }

        $query = new WP_Query($args);
        $posts = $query->get_posts();

        $products = [];
        global $wpdb;
        $click_table = $wpdb->prefix . 'gcm_click_log';

        $post_ids = wp_list_pluck($posts, 'ID');
        $woo_product_ids = [];
        if (!empty($post_ids)) {
            foreach($post_ids as $post_id) {
                $woo_id = get_post_meta($post_id, '_gcm_published_woo_id', true);
                if ($woo_id && get_post($woo_id)) { $woo_product_ids[] = (int)$woo_id; }
            }
        }

        $click_counts = [];
        if (!empty($woo_product_ids)) {
            $how_many = count($woo_product_ids);
            $placeholders = array_fill(0, $how_many, '%d');
            $format = implode(',', $placeholders);
            $query_clicks = "SELECT product_id, COUNT(id) as count FROM {$click_table} WHERE product_id IN ($format) GROUP BY product_id";
            $results = $wpdb->get_results( $wpdb->prepare( $query_clicks, $woo_product_ids ) );
            if ($results) {
                foreach ($results as $result) { $click_counts[$result->product_id] = (int)$result->count; }
            }
        }

        foreach ($posts as $post) {
            $meta = get_post_meta($post->ID);
            $images_json = isset($meta['gcm_images'][0]) ? $meta['gcm_images'][0] : '[]';
            $images = json_decode($images_json, true);
            if (json_last_error() !== JSON_ERROR_NONE) { $images = []; }
            $woo_id = get_post_meta($post->ID, '_gcm_published_woo_id', true);
            $click_count = ($woo_id && isset($click_counts[$woo_id])) ? $click_counts[$woo_id] : 0;

            $share_link = '';
            if ($woo_id && get_post($woo_id) && class_exists('GCM_Sharing')) {
                $share_link = home_url('/?gcm_share_id=' . $woo_id);
            }

            $products[] = [
                'id' => $post->ID,
                'title' => $post->post_title,
                'description' => $post->post_content,
                'price' => $meta['gcm_price'][0] ?? '',
                'affiliateUrl' => $meta['gcm_affiliateUrl'][0] ?? '',
                'category' => $meta['gcm_category'][0] ?? 'Sem Categoria',
                'brand' => $meta['gcm_brand'][0] ?? '',
                'images' => $images,
                'seoTitle' => $meta['gcm_seoTitle'][0] ?? '',
                'seoSlug' => $meta['gcm_seoSlug'][0] ?? '',
                'metaDescription' => $meta['gcm_metaDescription'][0] ?? '',
                'focusKeyphrase' => $meta['gcm_focusKeyphrase'][0] ?? '',
                'tags' => $meta['gcm_tags'][0] ?? '',
                'woo_id' => $woo_id,
                'click_count' => $click_count,
                'productType' => $meta['gcm_productType'][0] ?? 'afiliado',
                'videoUrl' => $meta['gcm_videoUrl'][0] ?? '',
                'shareLink' => $share_link,
                'specifications' => $meta['gcm_specifications'][0] ?? '',
            ];
        }

        $response_data = [
            'products' => $products,
            'pagination' => [
                'total_pages' => $query->max_num_pages,
                'current_page' => $page
            ]
        ];

        return new WP_REST_Response($response_data, 200);
    }

    public function create_product(WP_REST_Request $request) {
        $post_id = $this->save_product_data(0, $request->get_json_params());
        return is_wp_error($post_id) ? new WP_REST_Response(['message' => $post_id->get_error_message()], 500) : new WP_REST_Response(['message' => 'Produto criado!', 'id' => $post_id], 201);
    }
    
    public function update_product(WP_REST_Request $request) {
        $gcm_id = $request->get_param('id');
        $data = $request->get_json_params();
        $post_id = $this->save_product_data($gcm_id, $data);
        if (is_wp_error($post_id)) {
            return new WP_REST_Response(['message' => $post_id->get_error_message()], 500);
        }
        $this->sync_with_woocommerce($gcm_id, $data);
        return new WP_REST_Response(['message' => 'Produto atualizado!', 'id' => $post_id], 200);
    }

    public function delete_products(WP_REST_Request $request) {
        $params = $request->get_json_params();
        $ids = isset($params['ids']) && is_array($params['ids']) ? array_map('intval', $params['ids']) : [];
        if (empty($ids)) {
            return new WP_REST_Response(['message' => 'Nenhum ID fornecido.'], 400);
        }
        $deleted_count = 0;
        foreach ($ids as $id) {
            if(wp_delete_post($id, true)) {
                $deleted_count++;
            }
        }
        return new WP_REST_Response(['message' => $deleted_count . ' produto(s) excluído(s).'], 200);
    }

    public function bulk_update_products(WP_REST_Request $request) {
        $data = $request->get_json_params();
        $ids = $data['ids'] ?? [];
        $updates = $data['updates'] ?? [];
        if (empty($ids) || empty($updates)) {
            return new WP_REST_Response(['message' => 'Dados ausentes.'], 400);
        }
        foreach ($ids as $id) {
            $full_data_to_sync = [];
            foreach($updates as $key => $value) {
                update_post_meta($id, 'gcm_'.sanitize_key($key), sanitize_text_field($value));
                $full_data_to_sync[$key] = sanitize_text_field($value);
            }
            $this->sync_with_woocommerce($id, $full_data_to_sync);
        }
        return new WP_REST_Response(['message' => 'Produtos atualizados!'], 200);
    }

    public function publish_to_woocommerce(WP_REST_Request $request) {
        if (!class_exists('WooCommerce')) {
            return new WP_REST_Response(['message' => 'WooCommerce não está ativo.'], 500);
        }
        $params = $request->get_json_params();
        $ids = $params['ids'] ?? [];
        if (empty($ids)) {
            return new WP_REST_Response(['message' => 'Nenhum ID fornecido.'], 400);
        }
        $success_count = 0;
        $error_count = 0;
        $errors = [];
        foreach ($ids as $gcm_id) {
            if (get_post_meta($gcm_id, '_gcm_published_woo_id', true)) {
                continue;
            }
            $gcm_post = get_post($gcm_id);
            $meta = get_post_meta($gcm_id);
            try {
                $product_type = $meta['gcm_productType'][0] ?? 'afiliado';
                $product = ($product_type === 'loja') ? new WC_Product_Simple() : new WC_Product_External();

                $product->set_name(isset($meta['gcm_seoTitle'][0]) && !empty($meta['gcm_seoTitle'][0]) ? sanitize_text_field($meta['gcm_seoTitle'][0]) : sanitize_text_field($gcm_post->post_title));
                $product->set_status('publish');
                $product->set_description($gcm_post->post_content);
                $product->set_short_description($meta['gcm_metaDescription'][0] ?? '');

                $price_str = $meta['gcm_price'][0] ?? '0';
                $cleaned_str = str_replace(',', '.', preg_replace('/[^\d,]/', '', $price_str));
                $product->set_regular_price(floatval($cleaned_str));
                $product->set_price(floatval($cleaned_str));

                if ($product_type === 'afiliado') {
                    $product->set_product_url(esc_url_raw($meta['gcm_affiliateUrl'][0] ?? ''));
                    $product->set_button_text('Comprar Agora');
                }

                $image_urls = !empty($meta['gcm_images'][0]) ? json_decode($meta['gcm_images'][0], true) : [];
                if (!empty($image_urls) && is_array($image_urls)) {
                    if (!function_exists('media_sideload_image')) {
                        require_once(ABSPATH . 'wp-admin/includes/media.php');
                        require_once(ABSPATH . 'wp-admin/includes/file.php');
                        require_once(ABSPATH . 'wp-admin/includes/image.php');
                    }
                    $gallery_ids = [];
                    foreach ($image_urls as $index => $url) {
                        $attachment_id = $this->get_attachment_id_from_url($url);
                        if (!$attachment_id) {
                            $attachment_id = media_sideload_image($url, 0, $product->get_name(), 'id');
                        }

                        if (!is_wp_error($attachment_id)) {
                            if ($index === 0) $product->set_image_id($attachment_id);
                            else $gallery_ids[] = $attachment_id;
                        }
                    }
                    if (!empty($gallery_ids)) $product->set_gallery_image_ids($gallery_ids);
                }

                $new_product_id = $product->save();
                
                $specifications_raw = $meta['gcm_specifications'][0] ?? '';
                $this->_parse_and_set_attributes(wc_get_product($new_product_id), $specifications_raw);
                $product->save();


                if (!empty($meta['gcm_seoSlug'][0])) {
                    wp_update_post(['ID' => $new_product_id, 'post_name' => sanitize_title($meta['gcm_seoSlug'][0])]);
                }

                $category_name_raw = $meta['gcm_category'][0] ?? 'Sem Categoria';
                $category_name_clean = ltrim($category_name_raw, '— ');
                $term = term_exists($category_name_clean, 'product_cat');
                if ($term) {
                    wp_set_object_terms($new_product_id, (int)$term['term_id'], 'product_cat');
                } else {
                    $new_term = wp_insert_term($category_name_clean, 'product_cat');
                    if (!is_wp_error($new_term)) {
                        wp_set_object_terms($new_product_id, (int)$new_term['term_id'], 'product_cat');
                    }
                }

                if (!empty($meta['gcm_tags'][0])) {
                    wp_set_object_terms($new_product_id, explode(',', sanitize_text_field($meta['gcm_tags'][0])), 'product_tag');
                }

                if (!empty($meta['gcm_videoUrl'][0])) {
                    update_post_meta($new_product_id, '_youtube_video_url', esc_url_raw($meta['gcm_videoUrl'][0]));
                }

                update_post_meta($new_product_id, '_gcm_source_id', $gcm_id);
                update_post_meta($gcm_id, '_gcm_published_woo_id', $new_product_id);
                $success_count++;
            } catch (Exception $e) {
                $error_count++;
                $errors[] = "Produto ID {$gcm_id}: " . $e->getMessage();
            }
        }
        $message = "{$success_count} produto(s) publicados. " . ($error_count > 0 ? "{$error_count} falharam." : "");
        return new WP_REST_Response(['message' => $message, 'errors' => $errors], 200);
    }

    private function save_product_data($post_id, $data) {
        $sanitized_data = $this->sanitize_product_data($data);
        $post_arr = ['post_type' => 'gcm_produto', 'post_status' => 'publish', 'post_excerpt' => $sanitized_data['gcm_metaDescription'] ?? ''];
        if ($post_id) $post_arr['ID'] = intval($post_id);
        if (isset($sanitized_data['post_title'])) $post_arr['post_title'] = $sanitized_data['post_title'];
        if (isset($sanitized_data['post_content'])) $post_arr['post_content'] = $sanitized_data['post_content'];
        if (isset($sanitized_data['gcm_seoSlug'])) $post_arr['post_name'] = $sanitized_data['gcm_seoSlug'];
        $new_post_id = wp_insert_post($post_arr, true);
        if (is_wp_error($new_post_id)) return $new_post_id;
        foreach ($sanitized_data as $key => $value) {
            if (strpos($key, 'gcm_') === 0 || strpos($key, '_gcm_') === 0) {
                update_post_meta($new_post_id, $key, $value);
            }
        }
        return $new_post_id;
    }

    private function sanitize_product_data($data) {
        $sanitized_data = [];
        $meta_fields = ['price', 'affiliateUrl', 'category', 'brand', 'seoTitle', 'seoSlug', 'metaDescription', 'focusKeyphrase', 'tags', 'productType', 'videoUrl', 'specifications'];
        if (isset($data['title'])) $sanitized_data['post_title'] = sanitize_text_field($data['title']);
        if (isset($data['description'])) $sanitized_data['post_content'] = wp_kses_post($data['description']);
        foreach ($meta_fields as $field) {
            if (isset($data[$field])) {
                $key = 'gcm_' . $field;
                if ($field === 'affiliateUrl' || $field === 'videoUrl') {
                    $sanitized_data[$key] = esc_url_raw($data[$field]);
                } else if ($field === 'specifications') {
                    $sanitized_data[$key] = sanitize_textarea_field($data[$field]);
                } else {
                    $sanitized_data[$key] = sanitize_text_field($data[$field]);
                }
            }
        }
        if (isset($data['images']) && is_array($data['images'])) {
            $sanitized_data['gcm_images'] = wp_json_encode(array_map('esc_url_raw', $data['images']));
        }
        return $sanitized_data;
    }

    private function sync_with_woocommerce($gcm_id, $data) {
        $woo_id = get_post_meta($gcm_id, '_gcm_published_woo_id', true);
        if (!$woo_id || !class_exists('WooCommerce')) {
            return;
        }
        $product = wc_get_product($woo_id);
        if (!$product) {
            return;
        }

        if (isset($data['productType'])) {
            $current_type = $product->get_type();
            $new_type = ($data['productType'] === 'loja') ? 'simple' : 'external';
            if ($current_type !== $new_type) {
                wp_set_object_terms($woo_id, $new_type, 'product_type');
                $product = wc_get_product($woo_id); // Re-fetch product object
            }
        }

        if (isset($data['seoTitle'])) $product->set_name(sanitize_text_field($data['seoTitle']));
        elseif (isset($data['title'])) $product->set_name(sanitize_text_field($data['title']));
        if (isset($data['description'])) $product->set_description(wp_kses_post($data['description']));
        if (isset($data['metaDescription'])) $product->set_short_description(sanitize_textarea_field($data['metaDescription']));
        if (isset($data['price'])) {
            $price_str = $data['price'];
            $cleaned_str = str_replace(',', '.', preg_replace('/[^\d,]/', '', $price_str));
            $product->set_regular_price(floatval($cleaned_str));
            $product->set_price(floatval($cleaned_str));
        }
        if (isset($data['category'])) {
            $category_name_raw = sanitize_text_field($data['category']);
            $category_name_clean = ltrim($category_name_raw, '— ');
            $term = term_exists($category_name_clean, 'product_cat') ?: wp_insert_term($category_name_clean, 'product_cat');
            if (!is_wp_error($term)) $product->set_category_ids([(int)$term['term_id']]);
        }
        if (isset($data['tags'])) {
            wp_set_object_terms($woo_id, explode(',', sanitize_text_field($data['tags'])), 'product_tag');
        }
        if (isset($data['seoSlug'])) {
            $product->set_slug(sanitize_title($data['seoSlug']));
        }

        if ($product->is_type('external')) {
            if (isset($data['affiliateUrl'])) $product->set_product_url(esc_url_raw($data['affiliateUrl']));
            $product->set_button_text('Comprar Agora');
        } else if ($product->is_type('simple')) {
            $product->set_product_url('');
            $product->set_button_text('');
        }

        if (isset($data['images']) && is_array($data['images'])) {
            if (!function_exists('media_sideload_image')) {
                require_once(ABSPATH . 'wp-admin/includes/media.php');
                require_once(ABSPATH . 'wp-admin/includes/file.php');
                require_once(ABSPATH . 'wp-admin/includes/image.php');
            }
            $gallery_ids = [];
            $first_image_set = false;
            foreach($data['images'] as $url) {
                $attachment_id = $this->get_attachment_id_from_url($url);
                if (!$attachment_id) {
                    $attachment_id = media_sideload_image($url, $woo_id, $product->get_name(), 'id');
                }

                if (!is_wp_error($attachment_id)) {
                    if (!$first_image_set) {
                        $product->set_image_id($attachment_id);
                        $first_image_set = true;
                    } else {
                        $gallery_ids[] = $attachment_id;
                    }
                }
            }
            if (!$first_image_set) {
                $product->set_image_id(0);
            }
            $product->set_gallery_image_ids($gallery_ids);
        }

        if (isset($data['specifications'])) {
            $this->_parse_and_set_attributes($product, $data['specifications']);
        }

        $product->save();

        if (isset($data['videoUrl'])) {
            update_post_meta($woo_id, '_youtube_video_url', esc_url_raw($data['videoUrl']));
        }
    }

    private function _parse_and_set_attributes(&$product, $specifications_raw) {
        if (!class_exists('WooCommerce')) {
            return;
        }

        $attributes = [];
        $product->set_attributes([]); // Limpa atributos existentes para garantir uma sincronização limpa

        if (empty($specifications_raw)) {
            $product->save();
            return;
        }

        $lines = explode("\n", trim($specifications_raw));
        
        foreach ($lines as $line) {
            if (strpos($line, ':') === false) continue;

            list($key, $value) = array_map('trim', explode(':', $line, 2));
            if (empty($key) || empty($value)) continue;

            $attribute_name = $key;
            $attribute_values = array_map('trim', explode('|', $value));
            $attribute_slug = wc_attribute_taxonomy_name($attribute_name); // Gera o slug 'pa_nome-do-atributo'
            $taxonomy_name = $attribute_slug;

            // Cria o atributo global se ele não existir
            $attribute_id = wc_attribute_taxonomy_id_by_name($attribute_name);
            if (!$attribute_id) {
                $attribute_id = wc_create_attribute([
                    'name' => $attribute_name,
                    'slug' => wc_sanitize_taxonomy_name($attribute_name),
                    'type' => 'select',
                    'order_by' => 'menu_order',
                    'has_archives' => false,
                ]);
            }

            // Garante que a taxonomia esteja registrada para o post type do produto
            if (!taxonomy_exists($taxonomy_name)) {
                register_taxonomy(
                    $taxonomy_name,
                    'product',
                    ['hierarchical' => false, 'show_ui' => false, 'query_var' => true, 'rewrite' => false]
                );
            }

            // Garante que os termos (valores) existam e os define para o produto
            wp_set_object_terms($product->get_id(), $attribute_values, $taxonomy_name);

            // Cria o objeto WC_Product_Attribute para que ele apareça na aba de atributos
            $attribute = new WC_Product_Attribute();
            $attribute->set_id($attribute_id);
            $attribute->set_name($taxonomy_name);
            $attribute->set_options($attribute_values);
            $attribute->set_visible(true);
            $attribute->set_variation(false);
            $attributes[] = $attribute;
        }

        $product->set_attributes($attributes);
    }
}