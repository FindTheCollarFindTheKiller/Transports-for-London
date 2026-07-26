const { getLineColor } = require('../server');

describe('getLineColor', () => {
  test('returns correct color for exact line names', () => {
    expect(getLineColor('Bakerloo')).toBe('#B36305');
    expect(getLineColor('Central')).toBe('#E32017');
    expect(getLineColor('Piccadilly')).toBe('#003688');
  });

  test('is case insensitive', () => {
    expect(getLineColor('central')).toBe('#E32017');
    expect(getLineColor('VICTORIA')).toBe('#0098D4');
    expect(getLineColor('bAkErLoO')).toBe('#B36305');
  });

  test('returns fallback color for unknown line names', () => {
    expect(getLineColor('UnknownLine')).toBe('#667eea');
    expect(getLineColor('New York Subway')).toBe('#667eea');
  });

  test('returns fallback color for edge cases', () => {
    expect(getLineColor(null)).toBe('#667eea');
    expect(getLineColor(undefined)).toBe('#667eea');
    expect(getLineColor('')).toBe('#667eea');
  });

  test('handles partial match', () => {
    expect(getLineColor('Bakerloo line')).toBe('#B36305');
    expect(getLineColor('The Central Line')).toBe('#E32017');
  });
});
