import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        admin_api-settings: resolve(__dirname, 'admin/api-settings.html'),
        admin_categories: resolve(__dirname, 'admin/categories.html'),
        admin_dashboard: resolve(__dirname, 'admin/dashboard.html'),
        admin_insert-samples: resolve(__dirname, 'admin/insert-samples.html'),
        admin_insert-shopee-it: resolve(__dirname, 'admin/insert-shopee-it.html'),
        admin_material-form: resolve(__dirname, 'admin/material-form.html'),
        admin_materials: resolve(__dirname, 'admin/materials.html'),
        admin_price-history: resolve(__dirname, 'admin/price-history.html'),
        admin_project-detail: resolve(__dirname, 'admin/project-detail.html'),
        admin_purchase-requests: resolve(__dirname, 'admin/purchase-requests.html'),
        admin_suppliers: resolve(__dirname, 'admin/suppliers.html'),
        admin_users: resolve(__dirname, 'admin/users.html'),
        categories: resolve(__dirname, 'categories.html'),
        estimates: resolve(__dirname, 'estimates.html'),
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        material-detail: resolve(__dirname, 'material-detail.html'),
        materials: resolve(__dirname, 'materials.html'),
        my-workspace: resolve(__dirname, 'my-workspace.html'),
        price-comparison: resolve(__dirname, 'price-comparison.html'),
        projects: resolve(__dirname, 'projects.html'),
        request-form: resolve(__dirname, 'request-form.html'),
        suppliers: resolve(__dirname, 'suppliers.html')
      }
    }
  }
});
