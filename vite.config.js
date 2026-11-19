import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { pwaBuild } from './scripts/pwa-build.js';
export default defineConfig({base:'./',plugins:[viteSingleFile(),pwaBuild()],build:{target:'es2020'}});
