import { defineConfig } from 'vite';
import { resolve } from 'path';
const pages = ['index', 'dashboard', 'login', 'admin', 'today', 'plan', 'route', 'customers', 'ledger', 'settings'];
export default defineConfig({ build: { rollupOptions: { input: Object.fromEntries(pages.map(p => [p, resolve(__dirname, p + '.html')])) } } });
