const fs = require('fs');
const path = require('path');

const viteConfigPath = 'vite.config.ts';
let viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');
if (!viteConfig.includes('proxy:')) {
  viteConfig = viteConfig.replace('plugins: [react(), tailwindcss()],', "plugins: [react(), tailwindcss()],\n  server: {\n    proxy: {\n      '/api': {\n        target: 'http://localhost:5000',\n        changeOrigin: true\n      }\n    }\n  },");
  fs.writeFileSync(viteConfigPath, viteConfig);
}

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes('${import.meta.env.VITE_API_URL}/api')) {
        content = content.replace(/\$\{import\.meta\.env\.VITE_API_URL\}\/api/g, '/api');
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}
processDir('src');
console.log('URLs updated!');
