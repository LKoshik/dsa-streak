import { defaultSettings } from '../../src/data/db.js';

// A fake storage with the same functions as db.js. `failWrites` makes writes fail.
export function fakeStorage() {
  const fake = {
    solves: [],
    settings: defaultSettings(),
    failWrites: false,
    openDb: async () => {},
    loadAll: async () => ({ solves: structuredClone(fake.solves), settings: structuredClone(fake.settings) }),
    putSolve: async (s) => {
      if (fake.failWrites) throw new Error('disk full');
      fake.solves = fake.solves.filter((x) => x.problemId !== s.problemId);
      fake.solves.push({ ...s });
    },
    deleteSolve: async (id) => {
      if (fake.failWrites) throw new Error('disk full');
      fake.solves = fake.solves.filter((x) => x.problemId !== id);
    },
    saveSettings: async (s) => {
      if (fake.failWrites) throw new Error('disk full');
      fake.settings = structuredClone(s);
    },
    replaceAll: async ({ solves, settings }) => {
      if (fake.failWrites) throw new Error('disk full');
      fake.solves = structuredClone(solves);
      fake.settings = structuredClone(settings);
    },
    requestPersistence: async () => true,
  };
  return fake;
}

