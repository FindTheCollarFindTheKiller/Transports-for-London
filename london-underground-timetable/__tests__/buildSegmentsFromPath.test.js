const { buildSegmentsFromPath } = require('../server');

describe('buildSegmentsFromPath', () => {
  test('returns empty array when path is not an array', () => {
    expect(buildSegmentsFromPath(null)).toEqual([]);
    expect(buildSegmentsFromPath(undefined)).toEqual([]);
    expect(buildSegmentsFromPath({})).toEqual([]);
    expect(buildSegmentsFromPath("not an array")).toEqual([]);
  });

  test('returns empty array when path length is less than 2', () => {
    expect(buildSegmentsFromPath([])).toEqual([]);
    expect(buildSegmentsFromPath([{ station: 'Station A' }])).toEqual([]);
  });

  test('handles a simple path with one line', () => {
    const path = [
      { station: 'Station A' },
      { station: 'Station B', line: 'Central' },
      { station: 'Station C', line: 'Central' }
    ];
    const segments = buildSegmentsFromPath(path);
    expect(segments).toEqual([
      {
        line: 'Central',
        stations: ['Station A', 'Station B', 'Station C'],
        stopCount: 2,
        instruction: 'Central line from Station A to Station C'
      }
    ]);
  });

  test('handles paths missing line properties by defaulting to Unknown', () => {
    const path = [
      { station: 'Station A' },
      { station: 'Station B' },
      { station: 'Station C' }
    ];
    const segments = buildSegmentsFromPath(path);
    expect(segments).toEqual([
      {
        line: 'Unknown',
        stations: ['Station A', 'Station B', 'Station C'],
        stopCount: 2,
        instruction: 'Unknown line from Station A to Station C'
      }
    ]);
  });

  test('handles multi-line paths with transfers', () => {
    const path = [
      { station: 'Station A' },
      { station: 'Station B', line: 'Central' },
      { station: 'Station C', line: 'Victoria' },
      { station: 'Station D', line: 'Victoria' }
    ];
    const segments = buildSegmentsFromPath(path);
    expect(segments).toEqual([
      {
        line: 'Central',
        stations: ['Station A', 'Station B'],
        stopCount: 1,
        instruction: 'Central line from Station A to Station B'
      },
      {
        line: 'Victoria',
        stations: ['Station B', 'Station C', 'Station D'],
        stopCount: 2,
        instruction: 'Victoria line from Station B to Station D'
      }
    ]);
  });

  test('handles multiple transfers', () => {
    const path = [
      { station: 'Station A' },
      { station: 'Station B', line: 'Line 1' },
      { station: 'Station C', line: 'Line 2' },
      { station: 'Station D', line: 'Line 3' }
    ];
    const segments = buildSegmentsFromPath(path);
    expect(segments).toEqual([
      {
        line: 'Line 1',
        stations: ['Station A', 'Station B'],
        stopCount: 1,
        instruction: 'Line 1 line from Station A to Station B'
      },
      {
        line: 'Line 2',
        stations: ['Station B', 'Station C'],
        stopCount: 1,
        instruction: 'Line 2 line from Station B to Station C'
      },
      {
        line: 'Line 3',
        stations: ['Station C', 'Station D'],
        stopCount: 1,
        instruction: 'Line 3 line from Station C to Station D'
      }
    ]);
  });
});
