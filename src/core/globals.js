// Shared mutable app state — all modules import this object.
// Properties can be freely read/written from any module.
// Constants and functions are imported directly between modules instead.

const G = {
  // === Persistence (state.js) ===
  S: null,          // main state object
  save: null,       // save function (overwritten by IDB migration)
  _saveTimer: null,
  idb: null,

  // === Data arrays (data-loader.js) ===
  QZ: [], TK: [], NOTES: [], DRUGS: [], FLASH: [], TABS: [], DIS: {},
  _dataReady: false,
  _dataPromise: null,

  // === Quiz engine (engine.js) ===
  qi: 0, sel: null, ans: false, pool: [], filt: 'all', topicFilt: -1, years: [],
  examMode: false, examTimer: null, examSec: 0,
  onCallMode: false, flipRevealed: false,
  timedMode: false, timedSec: 90, timedInt: null, timedPaused: false,
  _optShuffle: null,
  _sessionOk: 0, _sessionNo: 0, _sessionBest: {}, _sessionWorse: {},
  _sessionStart: Date.now(), _sessionSaved: false,
  _mockAnswered: 0,
  qStartTime: Date.now(),
  _confidence: null, _wrongReason: null, _diffRating: null,
  miniExamTopic: -1, miniExamResults: null,
  mockExamResults: null,

  // === Quiz modes (modes.js) ===
  sdMode: false, sdStreak: 0, sdPool: [], sdQi: 0,
  sdLeaderboard: [],
  blindRecall: false,
  // autopsyMode is always on — distractor autopsy renders whenever G.ans && !G.examMode.
  // autopsyIdx / autopsyDistractor retained for backwards-compat with legacy highlight CSS.
  autopsyMode: true, autopsyIdx: -1, autopsyDistractor: -1,
  isSpeaking: false,
  voiceListening: false, voiceTranscript: '',
  pomoActive: false, pomoSec: 3000, pomoBreak: false, pomoBreakSec: 300, pomoInterval: null,
  wakeLock: null,

  // === AI (explain.js) ===
  _exCache: {},
  _exLoading: false, _exIdx: -1,
  teachBackState: null,

  // === AI client (client.js) ===
  _aiAbortController: null,

  // === UI state (app.js + views) ===
  tab: 'quiz', learnSub: 'study', moreSub: 'calc', libSec: 'harrison',
  harChOpen: null, _harData: null, _harLoading: false,
  openNote: null,
  calcVals: {},
  srchQ: '',
  chatLoading: false,
  lastTab: null,

  // === Functions set at runtime ===
  render: null,
  renderTabs: null,
};

export default G;
