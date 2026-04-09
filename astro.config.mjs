import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Dev-only Vite plugin: POST /_palette/save writes hex token values into global.css */
function paletteSavePlugin() {
  return {
    name: 'palette-save',
    configureServer(server) {
      server.middlewares.use('/_palette/save', (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405).end();
          return;
        }
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const tokens = JSON.parse(body);
            const cssPath = path.resolve(__dirname, 'src/styles/global.css');
            let css = fs.readFileSync(cssPath, 'utf-8');
            for (const [name, value] of Object.entries(tokens)) {
              // Replace only lines matching:  --color-xxx:   #XXXXXX
              css = css.replace(
                new RegExp(`(${name}:\\s*)#[0-9a-fA-F]{6}`, 'g'),
                `$1${value.toUpperCase()}`
              );
            }
            fs.writeFileSync(cssPath, css, 'utf-8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: String(err) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  site: 'https://deepkind.org',
  vite: {
    plugins: [tailwindcss(), paletteSavePlugin()],
    resolve: {
      alias: {
        '@components': path.resolve(__dirname, 'src/components'),
        '@layouts':    path.resolve(__dirname, 'src/components/layout'),
        '@ui':         path.resolve(__dirname, 'src/components/ui'),
        '@sections':   path.resolve(__dirname, 'src/components/sections'),
        '@assets':     path.resolve(__dirname, 'src/assets'),
        '@data':       path.resolve(__dirname, 'src/data'),
        '@styles':     path.resolve(__dirname, 'src/styles'),
        '@scripts':    path.resolve(__dirname, 'src/scripts'),
        '@dev':        path.resolve(__dirname, 'src/components/dev'),
      },
    },
  },
});
