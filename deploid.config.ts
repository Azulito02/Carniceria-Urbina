import type { DeploidConfig } from '@deploid/cli';

const config: DeploidConfig = {
  appName: 'Carniceria urbina',
  appId: 'carniceria-urbina.netlify.app',
  web: {
    framework: 'vite',
    buildCommand: 'npm run build',
    webDir: 'dist',
  },
  android: {
    packaging: 'capacitor',
    targetSdk: 34,
    minSdk: 24,
    permissions: ['INTERNET'],
    version: { code: 1, name: '1.0.0' },
    display: {
      fullscreen: false,
      orientation: 'portrait',
      statusBarStyle: 'auto',
      windowSoftInputMode: 'adjustResize',
    },
  },
  // firebase: { projectId: 'your-project-id', enabled: true },  // run: deploid firebase
  assets: {
    source: 'icono-512.png',
    output: 'assets-gen/',
  },
};

export default config;
