const { canonicalizeStationName } = require('../server');

describe('canonicalizeStationName', () => {
  test('returns empty string for falsy values', () => {
    expect(canonicalizeStationName(null)).toBe('');
    expect(canonicalizeStationName(undefined)).toBe('');
    expect(canonicalizeStationName('')).toBe('');
  });

  test('converts string to lowercase', () => {
    expect(canonicalizeStationName('Victoria')).toBe('victoria');
    expect(canonicalizeStationName('WATERLOO')).toBe('waterloo');
  });

  test('replaces ampersands with "and"', () => {
    expect(canonicalizeStationName('Elephant & Castle')).toBe('elephant and castle');
    expect(canonicalizeStationName('Harrow & Wealdstone')).toBe('harrow and wealdstone');
  });

  test('removes apostrophes', () => {
    expect(canonicalizeStationName("Earl's Court")).toBe('earls court');
    expect(canonicalizeStationName("King's Cross")).toBe('kings cross');
  });

  test('replaces non-alphanumeric characters with spaces', () => {
    expect(canonicalizeStationName('St. Pancras')).toBe('st pancras');
    expect(canonicalizeStationName('Stratford (London)')).toBe('stratford london');
    expect(canonicalizeStationName('Shepherd-Bush')).toBe('shepherd bush');
  });

  test('handles multiple spaces and trims', () => {
    expect(canonicalizeStationName('  High   Barnet ')).toBe('high barnet');
    expect(canonicalizeStationName('Tottenham    Court    Road')).toBe('tottenham court road');
  });

  test('handles complex combinations', () => {
    expect(canonicalizeStationName(" King's Cross St. Pancras & International ")).toBe('kings cross st pancras and international');
    expect(canonicalizeStationName("Shepherd's Bush (Central)")).toBe('shepherds bush central');
  });
});
