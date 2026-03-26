const fs = require('fs');
const path = require('path');

const viteConfigPath = 'vite.config.ts';
let viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');
if (!viteConfig.includes('proxy:')) {
  viteConfig = viteConfig.replace(
    'plugins: [react(), tailwindcss()],',
    \`plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },\`
  );
  fs.writeFileSync(viteConfigPath, viteConfig);
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src');
for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let modified = false;

  if (content.includes('\${import.meta.env.VITE_API_URL}/api')) {
    content = content.replace(/\$\{import\.meta\.env\.VITE_API_URL\}\/api/g, '/api');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(file, content);
  }
}
console.log('API URLs replaced and Vite proxy configured.');
