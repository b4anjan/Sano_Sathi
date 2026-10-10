/**
 * Brand settings. Everything that names the product or its publisher reads from here,
 * so renaming the app (or switching the publisher from CastronTech to a personal name)
 * is a one-file change. The page title, home heading, parent-panel "About" line and,
 * later, the Capacitor app id all come from this object.
 */
export const BRAND = {
  appName: 'Sano Sathi',
  appNameNe: 'सानो साथी',
  publisher: 'CastronTech',
  mascot: { en: 'Habre', ne: 'हाब्रे' },
  /** Reverse-DNS id used for the iOS/Android apps later. Must stay stable once published. */
  appId: 'com.castrontech.sanosathi',
  version: '0.3.0',
  stage: 'Prototype v3',
} as const;
