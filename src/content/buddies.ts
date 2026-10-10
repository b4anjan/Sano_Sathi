import type { Bi } from './strings';

/**
 * Buddies: the guide character a child picks on the home screen.
 *
 * Each buddy has its own computer-voice style (used until a family records the lines in the
 * Voice Studio, key `m-<buddy>-<line>`), a hello, and four tap reactions plus a "tickle"
 * for fast taps. Reactions are what make the buddy feel alive: a little animation, a sound,
 * a funny line. Keep lines short and kind; children will hear them hundreds of times.
 *
 * Nepali lines use the friendly तिमी register and need a native speaker's review.
 */
export type BuddyId = 'cat' | 'puppy' | 'panda';

/** Computer-voice style. `gender` picks a voice when the device has a choice. */
export interface VoiceStyle {
  gender: 'female' | 'male';
  pitch: number;
  rate: number;
  /** Prefer a child voice when the device has one (Edge's "Ana"); then pitch is barely raised. */
  kid?: boolean;
}

export type BuddySound =
  | 'meow' | 'purr' | 'whee' | 'sneeze'
  | 'bark' | 'wag' | 'roll' | 'hiccup'
  | 'chime' | 'munch' | 'yawn' | 'tumble'
  | 'giggle';

export interface Reaction {
  /** Recording key part: m-<buddy>-<id>. */
  id: string;
  /** CSS animation name on the buddy (.react-<anim>). */
  anim: string;
  sound: BuddySound;
  /** A little word that pops up over the buddy. */
  fx: string;
  say: Bi;
}

export interface Buddy {
  id: BuddyId;
  name: Bi;
  /** Picture id in content/art.ts. */
  art: string;
  voice: VoiceStyle;
  /** Felt colour behind the buddy in pickers. */
  tint: string;
  /** How the voice is described to grown-ups. */
  voiceLabel: string;
  hello: Bi;
  reactions: Reaction[];
  tickle: Reaction;
}

export const BUDDIES: Record<BuddyId, Buddy> = {
  cat: {
    id: 'cat',
    name: { en: 'Cat', ne: 'बिरालो' },
    art: 'biralo',
    voice: { gender: 'female', pitch: 1.15, rate: 0.95 },
    tint: '#F6C9A0',
    voiceLabel: 'Cheerful female voice',
    hello: { en: "Meow! I'm Cat. Let's play!", ne: 'म्याउँ! म बिरालो। आऊ, खेलौँ!' },
    reactions: [
      { id: 'purr', anim: 'purr', sound: 'purr', fx: 'purrr…', say: { en: 'Purrr… that tickles!', ne: 'घुर्र… काउकुती लाग्यो!' } },
      { id: 'tail', anim: 'spin', sound: 'whee', fx: 'wheee!', say: { en: "Wheee! I'm chasing my tail!", ne: 'आहा! म आफ्नै पुच्छर समात्दैछु!' } },
      { id: 'stretch', anim: 'stretch', sound: 'meow', fx: 'meow!', say: { en: 'Mmm… a big cat stretch!', ne: 'आहा… लामो तन्काइ!' } },
      { id: 'sneeze', anim: 'sneeze', sound: 'sneeze', fx: 'achoo!', say: { en: 'Ah… ah… achoo! Excuse me!', ne: 'आ… आ… हाछ्युँ! माफ गर है!' } },
    ],
    tickle: { id: 'tickle', anim: 'tickle', sound: 'giggle', fx: 'hee hee!', say: { en: 'Hee hee! Stop, stop, that tickles!', ne: 'हि हि! पुग्यो पुग्यो, काउकुती लाग्यो!' } },
  },
  puppy: {
    id: 'puppy',
    name: { en: 'Puppy', ne: 'कुकुरे' },
    art: 'kukur',
    voice: { gender: 'female', pitch: 1.6, rate: 1.08, kid: true },
    tint: '#E8C9A6',
    voiceLabel: 'Little kid voice',
    hello: { en: "Woof! I'm Puppy. Let's play!", ne: 'भुक् भुक्! म कुकुरे। आऊ, खेलौँ!' },
    reactions: [
      { id: 'bark', anim: 'hop', sound: 'bark', fx: 'woof!', say: { en: 'Woof woof! Hello, friend!', ne: 'भुक् भुक्! नमस्ते साथी!' } },
      { id: 'wag', anim: 'wag', sound: 'wag', fx: 'wiggle!', say: { en: 'My tail goes wiggle wiggle!', ne: 'मेरो पुच्छर हल्लियो, हल्लियो!' } },
      { id: 'roll', anim: 'roll', sound: 'roll', fx: 'ta-da!', say: { en: 'Roll over… ta-da!', ne: 'घुम्छु… ता-दा!' } },
      { id: 'hiccup', anim: 'hiccup', sound: 'hiccup', fx: 'hic!', say: { en: 'Hic! Hic! Oops, hiccups!', ne: 'हिक्! हिक्! ओहो, बाडुली लाग्यो!' } },
    ],
    tickle: { id: 'tickle', anim: 'tickle', sound: 'giggle', fx: 'ha ha!', say: { en: 'Ha ha ha! My tummy! You found my tickle spot!', ne: 'हा हा हा! मेरो भुँडी! काउकुती लाग्यो!' } },
  },
  panda: {
    id: 'panda',
    name: { en: 'Panda', ne: 'हाब्रे' },
    art: 'habre',
    voice: { gender: 'male', pitch: 0.9, rate: 0.85 },
    tint: '#E9B9A2',
    voiceLabel: 'Soft, welcoming male voice',
    hello: { en: "Namaste! I'm Panda. Let's play together.", ne: 'नमस्ते! म हाब्रे। आऊ, सँगै खेलौँ।' },
    reactions: [
      { id: 'wave', anim: 'wave', sound: 'chime', fx: 'namaste!', say: { en: 'Namaste! I am so happy to see you.', ne: 'नमस्ते! तिमीलाई देखेर धेरै खुसी लाग्यो।' } },
      { id: 'munch', anim: 'munch', sound: 'munch', fx: 'munch!', say: { en: 'Munch, munch… yummy bamboo!', ne: 'चपाउँदै… मीठो बाँस!' } },
      { id: 'yawn', anim: 'yawn', sound: 'yawn', fx: 'zzz…', say: { en: "Yaaawn… a tiny nap… I'm awake!", ne: 'हाइ… अलिकति निदाउँ… उठेँ!' } },
      { id: 'tumble', anim: 'flip', sound: 'tumble', fx: 'wheee!', say: { en: 'Watch me tumble! Wheee!', ne: 'हेर, म गुल्टिन्छु! आहा!' } },
    ],
    tickle: { id: 'tickle', anim: 'tickle', sound: 'giggle', fx: 'ho ho!', say: { en: "Ho ho ho! You're a very good tickler!", ne: 'हो हो हो! तिमीले त खुब काउकुती लगायौ!' } },
  },
};

export const BUDDY_IDS = Object.keys(BUDDIES) as BuddyId[];

/** Greetings for the time of day, said before the buddy's hello. Clip key: `_<key>`. */
export const GREETINGS = {
  morning: { en: 'Good morning!', ne: 'शुभ प्रभात!' },
  afternoon: { en: 'Good afternoon!', ne: 'शुभ दिन!' },
  evening: { en: 'Good evening!', ne: 'शुभ साँझ!' },
  late: { en: "It's getting late. Sleep time soon!", ne: 'राति भयो। चाँडै सुत्ने बेला भयो!' },
} satisfies Record<string, Bi>;

export function greetingKey(hour: number): keyof typeof GREETINGS {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'late';
}
