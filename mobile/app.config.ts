// Expo reads app.json first and passes it here. The only dynamic setting: the web demo on GitHub
// Pages lives at /mantide/, so `npm run export:web` sets EXPO_BASE_URL; development stays at /.
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL ?? '' },
});
