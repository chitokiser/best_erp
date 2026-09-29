const { resolve } = require('path');
const { defineConfig } = require('vite');

module.exports = defineConfig({
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      input: {
        "admin_ceo-dashboard": resolve(__dirname, 'admin/ceo-dashboard.html'),
        "admin_clients": resolve(__dirname, 'admin/clients.html'),
        "admin_contacts": resolve(__dirname, 'admin/contacts.html'),
        "admin_dashboard": resolve(__dirname, 'admin/dashboard.html'),
        "admin_employees": resolve(__dirname, 'admin/employees.html'),
        "admin_finance": resolve(__dirname, 'admin/finance.html'),
        "admin_insert-samples": resolve(__dirname, 'admin/insert-samples.html'),
        "admin_insert-shopee-it": resolve(__dirname, 'admin/insert-shopee-it.html'),
        "admin_material-form": resolve(__dirname, 'admin/material-form.html'),
        "admin_materials": resolve(__dirname, 'admin/materials.html'),
        "admin_project-detail": resolve(__dirname, 'admin/project-detail.html'),
        "admin_projects": resolve(__dirname, 'admin/projects.html'),
        "admin_purchase-requests": resolve(__dirname, 'admin/purchase-requests.html'),
        "admin_sites": resolve(__dirname, 'admin/sites.html'),
        "admin_suppliers": resolve(__dirname, 'admin/suppliers.html'),
        "admin_users": resolve(__dirname, 'admin/users.html'),
        "categories": resolve(__dirname, 'categories.html'),
        "estimates": resolve(__dirname, 'estimates.html'),
        "login": resolve(__dirname, 'login.html'),
        "main": resolve(__dirname, 'index.html'),
        "material-detail": resolve(__dirname, 'material-detail.html'),
        "materials": resolve(__dirname, 'materials.html'),
        "mobile-task": resolve(__dirname, 'mobile-task.html'),
        "my-workspace": resolve(__dirname, 'my-workspace.html'),
        "price-comparison": resolve(__dirname, 'price-comparison.html'),
        "projects": resolve(__dirname, 'projects.html'),
        "request-form": resolve(__dirname, 'request-form.html'),
        "suppliers": resolve(__dirname, 'suppliers.html')
      }
    }
  }
});
