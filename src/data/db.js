// The only file that talks to IndexedDB (the database inside the browser).
// Database "dsa-streak" has two stores:
//   solves   -> one record per solved problem: { problemId, day, at }
//   settings -> one record: { key: 'main', goalHistory, theme, currentTopic, currentProblemId, skippedIds, lastBackupAt }
// Titles of problems are never stored here; they live in the code.

const DB_NAME = 'dsa-streak';
const SOLVES = 'solves';
const SETTINGS = 'settings';
const SETTINGS_KEY = 'main';

// Migrations: a list of steps, one per database version.
// RULE: only ever ADD a new step at the end. Never edit an old one.
// The database version is simply the number of steps in this list.
const MIGRATIONS = [
  // Version 1: create the two stores.
  (db) => {
    db.createObjectStore(SOLVES, { keyPath: 'problemId' });
    db.createObjectStore(SETTINGS, { keyPath: 'key' });
  },
];

// Settings for a brand new user.
export function defaultSettings() {
  return {
    goalHistory: [{ from: '0000-01-01', goal: 1 }],
    theme: 'system',
    currentTopic: null,
    currentProblemId: null, // where "Next up" starts looking (set by Continue here and Skip)
    skippedIds: [],         // problems the user skipped; they stay skipped until the user goes back to them
    lastBackupAt: null,
    soundOn: true,
  };
}

// --- small helpers that turn IndexedDB events into promises ---

// Wait for one request (get, put, getAll...) to finish.
function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Wait for a whole transaction to finish (all or nothing).
function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction was cancelled'));
  });
}

// --- opening the database ---

let dbPromise = null;

// Opens the database (once) and runs any migrations that are missing.
export function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, MIGRATIONS.length);
    req.onupgradeneeded = (event) => {
      // Run every step the user's database has not seen yet.
      for (let v = event.oldVersion; v < MIGRATIONS.length; v++) {
        MIGRATIONS[v](req.result, req.transaction);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // If another tab upgrades the database, let go so it is not blocked.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

// --- reading ---

// Returns { solves: [{ problemId, day, at }], settings }.
// On the very first run it also saves the default settings.
export async function loadAll() {
  const db = await openDb();
  const tx = db.transaction([SOLVES, SETTINGS], 'readwrite');
  const solves = await request(tx.objectStore(SOLVES).getAll());
  let record = await request(tx.objectStore(SETTINGS).get(SETTINGS_KEY));
  if (!record) {
    record = { key: SETTINGS_KEY, ...defaultSettings() };
    tx.objectStore(SETTINGS).put(record);
  }
  await transactionDone(tx);
  const { key, ...saved } = record;
  // Fill in anything missing with defaults, so older data keeps working.
  return { solves, settings: { ...defaultSettings(), ...saved } };
}

// --- writing ---

// Saves one solve event. Only the three known fields are stored.
export async function putSolve(solve) {
  const db = await openDb();
  const tx = db.transaction(SOLVES, 'readwrite');
  tx.objectStore(SOLVES).put({ problemId: solve.problemId, day: solve.day, at: solve.at });
  await transactionDone(tx);
}

// Removes the solve event for one problem (undo).
export async function deleteSolve(problemId) {
  const db = await openDb();
  const tx = db.transaction(SOLVES, 'readwrite');
  tx.objectStore(SOLVES).delete(problemId);
  await transactionDone(tx);
}

// Saves the settings record.
export async function saveSettings(settings) {
  const db = await openDb();
  const tx = db.transaction(SETTINGS, 'readwrite');
  tx.objectStore(SETTINGS).put({ ...settings, key: SETTINGS_KEY });
  await transactionDone(tx);
}

// Replaces ALL data in ONE transaction: all of it is saved, or none of it
// (if anything goes wrong, the old data stays exactly as it was).
export async function replaceAll({ solves, settings }) {
  const db = await openDb();
  const tx = db.transaction([SOLVES, SETTINGS], 'readwrite');
  const finished = transactionDone(tx);
  try {
    const solvesStore = tx.objectStore(SOLVES);
    const settingsStore = tx.objectStore(SETTINGS);
    solvesStore.clear();
    settingsStore.clear();
    for (const solve of solves) {
      solvesStore.put({ problemId: solve.problemId, day: solve.day, at: solve.at });
    }
    settingsStore.put({ ...settings, key: SETTINGS_KEY });
  } catch (error) {
    // A bad record throws here. Cancel everything so nothing changes.
    try { tx.abort(); } catch { /* already finished */ }
    await finished.catch(() => {});
    throw error;
  }
  await finished;
}

// Asks the browser not to clear our data when the phone is low on space.
// Failure is fine and ignored. Returns true or false.
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist();
    }
  } catch {
    // ignore
  }
  return false;
}

// DANGER: deletes the whole database. Used only by tools/db-check.html.
export async function deleteDatabase() {
  if (dbPromise) {
    try { (await dbPromise).close(); } catch { /* ignore */ }
    dbPromise = null;
  }
  await new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => {}; // waits until other connections close
  });
}
