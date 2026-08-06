import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import basicSsl from '@vitejs/plugin-basic-ssl';
import autoprefixer from 'autoprefixer';
import {resolve} from 'path';
import {existsSync, copyFileSync, readFileSync} from 'fs';
import {ServerOptions} from 'vite';
import {watchLangFile} from './watch-lang.js';
import devChecks from './scripts/dev-checks.mjs';
import path from 'path';

const rootDir = resolve(__dirname);
const certsDir = path.join(rootDir, 'certs');
const ENV_LOCAL_FILE_PATH = path.join(rootDir, '.env.local');
const LANG_PACK_LOCAL_FILE_PATH = path.join(rootDir, 'src', 'langPackLocalVersion.ts');

const isDEV = process.env.NODE_ENV === 'development';
if(!existsSync(LANG_PACK_LOCAL_FILE_PATH)) {
  copyFileSync(path.join(rootDir, 'src', 'langPackLocalVersion.example.ts'), LANG_PACK_LOCAL_FILE_PATH);
}

if(isDEV) {
  if(!existsSync(ENV_LOCAL_FILE_PATH)) {
    copyFileSync(path.join(rootDir, '.env.local.example'), ENV_LOCAL_FILE_PATH);
  }

  watchLangFile();
}

const USE_SSL = false;
const USE_SIGNED_CERTS = USE_SSL && true;
const USE_SELF_SIGNED_CERTS = USE_SSL && false;

const host = USE_SSL ? 'web.telegram.org' : 'localhost';
const DEV_HTTP2_KEY = path.join(certsDir, 'localhost-key.pem');
const DEV_HTTP2_CERT = path.join(certsDir, 'localhost.pem');
const USE_DEV_HTTP2 = !USE_SSL && !process.env.TWEB_PREVIEW && !process.env.VITEST &&
  existsSync(DEV_HTTP2_KEY) && existsSync(DEV_HTTP2_CERT);

const serverOptions: ServerOptions = {
  host,
  port: USE_SSL ? 443 : 8080,
  watch: {
    ignored: [resolve(rootDir, '.claude') + '/**']
  },
  sourcemapIgnoreList(sourcePath, sourcemapPath) {
    return sourcePath.includes('node_modules') ||
      sourcePath.includes('logger') ||
      sourcePath.includes('eventListenerBase');
  },
  https: USE_SIGNED_CERTS ? {
    key: path.join(certsDir, host + '-key.pem'),
    cert: path.join(certsDir, host + '.pem')
  } : USE_DEV_HTTP2 ? {
    key: readFileSync(DEV_HTTP2_KEY),
    cert: readFileSync(DEV_HTTP2_CERT)
  } : undefined
};

const SOLID_SRC_PATH = 'src/solid/packages/solid';
const SOLID_BUILT_PATH = 'src/vendor/solid';
const USE_SOLID_SRC = false;
const SOLID_PATH = USE_SOLID_SRC ? SOLID_SRC_PATH : SOLID_BUILT_PATH;
const USE_OWN_SOLID = existsSync(resolve(rootDir, SOLID_PATH));

const NO_MINIFY = false;
const BASIC_SSL_CONFIG: Parameters<typeof basicSsl>[0] = USE_SELF_SIGNED_CERTS ? {
  name: host,
  certDir: certsDir
} : undefined;

const ADDITIONAL_ALIASES = {
  'solid-transition-group': resolve(rootDir, 'src/vendor/solid-transition-group'),
  '@components': resolve(rootDir, 'src/components'),
  '@helpers': resolve(rootDir, 'src/helpers'),
  '@hooks': resolve(rootDir, 'src/hooks'),
  '@stores': resolve(rootDir, 'src/stores'),
  '@lib': resolve(rootDir, 'src/lib'),
  '@appManagers': resolve(rootDir, 'src/lib/appManagers'),
  '@richTextProcessor': resolve(rootDir, 'src/lib/richTextProcessor'),
  '@environment': resolve(rootDir, 'src/environment'),
  '@customEmoji': resolve(rootDir, 'src/lib/customEmoji'),
  '@config': resolve(rootDir, 'src/config'),
  '@vendor': resolve(rootDir, 'src/vendor'),
  '@layer': resolve(rootDir, 'src/layer'),
  '@types': resolve(rootDir, 'src/types'),
  '@': resolve(rootDir, 'src')
};

if(USE_OWN_SOLID) {
  console.log('using own solid', SOLID_PATH, 'built', !USE_SOLID_SRC);
} else {
  console.log('using original solid');
}

export default defineConfig({
  base: '/-sanaks-client/',
  plugins: [
    process.env.VITEST || process.env.TWEB_PREVIEW ? undefined : devChecks(rootDir),
    solidPlugin(),
    USE_SELF_SIGNED_CERTS ? basicSsl(BASIC_SSL_CONFIG) : undefined,
    process.env.ANALYZE ? import('rollup-plugin-visualizer').then(({visualizer}) => visualizer({
      gzipSize: true,
      template: 'treemap'
    })) : undefined
  ].filter(Boolean),
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.claude/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/solid/**',
      '**/e2e/**'
    ],
    environment: 'jsdom',
    pool: 'forks',
    globals: true,
    setupFiles: ['./src/tests/setup.ts']
  },
  server: serverOptions,
  optimizeDeps: {
    entries: ['index.html']
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser'
  },
  css: {
    devSourcemap: true,
    postcss: {
      plugins: [
        autoprefixer({})
      ]
    }
  },
  resolve: {
    alias: USE_OWN_SOLID ? {
      'rxcore': resolve(rootDir, SOLID_PATH, 'web/core'),
      'solid-js/jsx-runtime': resolve(rootDir, SOLID_PATH, 'dist', isDEV ? 'dev.js' : 'solid.js'),
      'solid-js/html': resolve(rootDir, SOLID_PATH, 'html/dist/html.js'),
      'solid-js/h': resolve(rootDir, SOLID_PATH, 'h/dist/h.js'),
      'solid-js/web': resolve(rootDir, SOLID_PATH, 'web/dist', isDEV ? 'dev.js' : 'web.js'),
      'solid-js/store': resolve(rootDir, SOLID_PATH, 'store/dist', isDEV ? 'dev.js' : 'store.js'),
      'solid-js': resolve(rootDir, SOLID_PATH, 'dist', isDEV ? 'dev.js' : 'solid.js'),
      ...ADDITIONAL_ALIASES
    } : ADDITIONAL_ALIASES
  }
});
