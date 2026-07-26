const { normalizeStationName } = require('../server');

describe('normalizeStationName', () => {
  test('returns null for empty or whitespace-only queries', () => {
    expect(normalizeStationName('')).toBeNull();
    expect(normalizeStationName('   ')).toBeNull();
    expect(normalizeStationName(null)).toBeNull();
    expect(normalizeStationName(undefined)).toBeNull();
  });

  test('returns exact matches (case insensitive)', () => {
    expect(normalizeStationName('Victoria')).toBe('Victoria');
    expect(normalizeStationName('victoria')).toBe('Victoria');
    expect(normalizeStationName('VICTORIA')).toBe('Victoria');
  });

  test('returns exact matches with special characters', () => {
    expect(normalizeStationName("King's Cross St. Pancras")).toBe("King's Cross St. Pancras");
    expect(normalizeStationName("Kings Cross St Pancras")).toBe("King's Cross St. Pancras");
    expect(normalizeStationName("kings cross st pancras")).toBe("King's Cross St. Pancras");
  });

  test('returns prefix matches', () => {
    expect(normalizeStationName('Kings Cross')).toBe("King's Cross St. Pancras");
    expect(normalizeStationName('Highbury')).toBe('Highbury & Islington');
    expect(normalizeStationName('Walthamstow')).toBe('Walthamstow Central');
  });

  test('returns substring matches', () => {
    expect(normalizeStationName('St Pancras')).toBe("King's Cross St. Pancras");
    expect(normalizeStationName('Islington')).toBe('Highbury & Islington');
  });

  test('handles ampersands and "and"', () => {
    expect(normalizeStationName('Highbury and Islington')).toBe('Highbury & Islington');
    expect(normalizeStationName('Highbury & Islington')).toBe('Highbury & Islington');
    expect(normalizeStationName('Elephant & Castle')).toBe('Elephant & Castle');
    expect(normalizeStationName('Elephant and Castle')).toBe('Elephant & Castle');
  });

  test('returns null when no match is found', () => {
    expect(normalizeStationName('Fake Station')).toBeNull();
    expect(normalizeStationName('NotARealPlace')).toBeNull();
  });
});
