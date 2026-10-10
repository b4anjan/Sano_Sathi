import { signal } from '@preact/signals';

/** 'studio' is the grown-ups' Voice Studio; children cannot reach it. */
export type Screen = 'home' | 'match' | 'count' | 'xylo' | 'smash' | 'memory' | 'studio';
export const screen = signal<Screen>('home');
export const panelOpen = signal(false);
