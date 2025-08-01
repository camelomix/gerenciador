<?php
/**
 * Plugin Name:       Gerenciador de Produtos Camelomix (Core)
 * Plugin URI:        https://camelomix.com.br
 * Description:       Ferramenta para extrair, otimizar e gerenciar produtos de afiliados diretamente no WordPress.
 * Version:           20.0.1
 * Author:            Camelomix
 * Author URI:        https://camelomix.com.br
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'GCM_VERSION', '20.0.1' );
define( 'GCM_PLUGIN_PATH', plugin_dir_path( __FILE__ ) );
define( 'GCM_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once GCM_PLUGIN_PATH . 'class-gcm-cpt.php';
require_once GCM_PLUGIN_PATH . 'class-gcm-tracking.php';
require_once GCM_PLUGIN_PATH . 'class-gcm-admin.php';
require_once GCM_PLUGIN_PATH . 'class-gcm-api.php';
require_once GCM_PLUGIN_PATH . 'class-gcm-monitor.php';
require_once GCM_PLUGIN_PATH . 'class-gcm-sharing.php';


function gcm_run_plugin() {
    new GCM_CPT();
    new GCM_Tracking();
    new GCM_Admin();
    new GCM_API();
    new GCM_Monitor();
    new GCM_Sharing();
}
add_action( 'plugins_loaded', 'gcm_run_plugin' );

function gcm_check_version() {
    $stored_version = get_option('gcm_plugin_version', '1.0.0');
    if (version_compare($stored_version, GCM_VERSION, '<')) {
        flush_rewrite_rules();
        update_option('gcm_plugin_version', GCM_VERSION);
    }
}
add_action('admin_init', 'gcm_check_version');

function gcm_create_click_log_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'gcm_click_log';
    $charset_collate = $wpdb->get_charset_collate();
    $sql = "CREATE TABLE $table_name (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        product_id bigint(20) UNSIGNED NOT NULL,
        click_time datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
        PRIMARY KEY  (id),
        KEY product_id (product_id)
    ) $charset_collate;";
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
}

register_activation_hook( __FILE__, 'gcm_activate_plugin' );
function gcm_activate_plugin() {
    GCM_CPT::setup_post_type();
    gcm_create_click_log_table();
    GCM_Monitor::schedule_cron();
    flush_rewrite_rules();

    if (!get_option('gcm_plugin_version')) {
        update_option('gcm_plugin_version', GCM_VERSION);
    }
}

register_deactivation_hook( __FILE__, 'gcm_deactivate_plugin' );
function gcm_deactivate_plugin() {
    GCM_Monitor::unschedule_cron();
    flush_rewrite_rules();
}