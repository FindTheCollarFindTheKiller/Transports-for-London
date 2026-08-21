const { mapArrivalToTrain } = require('../server.js');

describe('mapArrivalToTrain', () => {
  it('should map a happy path arrival with full TfL data', () => {
    const arrival = {
      vehicleId: '123',
      lineName: 'Bakerloo',
      lineId: 'bakerloo',
      destinationName: 'Elephant & Castle',
      stationName: 'Oxford Circus',
      timeToStation: 60,
      crowding: { description: 'Quiet' },
      expectedArrival: '2023-10-25T10:00:00Z',
      stopPointId: '940GZZLUOXC',
      platformName: 'Platform 1'
    };

    const result = mapArrivalToTrain(arrival);

    expect(result).toEqual({
      id: '123',
      line: 'Bakerloo',
      lineId: 'bakerloo',
      destination: 'Elephant & Castle',
      nextStation: 'Oxford Circus',
      currentPosition: 1,
      progress: 50, // 100 - (60/120 * 100) = 50
      status: 'Running',
      passengers: 'Moderate', // normalizeCrowding returns 'Moderate' by default for now
      timeToStation: 60,
      expectedArrival: '2023-10-25T10:00:00Z',
      stopPointId: '940GZZLUOXC',
      platformName: 'Platform 1'
    });
  });

  it('should bound progress at 100 when timeToStation is 0', () => {
    const arrival = { timeToStation: 0 };
    const result = mapArrivalToTrain(arrival);
    expect(result.progress).toBe(100);
  });

  it('should bound progress at 0 when timeToStation > 120', () => {
    const arrival = { timeToStation: 150 };
    const result = mapArrivalToTrain(arrival);
    expect(result.progress).toBe(0);
  });

  it('should map lineName via tflLineNameMap (e.g. waterloo-city -> Waterloo)', () => {
    const arrival = { lineId: 'waterloo-city' };
    const result = mapArrivalToTrain(arrival);
    expect(result.line).toBe('Waterloo');
  });

  it('should fallback to Unknown for line mapping if not found and no lineName provided', () => {
    const arrival = { lineId: 'fake-line' };
    const result = mapArrivalToTrain(arrival);
    expect(result.line).toBe('Unknown');
  });

  it('should properly capitalize the lineName', () => {
    const arrival = { lineId: 'victoria', lineName: 'VICTORIA' };
    const result = mapArrivalToTrain(arrival);
    expect(result.line).toBe('Victoria');
  });

  it('should fallback ID creation when vehicleId is missing', () => {
    const arrival = {
      lineId: 'bakerloo',
      stationName: 'Oxford Circus',
      destinationName: 'Elephant & Castle'
    };
    const result = mapArrivalToTrain(arrival);
    expect(result.id).toBe('bakerloo-Oxford_Circus-Elephant_&_Castle');
  });

  it('should set status to Due for timeToStation <= 30', () => {
    const arrival = { timeToStation: 30 };
    const result = mapArrivalToTrain(arrival);
    expect(result.status).toBe('Due');
  });

  it('should set status to Running for timeToStation > 30', () => {
    const arrival = { timeToStation: 31 };
    const result = mapArrivalToTrain(arrival);
    expect(result.status).toBe('Running');
  });

  it('should handle missing data defaults gracefully', () => {
    const arrival = {};
    const result = mapArrivalToTrain(arrival);

    expect(result.timeToStation).toBe(0);
    expect(result.progress).toBe(100);
    expect(result.line).toBe('Unknown');
    expect(result.lineId).toBe('unknown');
    expect(result.destination).toBe('Unknown');
    expect(result.nextStation).toBe('Next stop');
    expect(result.status).toBe('Due'); // because timeToStation is 0
    expect(result.passengers).toBe('Moderate');
    expect(result.expectedArrival).toBeUndefined();
    expect(result.stopPointId).toBeUndefined();
    expect(result.platformName).toBe('TBC');
  });
});
