import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eicnam.edt',
  appName: 'EDT EICNAM',
  webDir: 'out',
  version: '1.0.0', // Version de l'application
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0, // Géré manuellement
      launchAutoHide: false, // Cache manuellement après le chargement
      backgroundColor: "#1a202c",
      showSpinner: true,
      androidSpinnerStyle: "large",
      spinnerColor: "#4299e1",
      androidScaleType: "CENTER_CROP"
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#1a202c"
    }
  }
};

export default config;
