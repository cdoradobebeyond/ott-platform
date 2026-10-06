import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { copyFileSync } from 'node:fs';
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
export default defineConfig({root,base:'./',plugins:[react(),{name:'webos-manifest',closeBundle(){copyFileSync(resolve(here,'appinfo.json'),resolve(here,'dist/appinfo.json'));}}],build:{outDir:resolve(here,'dist'),emptyOutDir:true,rollupOptions:{input:resolve(here,'index.html')}}});
