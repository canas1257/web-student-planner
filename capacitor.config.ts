import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'id.web.belajarteratur',
  appName: 'RuangBelajar',
  webDir: 'dist',
  backgroundColor: '#5b4ee8',
  android: {
    backgroundColor: '#5b4ee8',
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 1400,
      launchAutoHide: true,
      backgroundColor: '#5b4ee8',
      showSpinner: false,
    },
  },
}

export default config
