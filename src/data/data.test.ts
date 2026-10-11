import { describe, expect, it } from 'vitest';
import { inviteLink, isScriptUrl, parseInvite } from './invite';
import { applyServerResponse, type LocalData } from './merge';
import type { AnyRecord } from '../domain/types';

const URL_OK = 'https://script.google.com/macros/s/AKfycbx_abc-123/exec';
const CODE = 'Zk3_xY-9aBcDeFgHiJkLmNoPqRsTuVwXyZ012345678';

describe('lien d\'invitation', () => {
  it('se relit à l\'identique', () => {
    const link = inviteLink('https://jess164.github.io/pasdtal/#autre', { url: URL_OK, code: CODE, who: 'b' });
    expect(link.startsWith('https://jess164.github.io/pasdtal/#rejoindre=')).toBe(true);
    expect(parseInvite(link)).toEqual({ url: URL_OK, code: CODE, who: 'b' });
    expect(parseInvite('  ' + link + '\n')).not.toBeNull();
  });
  it('refuse un lien abîmé ou une autre adresse', () => {
    expect(parseInvite('https://exemple.fr')).toBeNull();
    expect(parseInvite('https://x.fr/#rejoindre=abc')).toBeNull();
    const bad = inviteLink('https://x.fr/', { url: 'https://pirate.fr/exec', code: CODE, who: 'b' });
    expect(parseInvite(bad)).toBeNull();
  });
  it('reconnaît l\'adresse d\'un script Google', () => {
    expect(isScriptUrl(URL_OK)).toBe(true);
    expect(isScriptUrl('https://script.google.com/a/macros/domaine.fr/s/AKfy/exec')).toBe(true);
    expect(isScriptUrl('https://script.google.com/macros/s/AKfy/dev')).toBe(false);
  });
});

const r = (id: string, updatedAt: number, by = 'd1', amount = 1) => ({ id, type: 'expense', updatedAt, by, amount } as unknown as AnyRecord);

describe('fusion côté téléphone', () => {
  it('prend les nouveautés, garde les modifications locales plus récentes et confirme les envois', () => {
    const local: LocalData = {
      rev: 4,
      records: { e1: r('e1', 10), e2: r('e2', 30, 'd1', 2) },
      pending: { e2: 30, e3: 40 }
    };
    const out = applyServerResponse(local, 7, [r('e1', 20, 'd2', 5), r('e2', 25, 'd2', 9), r('e4', 1)], { e2: 30, e3: 35 });
    expect((out.records.e1 as any).amount).toBe(5);
    expect((out.records.e2 as any).amount).toBe(2);
    expect(out.records.e4).toBeDefined();
    expect(out.pending).toEqual({ e3: 40 });
    expect(out.rev).toBe(7);
  });
});
