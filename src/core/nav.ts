import { signal } from '@preact/signals';
import type { ActivityId } from '../content/activities';

/** 'studio' (Voice Studio) is for grown-ups; 'stickers' is the child's sticker book. */
export type Screen = 'home' | ActivityId | 'studio' | 'stickers';
export const screen = signal<Screen>('home');
export const panelOpen = signal(false);
