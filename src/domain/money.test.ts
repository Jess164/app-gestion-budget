import { describe, expect, it } from 'vitest';
import { eur, evalExpr, hasOp, numToInput, parseAmount, r2 } from './money';

describe('r2', () => {
  it('arrondit les demi-centimes vers le haut malgré les nombres à virgule', () => {
    expect(r2(6.745)).toBe(6.75);
    expect(r2(28.255)).toBe(28.26);
    expect(r2(-6.745)).toBe(-6.75);
    expect(r2(191.16000000000003)).toBe(191.16);
  });
});

describe('eur', () => {
  it('formate en euros à la française', () => {
    expect(eur(1234.5)).toBe('1 234,50 €');
    expect(eur(-0.001)).toBe('0,00 €');
  });
});

describe('evalExpr', () => {
  it('calcule les saisies avec virgule et opérateurs', () => {
    expect(evalExpr('12,40+8,90')).toBeCloseTo(21.3);
    expect(evalExpr('3×2,50')).toBeCloseTo(7.5);
    expect(evalExpr('10÷4')).toBeCloseTo(2.5);
    expect(evalExpr('20−5,5')).toBeCloseTo(14.5);
    expect(evalExpr('2+3*4')).toBe(14);
    expect(evalExpr(' 12,50 € ')).toBe(12.5);
  });
  it('refuse les saisies invalides', () => {
    expect(evalExpr('')).toBeNaN();
    expect(evalExpr('12+')).toBeNaN();
    expect(evalExpr('abc')).toBeNaN();
    expect(evalExpr('5÷0')).toBeNaN();
  });
});

describe('aides de saisie', () => {
  it('repère un calcul', () => {
    expect(hasOp('12,40+8,90')).toBe(true);
    expect(hasOp('-12')).toBe(false);
  });
  it('lit un montant positif', () => {
    expect(parseAmount('12,345')).toBe(12.35);
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('-3')).toBeNull();
    expect(numToInput(21.3)).toBe('21,3');
  });
});
