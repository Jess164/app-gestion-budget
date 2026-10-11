import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { beforeEach, describe, expect, it } from 'vitest';

/** Charge Code.gs dans un bac à sable avec de faux services Google (feuille, propriétés, verrou). */
function loadScript() {
  const props = new Map<string, string>();
  const grid: unknown[][] = [];
  const sheet = {
    getLastRow: () => grid.length,
    getRange: (row: number, _col: number, nRows: number, nCols: number) => ({
      getValues: () => grid.slice(row - 1, row - 1 + nRows).map((r) => r.slice(0, nCols)),
      setValues: (vals: unknown[][]) => vals.forEach((v, i) => { grid[row - 1 + i] = [...v]; })
    }),
    setFrozenRows: () => {}
  };
  let created = false;
  const ctx = createContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => (props.has(k) ? props.get(k)! : null),
        setProperty: (k: string, v: string) => props.set(k, v),
        deleteProperty: (k: string) => props.delete(k)
      })
    },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: () => (created ? sheet : null),
        insertSheet: () => { created = true; return sheet; }
      })
    },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (s: string) => ({ setMimeType: () => ({ body: s }) })
    }
  });
  runInContext(readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8'), ctx);
  const call = (body: unknown) => JSON.parse((ctx as any).doPost({ postData: { contents: JSON.stringify(body) } }).body);
  const get = () => JSON.parse((ctx as any).doGet().body);
  return { call, get, grid, props };
}

const CODE = 'abcdefghijklmnopqrstuvwxyz';
const rec = (id: string, updatedAt: number, by = 'dev1', extra: Record<string, unknown> = {}) => ({ id, type: 'expense', updatedAt, by, amount: 1, ...extra });

describe('script Google', () => {
  let s: ReturnType<typeof loadScript>;
  beforeEach(() => { s = loadScript(); });

  it('se configure une seule fois avec un code secret', () => {
    expect(s.get().initialized).toBe(false);
    const r = s.call({ action: 'init', code: CODE, changes: [rec('member-a', 1)] });
    expect(r.ok).toBe(true);
    expect(r.records).toHaveLength(1);
    expect(s.get().initialized).toBe(true);
    expect(s.call({ action: 'init', code: CODE }).error).toBe('already_initialized');
  });

  it('refuse un mauvais code', () => {
    s.call({ action: 'init', code: CODE });
    expect(s.call({ action: 'sync', code: 'faux', since: 0 }).error).toBe('bad_code');
  });

  it('renvoie seulement ce qui a changé depuis la révision donnée', () => {
    s.call({ action: 'init', code: CODE, changes: [rec('e1', 1), rec('e2', 1)] });
    const r1 = s.call({ action: 'sync', code: CODE, since: 0, changes: [rec('e3', 5)] });
    expect(r1.rev).toBe(3);
    const r2 = s.call({ action: 'sync', code: CODE, since: 3, changes: [] });
    expect(r2.records).toHaveLength(0);
    const r3 = s.call({ action: 'sync', code: CODE, since: 2, changes: [] });
    expect(r3.records.map((r: any) => r.id)).toEqual(['e3']);
  });

  it('garde la modification la plus récente', () => {
    s.call({ action: 'init', code: CODE, changes: [rec('e1', 10, 'dev1', { amount: 10 })] });
    s.call({ action: 'sync', code: CODE, since: 0, changes: [rec('e1', 5, 'dev2', { amount: 5 })] });
    let r = s.call({ action: 'sync', code: CODE, since: 0, changes: [] });
    expect(r.records[0].amount).toBe(10);
    s.call({ action: 'sync', code: CODE, since: 0, changes: [rec('e1', 20, 'dev2', { amount: 20 })] });
    r = s.call({ action: 'sync', code: CODE, since: 0, changes: [] });
    expect(r.records[0].amount).toBe(20);
    expect(s.grid.length).toBe(2); // une ligne d'en-tête + une ligne de données
  });

  it('départage deux modifications à la même milliseconde', () => {
    s.call({ action: 'init', code: CODE, changes: [rec('e1', 10, 'devA', { amount: 1 })] });
    s.call({ action: 'sync', code: CODE, since: 0, changes: [rec('e1', 10, 'devB', { amount: 2 })] });
    const r = s.call({ action: 'sync', code: CODE, since: 0, changes: [] });
    expect(r.records[0].amount).toBe(2);
  });

  it('ignore les changements mal formés', () => {
    s.call({ action: 'init', code: CODE });
    const r = s.call({ action: 'sync', code: CODE, since: 0, changes: [null, { id: 3 }, { id: 'x', updatedAt: 'a', type: 't' }] });
    expect(r.ok).toBe(true);
    expect(r.records).toHaveLength(0);
  });
});
