// Bridge: re-export shared/fsrs.js globals as ES module imports.
// shared/fsrs.js loads as a plain <script> tag (shared with Geriatrics repo).
const w = window;
export const FSRS_W = w.FSRS_W;
export const FSRS_DECAY = w.FSRS_DECAY;
export const FSRS_FACTOR = w.FSRS_FACTOR;
export const FSRS_RETENTION = w.FSRS_RETENTION;
export const fsrsR = w.fsrsR;
export const fsrsInterval = w.fsrsInterval;
export const fsrsInitNew = w.fsrsInitNew;
export const fsrsUpdate = w.fsrsUpdate;
export const fsrsMigrateFromSM2 = w.fsrsMigrateFromSM2;
export const isChronicFail = w.isChronicFail;
