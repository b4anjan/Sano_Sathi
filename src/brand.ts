/**
 * Brand settings. Everything that names the product or its publisher reads from here,
 * so renaming the app (or switching the publisher from CastronTech to a personal name)
 * is a one-file change. The page title, home heading, parent-panel "About" line and,
 * later, the Capacitor app id all come from this object.
 */
export const BRAND = {
  appName: 'Sano Sathi',
  appNameNe: 'सानो साथी',
  publisher: 'Mohan Karki', /**'CastronTech', */
  mascot: { en: 'Cat', ne: 'बिरालो' },
  /** Reverse-DNS id used for the iOS/Android apps later. Must stay stable once published. */
  appId: 'com.castrontech.sanosathi',
  /** The public web address (used in help text, e.g. "open the app on its own to record"). */
  siteUrl: 'https://b4anjan.github.io/Sano_Sathi/',
  version: '0.4.0',
  stage: 'Prototype v4',
} as const;
