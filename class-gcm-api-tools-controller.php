<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class GCM_API_Tools_Controller {

    public function register_routes() {
        register_rest_route('gcm/v1', '/dashboard', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [ $this, 'get_dashboard_data' ],
            'permission_callback' => [ $this, 'permission_check' ],
            'args' => [ 'period' => [ 'default' => 'week' ] ],
        ]);
        register_rest_route('gcm/v1', '/products/unlinked-data', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [ $this, 'get_unlinked_data' ],
            'permission_callback' => [ $this, 'permission_check' ],
        ]);
        register_rest_route('gcm/v1', '/products/manual-link', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [ $this, 'manual_link_products' ],
            'permission_callback' => [ $this, 'permission_check' ],
        ]);
        register_rest_route('gcm/v1', '/products/repair-sync', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [ $this, 'repair_product_sync' ],
            'permission_callback' => [ $this, 'permission_check' ],
        ]);
        
        register_rest_route('gcm/v1', '/debug/check-product', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [ $this, 'debug_check_product' ],
            'permission_callback' => [ $this, 'permission_check' ],
        ]);

        register_rest_route('gcm/v1', '/tools/extract-from-url', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [ $this, 'extract_data_from_url' ],
            'permission_callback' => [ $this, 'permission_check' ],
        ]);

        register_rest_route('gcm/v1', '/tools/run-monitor', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'run_monitor_manually' ],
                'permission_callback' => [ $this, 'permission_check' ],
            ]
        ]);
        
        register_rest_route('gcm/v1', '/tools/generate-audio', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'generate_audio_from_text' ],
                'permission_callback' => [ $this, 'permission_check' ],
            ]
        ]);
    }

    public function permission_check() {
        return current_user_can('manage_options');
    }

    public function get_dashboard_data(WP_REST_Request $request) {
        global $wpdb;
        $click_table = $wpdb->prefix . 'gcm_click_log';
        $period = $request->get_param('period') ?? 'week';

        $total_clicks = $wpdb->get_var("SELECT COUNT(*) FROM $click_table");

        $top_products_results = $wpdb->get_results(
            "SELECT product_id, COUNT(id) as clicks 
             FROM $click_table 
             GROUP BY product_id 
             ORDER BY clicks DESC 
             LIMIT 10"
        );
        
        $top_products = [];
        if ($top_products_results) {
            foreach($top_products_results as $result) {
                $product = wc_get_product($result->product_id);
                if ($product) {
                    $top_products[] = ['name' => $product->get_name(), 'clicks' => (int) $result->clicks];
                }
            }
        }
        
        $limit = ($period === 'month') ? 30 : 7;
        $results = $wpdb->get_results($wpdb->prepare(
            "SELECT DATE(click_time) as date, COUNT(id) as clicks 
             FROM $click_table 
             WHERE click_time >= DATE_SUB(CURDATE(), INTERVAL %d DAY) 
             GROUP BY DATE(click_time) 
             ORDER BY date ASC",
            $limit
        ));
        $click_history = [];
        $current_date = new DateTime();
        $current_date->sub(new DateInterval("P{$limit}D"));
        for ($i = 0; $i <= $limit; $i++) {
            $date_key = $current_date->format('Y-m-d'); $found = false;
            foreach ($results as $result) {
                if ($result->date === $date_key) {
                    $click_history[] = ['x' => $date_key, 'y' => (int) $result->clicks]; $found = true; break;
                }
            }
            if (!$found) { $click_history[] = ['x' => $date_key, 'y' => 0]; }
            $current_date->add(new DateInterval('P1D'));
        }
        return new WP_REST_Response(['top_products' => $top_products, 'total_clicks' => (int) $total_clicks, 'click_history' => $click_history], 200);
    }
    
    public function get_unlinked_data(WP_REST_Request $request) {
        $gcm_products_unlinked = [];
        $gcm_products = get_posts(['post_type' => 'gcm_produto', 'posts_per_page' => -1, 'post_status' => 'any']);
        foreach ($gcm_products as $gcm_product) {
            $woo_id = get_post_meta($gcm_product->ID, '_gcm_published_woo_id', true);
            if (empty($woo_id) || !get_post($woo_id)) {
                $gcm_products_unlinked[] = ['id' => $gcm_product->ID, 'title' => $gcm_product->post_title];
            }
        }
        $woo_products_unlinked = [];
        $woo_products_query = new WC_Product_Query([
            'limit' => -1, 'type' => 'external', 'status' => ['publish', 'draft', 'pending'],
            'meta_query' => [['key' => '_gcm_source_id', 'compare' => 'NOT EXISTS']]
        ]);
        $woo_products = $woo_products_query->get_products();
        foreach ($woo_products as $woo_product) {
            $woo_products_unlinked[] = ['id' => $woo_product->get_id(), 'title' => $woo_product->get_name()];
        }
        return new WP_REST_Response(['unlinked_gcm' => $gcm_products_unlinked, 'unlinked_woo' => $woo_products_unlinked], 200);
    }
    
    public function manual_link_products(WP_REST_Request $request) {
        $params = $request->get_json_params();
        $gcm_id = $params['gcm_id'] ?? 0; $woo_id = $params['woo_id'] ?? 0;
        if (empty($gcm_id) || empty($woo_id)) { return new WP_Error('bad_request', 'IDs GCM e WooCommerce são obrigatórios.', ['status' => 400]); }
        update_post_meta($woo_id, '_gcm_source_id', $gcm_id); update_post_meta($gcm_id, '_gcm_published_woo_id', $woo_id);
        return new WP_REST_Response(['message' => 'Produtos ligados com sucesso!'], 200);
    }

    public function repair_product_sync(WP_REST_Request $request) {
        $gcm_products = get_posts(['post_type' => 'gcm_produto', 'posts_per_page' => -1, 'post_status' => 'any']);
        $woo_products_query = new WC_Product_Query(['limit' => -1, 'type' => 'external', 'status' => ['publish', 'draft', 'pending']]);
        $woo_products = $woo_products_query->get_products();
        $relinked_count = 0;
        foreach ($gcm_products as $gcm_product) {
            $existing_woo_id = get_post_meta($gcm_product->ID, '_gcm_published_woo_id', true);
            if ($existing_woo_id && get_post($existing_woo_id) && !get_post_meta($existing_woo_id, '_gcm_source_id', true)) {
                update_post_meta($existing_woo_id, '_gcm_source_id', $gcm_product->ID);
                $relinked_count++;
                continue;
            }
            $gcm_title_clean = mb_strtolower(trim($gcm_product->post_title)); $best_match_score = 0; $best_match_woo_id = null;
            foreach ($woo_products as $woo_product) {
                if (get_post_meta($woo_product->get_id(), '_gcm_source_id', true)) continue;
                $woo_title_clean = mb_strtolower(trim($woo_product->get_name()));
                similar_text($gcm_title_clean, $woo_title_clean, $percent);
                if ($percent > $best_match_score) { $best_match_score = $percent; $best_match_woo_id = $woo_product->get_id(); }
            }
            if ($best_match_woo_id && $best_match_score > 90) {
                update_post_meta($best_match_woo_id, '_gcm_source_id', $gcm_product->ID);
                update_post_meta($gcm_product->ID, '_gcm_published_woo_id', $best_match_woo_id);
                $relinked_count++;
            }
        }
        return new WP_REST_Response(['gcm_products_found' => count($gcm_products), 'woo_products_found' => count($woo_products), 'products_relinked' => $relinked_count], 200);
    }
    
    public function debug_check_product(WP_REST_Request $request) {
        $params = $request->get_json_params();
        $product_id = isset($params['product_id']) ? intval($params['product_id']) : 0;
        if (empty($product_id)) { return new WP_Error('bad_request', 'ID do Produto é obrigatório.', ['status' => 400]); }
        $product = wc_get_product($product_id);
        if (!$product) { return new WP_Error('not_found', 'Produto WooCommerce não encontrado com este ID.', ['status' => 404]); }
        $source_id = get_post_meta($product_id, '_gcm_source_id', true);
        $gcm_product = $source_id ? get_post($source_id) : null;
        $cloaked_url = GCM_Tracking::cloak_external_product_url($product->get_product_url(), $product);
        $debug_info = [
            'Verificando Produto WooCommerce ID' => $product_id, 'Nome do Produto' => $product->get_name(), 'Tipo de Produto' => $product->get_type(),
            'URL de Afiliado (Bruta)' => $product->get_product_url(), 'Tem a "etiqueta" _gcm_source_id?' => $source_id ? "Sim, ID: {$source_id}" : "Não, este é o problema!",
            'Produto GCM correspondente encontrado?' => $gcm_product ? "Sim, Título: " . $gcm_product->post_title : "Não",
            'O filtro de camuflagem de link está funcionando?' => ($cloaked_url !== $product->get_product_url()) ? "Sim" : "Não, o link não está sendo modificado.",
            'URL Final Gerada para o Frontend' => $cloaked_url,
        ];
        return new WP_REST_Response($debug_info, 200);
    }

    private static function css_to_xpath($css_selector) {
        $xpath = $css_selector;
        $xpath = preg_replace('/#([a-zA-Z0-9\-_]+)/', '[@id="$1"]', $xpath);
        $xpath = preg_replace('/\.([a-zA-Z0-9\-_]+)/', '[contains(concat(" ", normalize-space(@class), " "), " $1 ")]', $xpath);
        return '//*' . $xpath;
    }

    public function extract_data_from_url(WP_REST_Request $request) {
        $params = $request->get_json_params();
        $target_url = esc_url_raw($params['target_url'] ?? '');
        if (empty($target_url)) {
            return new WP_Error('bad_request', 'A URL do produto é obrigatória.', ['status' => 400]);
        }
        
        $rules = get_option('gcm_store_price_rules', []);
        $url_host = str_replace('www.', '', parse_url($target_url, PHP_URL_HOST));
        
        $rule_found = null;
        foreach ($rules as $rule) {
            if (isset($rule['domain']) && !empty($rule['domain']) && strpos($url_host, $rule['domain']) !== false) {
                $rule_found = $rule;
                break;
            }
        }
        if (!$rule_found) {
            return new WP_Error('no_rule', 'Nenhuma regra de extração encontrada para o domínio: ' . esc_html($url_host), ['status' => 404]);
        }

        $headers = [
            'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Encoding' => 'gzip, deflate, br',
            'Accept-Language' => 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Upgrade-Insecure-Requests' => '1',
            'Sec-Ch-Ua' => '"Not A;Brand";v="99", "Chromium";v="123", "Google Chrome";v="123"',
            'Sec-Ch-Ua-Mobile' => '?0',
            'Sec-Ch-Ua-Platform' => '"Windows"',
            'Sec-Fetch-Dest' => 'document',
            'Sec-Fetch-Mode' => 'navigate',
            'Sec-Fetch-Site' => 'none',
            'Sec-Fetch-User' => '?1',
        ];

        $response = wp_remote_get($target_url, [
            'timeout' => 30, 
            'redirection' => 5,
            'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'headers' => $headers
        ]);
        
        if (is_wp_error($response)) {
            return new WP_Error('fetch_failed', 'Falha ao buscar a URL: ' . $response->get_error_message(), ['status' => 500]);
        }
        $html = wp_remote_retrieve_body($response);
        if (empty($html)) {
            $response_code = wp_remote_retrieve_response_code($response);
            $response_message = wp_remote_retrieve_response_message($response);
            return new WP_Error('empty_body', "O corpo da resposta da URL está vazio. Código de Status: $response_code $response_message", ['status' => 500]);
        }

        libxml_use_internal_errors(true);
        $doc = new DOMDocument();
        @$doc->loadHTML('<?xml encoding="utf-8" ?>' . $html);
        libxml_clear_errors();
        $xpath = new DOMXPath($doc);
        
        $extracted_data = [];
        $extracted_data['title'] = !empty($rule_found['title_selector']) ? (($node = $xpath->query(self::css_to_xpath($rule_found['title_selector']))->item(0)) ? trim($node->textContent) : '') : '';
        
        $price_str = null;
        $sale_selector = $rule_found['sale_price_selector'] ?? '';
        if ($sale_selector) {
            $node = $xpath->query(self::css_to_xpath($sale_selector))->item(0);
            if ($node) {
                $price_str = trim($node->textContent);
            }
        }

        if ($price_str === null) {
            $regular_selector = $rule_found['regular_price_selector'] ?? '';
            if ($regular_selector) {
                $node = $xpath->query(self::css_to_xpath($regular_selector))->item(0);
                if ($node) {
                    $price_str = trim($node->textContent);
                }
            }
        }
        
        $cleaned_price = '0';
        if ($price_str !== null) {
            $temp_price = preg_replace('/[^\d,.]/', '', $price_str);
            $temp_price = str_replace('.', '', $temp_price);
            $comma_pos = strrpos($temp_price, ',');
            if ($comma_pos !== false) {
                $integer_part = substr($temp_price, 0, $comma_pos);
                $decimal_part = substr($temp_price, $comma_pos + 1);
                $temp_price = $integer_part . '.' . $decimal_part;
            }
            $cleaned_price = number_format(floatval($temp_price), 2, ',', '.');
        }
        $extracted_data['price'] = $cleaned_price;

        $desc_node = !empty($rule_found['desc_selector']) ? $xpath->query(self::css_to_xpath($rule_found['desc_selector']))->item(0) : null;
        $extracted_data['description'] = $desc_node ? trim($doc->saveHTML($desc_node)) : 'Descrição não encontrada.';

        $extracted_data['videoUrl'] = '';
        if (!empty($rule_found['video_selector'])) {
            $video_node = $xpath->query(self::css_to_xpath($rule_found['video_selector']))->item(0);
            if ($video_node && $video_node->hasAttribute('src')) {
                $video_src = $video_node->getAttribute('src');
                if (strpos($video_src, 'youtube.com/watch?v=') !== false) {
                    parse_str(parse_url($video_src, PHP_URL_QUERY), $query_params);
                    if (!empty($query_params['v'])) {
                        $extracted_data['videoUrl'] = 'https://www.youtube.com/embed/' . $query_params['v'];
                    }
                } else {
                    $extracted_data['videoUrl'] = $video_src;
                }
            }
        }

        $images = [];
        if (!empty($rule_found['gallery_selector'])) {
            $nodes = $xpath->query(self::css_to_xpath($rule_found['gallery_selector']));
            if($nodes) {
                foreach ($nodes as $node) {
                    $image_url = $node->getAttribute('data-zoom') ?: $node->getAttribute('src') ?: $node->getAttribute('href');
                    if ($image_url) {
                         $absolute_url = $image_url;
                         if (substr($image_url, 0, 2) === '//') {
                             $absolute_url = 'https:' . $image_url;
                         } elseif (substr($image_url, 0, 1) === '/') {
                             $scheme = parse_url($target_url, PHP_URL_SCHEME);
                             $host = parse_url($target_url, PHP_URL_HOST);
                             $absolute_url = $scheme . '://' . $host . $image_url;
                         }
                         $images[] = $absolute_url;
                    }
                }
            }
        }
        $extracted_data['images'] = array_slice(array_unique($images), 0, 10);
        
        $specs_html = '';
        $parsed_specifications = '';
        if (!empty($rule_found['specs_selector'])) {
            $table_node = $xpath->query(self::css_to_xpath($rule_found['specs_selector']))->item(0);
            if($table_node) {
                $specs_html = $doc->saveHTML($table_node);
                $rows = $xpath->query('.//tr', $table_node);
                foreach ($rows as $row) {
                    $cols = $xpath->query('.//td|.//th', $row);
                    if ($cols->length >= 2) {
                        $key = trim($cols->item(0)->textContent);
                        $value = trim($cols->item(1)->textContent);
                        if (!empty($key) && !empty($value)) {
                            $parsed_specifications .= "$key: $value\n";
                        }
                    }
                }
            }
        }
        $extracted_data['specs_html'] = $specs_html;
        $extracted_data['parsed_specifications'] = trim($parsed_specifications);

        return new WP_REST_Response($extracted_data, 200);
    }

    public function run_monitor_manually(WP_REST_Request $request) {
        if (class_exists('GCM_Monitor')) {
            $monitor = new GCM_Monitor();
            $monitor->run_link_and_price_checker();
            return new WP_REST_Response(['message' => 'Verificação de links e preços concluída.'], 200);
        } else {
            return new WP_Error('class_not_found', 'Classe GCM_Monitor não encontrada.', ['status' => 500]);
        }
    }

    public function generate_audio_from_text(WP_REST_Request $request) {
        $params = $request->get_json_params();
        $text_to_convert = wp_strip_all_tags($params['text'] ?? '');
        
        if (empty($text_to_convert)) {
            return new WP_Error('no_text', 'Nenhum texto fornecido para conversão.', ['status' => 400]);
        }
        
        $api_key = get_option('gcm_google_tts_api_key', '');
        if (empty($api_key)) {
            return new WP_Error('no_api_key', 'A chave de API do Google Cloud Text-to-Speech não está configurada.', ['status' => 400]);
        }
        
        $google_api_url = 'https://texttospeech.googleapis.com/v1/text:synthesize?key=' . $api_key;
        
        $request_body = json_encode([
            'input' => [ 'text' => substr($text_to_convert, 0, 4999) ],
            'voice' => [ 'languageCode' => 'pt-BR', 'name' => 'pt-BR-Wavenet-B', 'ssmlGender' => 'MALE' ],
            'audioConfig' => [ 'audioEncoding' => 'MP3' ]
        ]);

        $response = wp_remote_post($google_api_url, [
            'headers' => ['Content-Type' => 'application/json; charset=utf-8'],
            'body' => $request_body,
            'timeout' => 30,
        ]);

        if (is_wp_error($response)) {
            return new WP_Error('api_request_failed', 'Falha na comunicação com a API do Google: ' . $response->get_error_message(), ['status' => 500]);
        }

        $response_body = wp_remote_retrieve_body($response);
        $response_data = json_decode($response_body, true);

        if (isset($response_data['error'])) {
            return new WP_Error('google_api_error', 'Erro da API do Google: ' . $response_data['error']['message'], ['status' => 500]);
        }
        
        if (!isset($response_data['audioContent'])) {
            return new WP_Error('no_audio_content', 'A resposta da API não continha conteúdo de áudio.', ['status' => 500]);
        }
        
        $upload_dir = wp_upload_dir();
        $audio_dir = $upload_dir['basedir'] . '/gcm-audio';
        if (!file_exists($audio_dir)) {
            wp_mkdir_p($audio_dir);
        }
        
        $file_name = 'audio_' . md5($text_to_convert) . '.mp3';
        $file_path = $audio_dir . '/' . $file_name;
        $audio_url = $upload_dir['baseurl'] . '/gcm-audio/' . $file_name;

        $saved = file_put_contents($file_path, base64_decode($response_data['audioContent']));
        
        if ($saved === false) {
            return new WP_Error('file_save_error', 'Não foi possível salvar o arquivo de áudio no servidor.', ['status' => 500]);
        }

        return new WP_REST_Response(['audio_url' => $audio_url], 200);
    }
}