<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class GCM_Monitor {

    const CRON_HOOK = 'gcm_daily_link_check';
    const BROKEN_LINKS_TRANSIENT = 'gcm_broken_links_report';
    const PRICE_CHANGES_TRANSIENT = 'gcm_price_changes_report';

    private function log($message) {
        error_log('[GCM Monitor Debug]: ' . $message);
    }

    public function __construct() {
        add_action(self::CRON_HOOK, [ $this, 'run_link_and_price_checker' ]);
        add_action('admin_notices', [ $this, 'show_admin_notices' ]);
    }

    public static function schedule_cron() {
        if (!wp_next_scheduled(self::CRON_HOOK)) {
            wp_schedule_event(time(), 'daily', self::CRON_HOOK);
        }
    }

    public static function unschedule_cron() {
        wp_clear_scheduled_hook(self::CRON_HOOK);
    }

    public function run_link_and_price_checker() {
        $this->log('------------------ INICIANDO VERIFICAÇÃO DO MONITOR ------------------');
        
        $products_query = new WP_Query([
            'post_type' => 'product',
            'posts_per_page' => -1,
            'post_status' => 'publish',
            'meta_query' => [['key' => '_gcm_source_id', 'compare' => 'EXISTS']]
        ]);

        if (!$products_query->have_posts()) {
            $this->log('Nenhum produto encontrado para verificação. Encerrando.');
            delete_transient(self::BROKEN_LINKS_TRANSIENT);
            delete_transient(self::PRICE_CHANGES_TRANSIENT);
            return;
        }

        $this->log('Encontrados ' . $products_query->post_count . ' produtos para verificar.');

        $broken_links = [];
        $price_changes = [];
        $store_rules = get_option('gcm_store_price_rules', []);

        while ($products_query->have_posts()) {
            $products_query->the_post();
            $product = wc_get_product(get_the_ID());
            
            $this->log('Verificando Produto ID: ' . $product->get_id() . ' - Nome: ' . $product->get_name());

            if ($product && $product->is_type('external')) {
                $url = $product->get_product_url();
                $this->log('URL de Afiliado: ' . $url);

                if (filter_var($url, FILTER_VALIDATE_URL)) {
                    $headers = [
                        'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language' => 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                        'Upgrade-Insecure-Requests' => '1',
                        'user-agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                    ];

                    $this->log('Enviando requisição remota...');
                    $response = wp_remote_get($url, ['timeout' => 30, 'redirection' => 5, 'sslverify' => true, 'headers' => $headers, 'decompress' => true]);

                    if (is_wp_error($response)) {
                        $this->log('ERRO na requisição: ' . $response->get_error_message());
                        $broken_links[] = ['id' => $product->get_id(), 'name' => $product->get_name(), 'status' => 'Erro de Conexão'];
                    } else {
                        $status_code = wp_remote_retrieve_response_code($response);
                        $this->log('Resposta recebida com sucesso. Status HTTP: ' . $status_code);

                        if ($status_code >= 400) {
                            $broken_links[] = ['id' => $product->get_id(), 'name' => $product->get_name(), 'status' => $status_code];
                        } else {
                            $this->check_product_price($product, $response, $store_rules, $price_changes, $broken_links);
                        }
                    }
                } else {
                    $this->log('URL inválida. Pulando produto.');
                }
            } else {
                $this->log('Produto não é do tipo "externo". Pulando.');
            }
            sleep(1);
        }
        wp_reset_postdata();

        $this->log('Verificação concluída. Links quebrados encontrados: ' . count($broken_links) . '. Alterações de preço encontradas: ' . count($price_changes) . '.');
        set_transient(self::BROKEN_LINKS_TRANSIENT, $broken_links, DAY_IN_SECONDS + HOUR_IN_SECONDS);
        set_transient(self::PRICE_CHANGES_TRANSIENT, $price_changes, DAY_IN_SECONDS + HOUR_IN_SECONDS);
        $this->log('------------------ FIM DA VERIFICAÇÃO DO MONITOR ------------------');
    }
    
    private function check_product_price($product, $response, $store_rules, &$price_changes, &$broken_links) {
        $this->log('Iniciando verificação de preço para o produto ID: ' . $product->get_id());
        $url = $product->get_product_url();
        $hostname = str_replace('www.', '', parse_url($url, PHP_URL_HOST));

        $rule_found = null;
        foreach ($store_rules as $rule) {
            $has_sale_selector = !empty($rule['sale_price_selector']);
            $has_regular_selector = !empty($rule['regular_price_selector']);
            
            if (!empty($rule['domain']) && ($has_sale_selector || $has_regular_selector) && strpos($hostname, $rule['domain']) !== false) {
                $rule_found = $rule;
                break;
            }
        }
        if (!$rule_found) {
            $this->log('Nenhuma regra de preço (promocional ou regular) encontrada para o domínio: ' . $hostname);
            return;
        }

        $body = wp_remote_retrieve_body($response);
        if (empty($body)) {
            $this->log('Corpo da resposta vazio. Não é possível verificar o preço.');
            return;
        }

        $dom = new DOMDocument();
        libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="utf-8" ?>' . $body);
        libxml_clear_errors();
        $xpath = new DOMXPath($dom);

        $new_price_str = null;

        $sale_selector = $rule_found['sale_price_selector'] ?? '';
        if ($sale_selector) {
            $this->log('Tentando seletor de PREÇO PROMOCIONAL: ' . $sale_selector);
            $price_elements = $xpath->query($this->css_to_xpath($sale_selector));
            if ($price_elements && $price_elements->length > 0) {
                $new_price_str = $price_elements[0]->nodeValue;
                $this->log('PREÇO PROMOCIONAL encontrado: "' . $new_price_str . '"');
            }
        }

        if ($new_price_str === null) {
            $regular_selector = $rule_found['regular_price_selector'] ?? '';
            if ($regular_selector) {
                $this->log('Nenhum preço promocional encontrado. Tentando seletor de PREÇO REGULAR: ' . $regular_selector);
                $price_elements = $xpath->query($this->css_to_xpath($regular_selector));
                if ($price_elements && $price_elements->length > 0) {
                    $new_price_str = $price_elements[0]->nodeValue;
                    $this->log('PREÇO REGULAR encontrado: "' . $new_price_str . '"');
                }
            }
        }
        
        if ($new_price_str !== null) {
            $this->log('Texto do preço extraído da página: "' . $new_price_str . '"');
            
            $temp_price = preg_replace('/[^\d,.]/', '', $new_price_str);
            $temp_price = str_replace('.', '', $temp_price);
            $comma_pos = strrpos($temp_price, ',');
            if ($comma_pos !== false) {
                $integer_part = substr($temp_price, 0, $comma_pos);
                $decimal_part = substr($temp_price, $comma_pos + 1);
                $temp_price = $integer_part . '.' . $decimal_part;
            }
            $new_price_val = floatval($temp_price);

            $this->log('Valor numérico do novo preço: ' . $new_price_val);
            
            $current_price_val = floatval($product->get_price());
            $this->log('Valor do preço atual no WooCommerce: ' . $current_price_val);

            if ($new_price_val > 0 && abs($new_price_val - $current_price_val) > 0.01) {
                $this->log('!!! ALTERAÇÃO DE PREÇO DETECTADA !!! Atualizando produto...');
                $gcm_source_id = get_post_meta($product->get_id(), '_gcm_source_id', true);
                $product->set_price($new_price_val);
                $product->set_regular_price($new_price_val);
                $product->save();
                if ($gcm_source_id) {
                    update_post_meta($gcm_source_id, 'gcm_price', 'R$ ' . number_format($new_price_val, 2, ',', '.'));
                }
                $price_changes[] = ['id' => $product->get_id(), 'name' => $product->get_name(), 'old_price' => $current_price_val, 'new_price' => $new_price_val];
            } else {
                $this->log('Nenhuma alteração de preço necessária.');
            }
        } else {
            $this->log('ERRO: Nenhum seletor de preço (promocional ou regular) encontrou um elemento na página.');
            $broken_links[] = ['id' => $product->get_id(), 'name' => $product->get_name(), 'status' => 'Falha na Leitura do Preço'];
        }
    }

    private function css_to_xpath($selector) {
        $selector = preg_replace('/#([a-zA-Z0-9_-]+)/', '[@id="$1"]', $selector);
        $selector = preg_replace('/\.([a-zA-Z0-9_-]+)/', '[contains(concat(" ", normalize-space(@class), " "), " $1 ")]', $selector);
        return '//' . '*' . $selector;
    }

    public function show_admin_notices() {
        $broken_links = get_transient(self::BROKEN_LINKS_TRANSIENT);
        $price_changes = get_transient(self::PRICE_CHANGES_TRANSIENT);

        if (!empty($broken_links)) {
            echo '<div class="notice notice-error is-dismissible"><p><strong>[GCM Monitor] Links Quebrados Detectados:</strong></p><ul>';
            foreach ($broken_links as $link) {
                if(isset($link['id']) && isset($link['name']) && isset($link['status'])) {
                    $edit_link = get_edit_post_link($link['id']);
                    echo '<li>Produto: <a href="' . esc_url($edit_link) . '">' . esc_html($link['name']) . '</a> - Status: ' . esc_html($link['status']) . '</li>';
                }
            }
            echo '</ul></div>';
        }

        if (!empty($price_changes)) {
            echo '<div class="notice notice-warning is-dismissible"><p><strong>[GCM Monitor] Alterações de Preço Detectadas:</strong></p><ul>';
            foreach ($price_changes as $change) {
                 if(isset($change['id']) && isset($change['name']) && isset($change['old_price']) && isset($change['new_price'])) {
                    $edit_link = get_edit_post_link($change['id']);
                    echo '<li>Produto: <a href="' . esc_url($edit_link) . '">' . esc_html($change['name']) . '</a> - Preço alterado de R$ ' . number_format($change['old_price'], 2, ',', '.') . ' para R$ ' . number_format($change['new_price'], 2, ',', '.') . '</li>';
                }
            }
            echo '</ul></div>';
        }
    }
}