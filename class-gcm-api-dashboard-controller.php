<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class GCM_API_Dashboard_Controller {

    public function register_routes() {
        register_rest_route('gcm/v1', '/dashboard', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get_dashboard_data' ],
                'permission_callback' => [ $this, 'permission_check' ],
                'args'                => [
                    'period' => [ 'type' => 'string', 'default' => 'week-1' ],
                    'start'  => [ 'type' => 'string', 'validate_callback' => 'wp_check_date' ],
                    'end'    => [ 'type' => 'string', 'validate_callback' => 'wp_check_date' ],
                    'page'   => [ 'type' => 'integer', 'sanitize_callback' => 'absint', 'default' => 1 ],
                ],
            ]
        ]);

        // MODIFICAÇÃO: Nova rota para os relatórios do monitor
        register_rest_route('gcm/v1', '/dashboard/monitor-report', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get_monitor_report_data' ],
                'permission_callback' => [ $this, 'permission_check' ],
            ]
        ]);
    }

    public function permission_check() {
        return current_user_can('manage_options');
    }

    // MODIFICAÇÃO: Nova função para a nova rota de relatórios
    public function get_monitor_report_data(WP_REST_Request $request) {
        $broken_links = get_transient(GCM_Monitor::BROKEN_LINKS_TRANSIENT) ?: [];
        $price_changes = get_transient(GCM_Monitor::PRICE_CHANGES_TRANSIENT) ?: [];

        $response_data = [
            'broken_links' => $broken_links,
            'price_changes' => $price_changes
        ];

        return new WP_REST_Response($response_data, 200);
    }

    public function get_dashboard_data(WP_REST_Request $request) {
        global $wpdb;
        $click_table = $wpdb->prefix . 'gcm_click_log';
        
        $start_param = $request->get_param('start');
        $end_param   = $request->get_param('end');
        $period      = $request->get_param('period');
        $page        = $request->get_param('page');

        $items_per_page = 10;
        $offset = ($page - 1) * $items_per_page;

        $end_date = current_time('Y-m-d 23:59:59');
        $start_date = '';

        if (!empty($start_param) && !empty($end_param)) {
            $start_date = date('Y-m-d 00:00:00', strtotime($start_param));
            $end_date = date('Y-m-d 23:59:59', strtotime($end_param));
        } else {
            switch ($period) {
                case 'today': $start_date = current_time('Y-m-d 00:00:00'); break;
                case 'year': $start_date = date('Y-01-01 00:00:00', current_time('timestamp')); break;
                case 'month-1': $start_date = date('Y-m-d 00:00:00', strtotime('-29 days', current_time('timestamp'))); break;
                case 'week-1': default: $start_date = date('Y-m-d 00:00:00', strtotime('-6 days', current_time('timestamp'))); break;
            }
        }
        
        $history_query = $wpdb->prepare("SELECT DATE(click_time) as date, COUNT(id) as clicks FROM {$click_table} WHERE click_time BETWEEN %s AND %s GROUP BY DATE(click_time) ORDER BY DATE(click_time) ASC", $start_date, $end_date);
        $history_results = $wpdb->get_results($history_query, ARRAY_A);
        $history_data = [];
        $current_date = new DateTime($start_date);
        $end_date_obj = new DateTime($end_date);
        while ($current_date <= $end_date_obj) { $date_key = $current_date->format('Y-m-d'); $history_data[$date_key] = 0; $current_date->modify('+1 day'); }
        foreach ($history_results as $row) { $history_data[$row['date']] = (int)$row['clicks']; }

        $total_clicks = (int) $wpdb->get_var("SELECT COUNT(id) FROM {$click_table}");

        $top_products_query = "SELECT p.post_title, t.product_id, COUNT(t.id) as clicks FROM {$click_table} as t JOIN {$wpdb->posts} as p ON p.ID = t.product_id GROUP BY t.product_id ORDER BY clicks DESC LIMIT 10";
        $top_products = $wpdb->get_results($top_products_query);
        foreach ($top_products as $product) { $product->thumbnail_url = get_the_post_thumbnail_url($product->product_id, 'thumbnail') ?: wc_placeholder_img_src(); }

        $total_items_query = $wpdb->prepare("SELECT COUNT(DISTINCT product_id) FROM {$click_table} WHERE click_time BETWEEN %s AND %s", $start_date, $end_date);
        $total_items = (int) $wpdb->get_var($total_items_query);
        $total_pages = ceil($total_items / $items_per_page);

        $detailed_clicks_query = $wpdb->prepare(
            "SELECT p.post_title, t.product_id, COUNT(t.id) as clicks 
             FROM {$click_table} as t JOIN {$wpdb->posts} as p ON p.ID = t.product_id 
             WHERE t.click_time BETWEEN %s AND %s 
             GROUP BY t.product_id 
             ORDER BY clicks DESC 
             LIMIT %d OFFSET %d",
            $start_date, $end_date, $items_per_page, $offset
        );
        $detailed_clicks = $wpdb->get_results($detailed_clicks_query);
        foreach ($detailed_clicks as $product) { $product->thumbnail_url = get_the_post_thumbnail_url($product->product_id, 'thumbnail') ?: wc_placeholder_img_src(); }

        $response_data = [
            'total_clicks' => $total_clicks,
            'history' => [ 'labels' => array_keys($history_data), 'data' => array_values($history_data) ],
            'top_products' => $top_products,
            'detailed_clicks' => [
                'items' => $detailed_clicks,
                'pagination' => [ 'current_page' => $page, 'total_pages' => $total_pages ]
            ]
        ];

        return new WP_REST_Response($response_data, 200);
    }
}