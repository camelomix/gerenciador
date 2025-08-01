<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class GCM_API {

    public function __construct() {
        add_action('rest_api_init', [ $this, 'register_routes' ]);
    }

    public function register_routes() {
        $api_path = GCM_PLUGIN_PATH;

        require_once $api_path . 'class-gcm-api-products-controller.php';
        require_once $api_path . 'class-gcm-api-settings-controller.php';
        require_once $api_path . 'class-gcm-api-dashboard-controller.php';
        require_once $api_path . 'class-gcm-api-tools-controller.php';
        require_once $api_path . 'class-gcm-api-stores-controller.php';
        require_once $api_path . 'class-gcm-api-sharing-controller.php'; // NOVO CONTROLLER

        $products_controller = new GCM_API_Products_Controller();
        $products_controller->register_routes();

        $settings_controller = new GCM_API_Settings_Controller();
        $settings_controller->register_routes();
        
        $dashboard_controller = new GCM_API_Dashboard_Controller();
        $dashboard_controller->register_routes();
        
        $tools_controller = new GCM_API_Tools_Controller();
        $tools_controller->register_routes();
        
        $stores_controller = new GCM_API_Stores_Controller();
        $stores_controller->register_routes();

        $sharing_controller = new GCM_API_Sharing_Controller(); // NOVO REGISTRO
        $sharing_controller->register_routes();
    }
}