import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.goavoice.app',
  appName: 'Goa Voice',
  webDir: 'www',
  server: {
    url: 'https://voice-rag-rho.vercel.app',
    cleartext: false
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
