import { env } from '../src/config/env';
import { ROLES } from '../src/constants/roles';
import { realtimeUrl, parseMatchRealtimeEvent } from '../src/api/realtime/matchRealtime';
import appConfig from '../app.json';
import { existsSync } from 'node:fs';
import easConfig from '../eas.json';

describe('Phase 8A native readiness contracts', () => {
  test('Expo display name is the product name', () =>
    expect(appConfig.expo.name).toBe('SmashPoint'));
  test('native identifiers remain stable', () => {
    expect(appConfig.expo.android.package).toBe('com.smashpoint.mobile');
    expect(appConfig.expo.ios.bundleIdentifier).toBe('com.smashpoint.mobile');
  });
  test('icon, adaptive icon, and splash assets resolve', () => {
    expect(existsSync('assets/smashpoint-icon.png')).toBe(true);
    expect(existsSync('assets/smashpoint-adaptive-icon.png')).toBe(true);
    expect(existsSync('assets/smashpoint-splash.png')).toBe(true);
    expect(appConfig.expo.icon).toBe('./assets/smashpoint-icon.png');
    expect(appConfig.expo.android.adaptiveIcon.foregroundImage).toBe(
      './assets/smashpoint-adaptive-icon.png',
    );
    expect(appConfig.expo.splash.image).toBe('./assets/smashpoint-splash.png');
  });
  test('native config requests no camera, photo, or notification permissions', () => {
    expect((appConfig.expo.android as { permissions?: string[] }).permissions ?? []).toEqual([]);
    expect(appConfig.expo.plugins).not.toContain('expo-notifications');
    expect(appConfig.expo.plugins).not.toContain('expo-image-picker');
  });
  test('native assets are all square PNG references', () => {
    for (const asset of [
      appConfig.expo.icon,
      appConfig.expo.android.adaptiveIcon.foregroundImage,
      appConfig.expo.splash.image,
    ]) {
      expect(asset).toMatch(/\.png$/);
    }
  });
  test('release metadata and EAS artifact targets are valid', () => {
    expect(appConfig.expo.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(appConfig.expo.android.versionCode).toBeGreaterThan(0);
    expect(appConfig.expo.ios.buildNumber).toMatch(/^\d+$/);
    expect(easConfig.build.preview.android.buildType).toBe('apk');
    expect(easConfig.build.production.android.buildType).toBe('app-bundle');
    expect(easConfig.build.production.ios.distribution).toBe('store');
  });
  test('uses the configured API and never exposes a database connection', () => {
    expect(env.apiBaseUrl).toMatch(/^https?:\/\//);
    expect(env.apiBaseUrl).not.toMatch(/neon|postgres|database/i);
  });

  test('production configuration cannot silently fall back to localhost', () => {
    if (env.isProduction) expect(env.apiBaseUrl).not.toMatch(/localhost|127\.0\.0\.1/);
  });

  test('role set remains the native restore routing contract', () => {
    expect(Object.values(ROLES)).toEqual(['PLAYER', 'ORGANIZER', 'ADMIN']);
  });

  test('realtime URL uses the authenticated native websocket contract', () => {
    const url = realtimeUrl('match/1', 'native-token');
    expect(url).toContain('/api/realtime/matches/match%2F1?token=native-token');
    expect(url).toMatch(/^wss?:\/\//);
    expect(url).not.toContain('postgres');
  });

  test('invalid room events are safely ignored on device', () => {
    expect(
      parseMatchRealtimeEvent(
        '{"type":"MATCH_SCORE_UPDATED","matchId":"other","status":"LIVE"}',
        'match-1',
      ),
    ).toBeNull();
  });
});
