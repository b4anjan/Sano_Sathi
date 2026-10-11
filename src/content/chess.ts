import type { Bi } from './strings';
import type { PieceType } from '../modes/chess/pieces';

/**
 * Chess words and sentences in both languages. Piece names are the ones Nepali children
 * commonly use; change them here and the voices follow (the AI voice job remakes them).
 * Clip keys: pc-<piece> for names, ch-<line> for sentences.
 */
export const PIECE_NAMES: Record<PieceType, Bi> = {
  k: { en: 'king', ne: 'राजा' },
  q: { en: 'queen', ne: 'रानी' },
  r: { en: 'rook', ne: 'हात्ती' },
  b: { en: 'bishop', ne: 'ऊँट' },
  n: { en: 'knight', ne: 'घोडा' },
  p: { en: 'pawn', ne: 'सिपाही' },
};

/** Spoken lines (each gets a recording / AI voice). */
export const CH = {
  start: { en: "Let's play chess! The first move is yours.", ne: 'चेस खेलौँ! पहिलो चाल तिम्रो।' },
  startBlack: { en: "Let's play chess! I'll make the first move.", ne: 'चेस खेलौँ! पहिलो चाल मेरो।' },
  think: { en: 'Let me think…', ne: 'म सोच्दैछु…' },
  check: { en: 'Check!', ne: 'चेक!' },
  inCheck: { en: 'Check! Keep your king safe.', ne: 'चेक! आफ्नो राजा बचाऊ।' },
  youWin: { en: 'Checkmate! You win!', ne: 'चेकमेट! तिमीले जित्यौ!' },
  iWin: { en: 'Checkmate! Good game. Shall we play again?', ne: 'चेकमेट! राम्रो खेल। फेरि खेलौँ?' },
  draw: { en: "It's a draw. Good game!", ne: 'बराबरी भयो। राम्रो खेल!' },
  whiteWins: { en: 'Checkmate! White wins!', ne: 'चेकमेट! सेतोले जित्यो!' },
  blackWins: { en: 'Checkmate! Black wins!', ne: 'चेकमेट! कालोले जित्यो!' },
  whiteTurn: { en: "White's turn", ne: 'सेतोको पालो' },
  blackTurn: { en: "Black's turn", ne: 'कालोको पालो' },
  careful: { en: 'Careful! It can be captured there.', ne: 'होसियार! त्यहाँ यो गोटी खाइन्छ।' },
  hint: { en: 'Try this move!', ne: 'यो चाल चलेर हेर!' },
  promote: { en: 'Your pawn became a queen!', ne: 'तिम्रो सिपाही रानी बन्यो!' },
  goal: { en: 'Collect all the stars!', ne: 'सबै तारा बटुल!' },
  allStars: { en: 'You collected them all!', ne: 'सबै तारा बटुल्यौ!' },
  rocks: { en: 'Rocks block the way. Go around them.', ne: 'ढुङ्गाले बाटो छेक्छ। घुमेर जाऊ।' },
  captureSlant: { en: 'Capture the black pawns on the slant!', ne: 'कालो सिपाहीलाई छड्के खाऊ!' },
  becomeQueen: { en: 'Walk to the far end and become a queen!', ne: 'अन्तिम कोठासम्म पुगेर रानी बन!' },
  rule1: { en: 'Chess is a game for two. Take turns, one move each. White goes first.', ne: 'चेस दुई जनाको खेल हो। पालैपालो एक चाल चल। सेतोले पहिले चाल्छ।' },
  rule2: { en: 'Tap a piece. The glowing dots show where it can go. Tap a dot to move there.', ne: 'गोटी थिच। चम्किला थोप्लाले त्यो कहाँ जान सक्छ देखाउँछन्। त्यहाँ जान थोप्लो थिच।' },
  rule3: { en: "Move onto the other side's piece to capture it.", ne: 'अर्को पक्षको गोटीमाथि गएर त्यसलाई खाऊ।' },
  rule4: { en: 'Each piece moves its own way. Tap a piece to hear how, or try Learn pieces.', ne: 'हरेक गोटीको आफ्नै चाल हुन्छ। सुन्न गोटी थिच, वा गोटी सिक खेल।' },
  rule5: { en: 'Check means the king is under attack. You must keep your king safe.', ne: 'चेक भनेको राजामाथि आक्रमण हो। आफ्नो राजा बचाउनैपर्छ।' },
  rule6: { en: 'Checkmate means the king cannot escape. Whoever does that wins!', ne: 'चेकमेट भनेको राजा भाग्न सक्दैन। जसले त्यसो गर्छ, उसले जित्छ!' },
  'how-k': { en: 'The king walks one square, any way.', ne: 'राजा कुनै पनि दिशामा एक कोठा मात्र हिँड्छ।' },
  'how-q': { en: 'The queen goes any way, as far as she likes.', ne: 'रानी जुनसुकै दिशामा जति टाढा पनि जान सक्छिन्।' },
  'how-r': { en: 'The rook goes in straight lines: up, down and sideways.', ne: 'हात्ती सिधा जान्छ: माथि, तल र छेउतिर।' },
  'how-b': { en: 'The bishop goes on the slants, corner to corner.', ne: 'ऊँट छड्के जान्छ, कुनाबाट कुनातिर।' },
  'how-n': { en: 'The knight jumps like an L: two squares, then one to the side.', ne: 'घोडा L आकारमा उफ्रन्छ: दुई कोठा, अनि एक कोठा छेउतिर।' },
  'how-p': {
    en: 'The pawn steps forward. On its first move it can take two steps. It captures on the slant.',
    ne: 'सिपाही अगाडि एक कोठा हिँड्छ। पहिलो चालमा दुई कोठा जान सक्छ। छड्के खान्छ।',
  },
} satisfies Record<string, Bi>;
export type ChLine = keyof typeof CH;

/** Where each line is used, for the Voice Studio. */
export const CH_HINT: Record<ChLine, string> = {
  start: 'Chess: new game, child moves first',
  startBlack: 'Chess: new game, buddy moves first',
  think: 'Chess: while the buddy thinks',
  check: 'Chess: the buddy gives check',
  inCheck: "Chess: the child's king is in check",
  youWin: 'Chess: the child wins',
  iWin: 'Chess: the buddy wins',
  draw: 'Chess: a draw',
  whiteWins: 'Chess, two players: white wins',
  blackWins: 'Chess, two players: black wins',
  whiteTurn: "Chess, two players: white's turn",
  blackTurn: "Chess, two players: black's turn",
  careful: 'Chess: "Warn me" sees a piece left where it can be taken',
  hint: 'Chess: after "Help me"',
  promote: 'Chess: a pawn reaches the end',
  goal: 'Chess lessons: start of a stage',
  allStars: 'Chess lessons: stage finished',
  rocks: 'Chess lessons: a stage with rocks',
  captureSlant: 'Chess lessons: pawn captures',
  becomeQueen: 'Chess lessons: pawn promotion',
  rule1: 'Chess, How to play: rule 1',
  rule2: 'Chess, How to play: rule 2',
  rule3: 'Chess, How to play: rule 3',
  rule4: 'Chess, How to play: rule 4',
  rule5: 'Chess, How to play: rule 5',
  rule6: 'Chess, How to play: rule 6',
  'how-k': 'Chess lessons: the king',
  'how-q': 'Chess lessons: the queen',
  'how-r': 'Chess lessons: the rook',
  'how-b': 'Chess lessons: the bishop',
  'how-n': 'Chess lessons: the knight',
  'how-p': 'Chess lessons: the pawn',
};

/** On-screen labels (not spoken). */
export const CL = {
  playBuddy: { en: 'Play buddy', ne: 'साथीसँग' },
  howTo: { en: 'How to play', ne: 'कसरी खेल्ने' },
  hearAll: { en: 'Hear all', ne: 'सबै सुन' },
  letsPlay: { en: "Let's play!", ne: 'खेलौँ!' },
  twoPlayers: { en: 'Two players', ne: 'दुई जना' },
  learn: { en: 'Learn pieces', ne: 'गोटी सिक' },
  undo: { en: 'Take back', ne: 'फिर्ता' },
  helpMe: { en: 'Help me', ne: 'मद्दत' },
  newGame: { en: 'New game', ne: 'नयाँ खेल' },
  turnBoard: { en: 'Turn board', ne: 'बोर्ड घुमाऊ' },
  warnMe: { en: 'Warn me', ne: 'सचेत गराऊ' },
  white: { en: 'White', ne: 'सेतो' },
  black: { en: 'Black', ne: 'कालो' },
  faceEach: { en: 'Face each other', ne: 'आमनेसामने' },
  moves: { en: 'Moves', ne: 'चाल' },
  best: { en: 'Best', ne: 'उत्तम' },
  next: { en: 'Next', ne: 'अर्को' },
  allPieces: { en: 'All pieces', ne: 'सबै गोटी' },
  again: { en: 'Play again', ne: 'फेरि खेल' },
  tapAgain: { en: 'Tap the same square again to move anyway.', ne: 'जसरी पनि चाल्न त्यही कोठा फेरि थिच।' },
  youAre: { en: 'You play', ne: 'तिमी' },
  level: { en: 'Level', ne: 'तह' },
  stage: { en: 'Stage', ne: 'चरण' },
  draw: { en: 'Draw', ne: 'बराबरी' },
  stalemate: { en: 'Stalemate: no legal move, so it is a draw.', ne: 'स्टेलमेट: चाल छैन, त्यसैले बराबरी।' },
  repetition: { en: 'The same position three times: a draw.', ne: 'एउटै स्थिति तीन पटक: बराबरी।' },
  material: { en: 'Only kings and too few pieces left: a draw.', ne: 'मात् गर्न पुग्ने गोटी छैन: बराबरी।' },
  fifty: { en: '50 moves without a capture or pawn move: a draw.', ne: '५० चालसम्म न खाइयो न सिपाही चल्यो: बराबरी।' },
} satisfies Record<string, Bi>;

export const LEVEL_NAMES: Bi[] = [
  { en: 'Baby steps', ne: 'सानो पाइला' },
  { en: 'Easy', ne: 'सजिलो' },
  { en: 'Medium', ne: 'मध्यम' },
  { en: 'Hard', ne: 'गाह्रो' },
  { en: 'Champion', ne: 'च्याम्पियन' },
];
