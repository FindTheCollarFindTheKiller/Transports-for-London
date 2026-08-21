const { getLineColor } = require('../server');

describe('getLineColor', () => {
  test('returns default color for missing or falsy inputs', () => {
    expect(getLineColor()).toBe('#667eea');
    expect(getLineColor(null)).toBe('#667eea');
    expect(getLineColor(undefined)).toBe('#667eea');
    expect(getLineColor('')).toBe('#667eea');
  });

  test('returns default color for unmatched lines', () => {
    expect(getLineColor('Fake Line')).toBe('#667eea');
    expect(getLineColor('Unknown')).toBe('#667eea');
  });

  test('returns correct color for exact matches', () => {
    expect(getLineColor('Bakerloo')).toBe('#B36305');
    expect(getLineColor('Central')).toBe('#E32017');
    expect(getLineColor('Northern')).toBe('#000000');
  });

  test('returns correct color for case insensitive matches', () => {
    expect(getLineColor('victoria')).toBe('#0098D4');
    expect(getLineColor('CENTRAL')).toBe('#E32017');
    expect(getLineColor('jUbIlEe')).toBe('#A0A5A9');
  });

  test('returns correct color for substring matches', () => {
    expect(getLineColor('Jubilee line')).toBe('#A0A5A9');
    expect(getLineColor('Hammersmith & City')).toBe('#F3A9BB');
    expect(getLineColor('Waterloo & City')).toBe('#95CDBA');
  });
});
