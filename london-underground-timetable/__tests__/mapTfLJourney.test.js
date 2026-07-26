const { mapTfLJourney } = require('../server');

describe('mapTfLJourney', () => {
  it('should map a complete TfL journey correctly (Happy Path)', () => {
    const mockJourney = {
      duration: 25,
      summary: '25 min journey',
      legs: [
        {
          departureTime: '2023-10-27T10:00:00Z',
          arrivalTime: '2023-10-27T10:15:00Z',
          mode: { name: 'tube' },
          routeOptions: [{ name: 'Victoria' }],
          instruction: { summary: 'Victoria from Kings Cross to Oxford Circus' },
          departurePoint: { commonName: 'Kings Cross St Pancras' },
          arrivalPoint: { commonName: 'Oxford Circus' },
          path: {
            stopPoints: [
              { name: 'Kings Cross St Pancras' },
              { name: 'Euston' },
              { name: 'Warren Street' },
              { name: 'Oxford Circus' }
            ]
          }
        },
        {
          departureTime: '2023-10-27T10:18:00Z',
          arrivalTime: '2023-10-27T10:25:00Z',
          mode: { name: 'tube' },
          routeOptions: [{ name: 'Bakerloo' }],
          instruction: { summary: 'Bakerloo from Oxford Circus to Waterloo' },
          departurePoint: { commonName: 'Oxford Circus' },
          arrivalPoint: { commonName: 'Waterloo' },
          path: {
            stopPoints: [
              { name: 'Oxford Circus' },
              { name: 'Piccadilly Circus' },
              { name: 'Charing Cross' },
              { name: 'Embankment' },
              { name: 'Waterloo' }
            ]
          }
        }
      ],
      fare: {
        fareZones: [{ id: 1, name: 'Zone 1' }]
      }
    };

    const index = 0;
    const result = mapTfLJourney(mockJourney, index);

    expect(result.id).toBe('tfl-1');
    expect(result.source).toBe('tfl');
    expect(result.origin).toBe('Kings Cross St Pancras');
    expect(result.destination).toBe('Waterloo');
    expect(result.durationMinutes).toBe(25);
    expect(result.transfers).toBe(1);
    expect(result.stops).toBe(7); // 3 stops in first leg, 4 stops in second
    expect(result.summary).toBe('25 min journey');
    expect(result.departureTime).toBe('2023-10-27T10:00:00Z');
    expect(result.arrivalTime).toBe('2023-10-27T10:25:00Z');
    expect(result.warnings).toEqual([]);

    expect(result.segments.length).toBe(2);
    expect(result.segments[0].line).toBe('Victoria');
    expect(result.segments[0].stations).toEqual([
      'Kings Cross St Pancras',
      'Euston',
      'Warren Street',
      'Oxford Circus'
    ]);
    expect(result.segments[0].stopCount).toBe(3);

    expect(result.segments[1].line).toBe('Bakerloo');
    expect(result.segments[1].stations).toEqual([
      'Oxford Circus',
      'Piccadilly Circus',
      'Charing Cross',
      'Embankment',
      'Waterloo'
    ]);
    expect(result.segments[1].stopCount).toBe(4);
  });

  it('should handle gracefully when legs is missing, null, or empty', () => {
    const resultMissing = mapTfLJourney({}, 1);
    const resultNull = mapTfLJourney({ legs: null }, 1);
    const resultEmpty = mapTfLJourney({ legs: [] }, 1);

    const expectedEmptyResult = {
      id: 'tfl-2',
      source: 'tfl',
      origin: null,
      destination: null,
      durationMinutes: 0,
      transfers: 0,
      stops: 0,
      summary: '0 min journey',
      departureTime: null,
      arrivalTime: null,
      warnings: [],
      segments: [],
      path: []
    };

    expect(resultMissing).toEqual(expectedEmptyResult);
    expect(resultNull).toEqual(expectedEmptyResult);
    expect(resultEmpty).toEqual(expectedEmptyResult);
  });

  it('should handle partial data correctly (fallbacks)', () => {
    const mockJourney = {
      legs: [
        {
          // Missing routeOptions, relying on mode
          mode: { name: 'bus' },
          // Missing commonName, relying on instruction
          instruction: { summary: 'Bus from Start to End' },
          // Missing both commonName and instruction for arrival, relying on default 'End'
          arrivalPoint: {},
          // Missing path.stopPoints
          path: {}
        }
      ]
    };

    const result = mapTfLJourney(mockJourney, 0);

    expect(result.origin).toBe(null); // departurePoint.commonName is undefined
    expect(result.destination).toBe(null); // arrivalPoint.commonName is undefined

    expect(result.segments[0].line).toBe('bus');
    expect(result.segments[0].stations).toEqual(['Bus from Start to End', 'End']);
    expect(result.segments[0].stopCount).toBe(1);
    expect(result.segments[0].instruction).toBe('Bus from Start to End');
  });

  it('should handle fare warning when fareZones is empty array', () => {
    const mockJourney = {
      legs: [
        {
          departurePoint: { commonName: 'Start' },
          arrivalPoint: { commonName: 'End' }
        }
      ],
      fare: {
        fareZones: [] // Empty array should trigger warning
      }
    };

    const result = mapTfLJourney(mockJourney, 0);

    expect(result.warnings).toEqual(['Fare information unavailable for this option.']);
  });

  it('should handle prepending/appending departure and arrival to pathStops', () => {
    const mockJourney = {
      legs: [
        {
          departurePoint: { commonName: 'A' },
          arrivalPoint: { commonName: 'D' },
          path: {
            // Path stops are missing A and D
            stopPoints: [
              { name: 'B' },
              { name: 'C' }
            ]
          }
        }
      ]
    };

    const result = mapTfLJourney(mockJourney, 0);

    expect(result.segments[0].stations).toEqual(['A', 'B', 'C', 'D']);
    expect(result.segments[0].stopCount).toBe(3);
  });

  it('should ignore walking segments in transfers count', () => {
    const mockJourney = {
      legs: [
        { mode: { name: 'walking' } },
        { mode: { name: 'tube' } },
        { mode: { name: 'walking' } },
        { mode: { name: 'tube' } }
      ]
    };

    const result = mapTfLJourney(mockJourney, 0);

    // 2 tube segments -> 1 transfer
    expect(result.transfers).toBe(1);
  });
});
