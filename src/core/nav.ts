import { signal } from '@preact/signals';

export type Screen = 'home' | 'match' | 'count' | 'xylo' | 'smash' | 'memory';
export const screen = signal<Screen>('home');
export const panelOpen = signal(false);
