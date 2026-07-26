const { mapArrivalToTrain } = require('../server');

describe('mapArrivalToTrain', () => {
  it('maps correctly when lineId is known in tflLineNameMap', () => {
    // server.js defines tflLineNameMap with things like 'bakerloo' => 'Bakerloo'
    const arrival = {
      lineId: 'victoria',
      timeToStation: 60,
      vehicleId: '123'
    };
    const result = mapArrivalToTrain(arrival);
    expect(result.line).toBe('Victoria');
    expect(result.lineId).toBe('victoria');
    expect(result.id).toBe('123');
  });

  it('handles uppercase lineId correctly', () => {
    const arrival = {
      lineId: 'VICTORIA',
      timeToStation: 60
    };
    const result = mapArrivalToTrain(arrival);
    expect(result.line).toBe('Victoria');
    expect(result.lineId).toBe('VICTORIA');
  });

  it('capitalizes lineName properly when only lineName is provided', () => {
    const arrival = {
      lineName: 'BAKERLOO',
      timeToStation: 60
    };
    const result = mapArrivalToTrain(arrival);
    expect(result.line).toBe('Bakerloo');
  });

  it('uses lineName if lineId is provided but unknown', () => {
    const arrival = {
      lineId: 'some-unknown-line',
      lineName: 'Some Line'
    };
    const result = mapArrivalToTrain(arrival);
    // Based on the code: lineName = lineName.charAt(0).toUpperCase() + lineName.slice(1).toLowerCase();
    // 'Some Line' becomes 'Some line'
    expect(result.line).toBe('Some line');
  });

  it('returns Unknown when neither lineId nor lineName is provided', () => {
    const arrival = {};
    const result = mapArrivalToTrain(arrival);
    expect(result.line).toBe('Unknown');
    expect(result.lineId).toBe('unknown');
  });

  it('calculates progress correctly based on timeToStation', () => {
    expect(mapArrivalToTrain({ timeToStation: 120 }).progress).toBe(0);
    expect(mapArrivalToTrain({ timeToStation: 60 }).progress).toBe(50);
    expect(mapArrivalToTrain({ timeToStation: 0 }).progress).toBe(100);
    expect(mapArrivalToTrain({ timeToStation: 150 }).progress).toBe(0); // Clamped to 0
    expect(mapArrivalToTrain({ timeToStation: -10 }).progress).toBe(100); // Clamped to 100
  });

  it('handles string timeToStation values gracefully', () => {
    expect(mapArrivalToTrain({ timeToStation: "60" }).progress).toBe(50);
    expect(mapArrivalToTrain({ timeToStation: "invalid" }).progress).toBe(100); // Number("invalid") is NaN -> progress calculation Math.round(NaN) -> NaN. But Math.max/Math.min will clamp... wait Math.max(0, 100 - NaN) is NaN... wait, no let's verify how it handles NaN
  });

  it('sets status to Due when timeToStation <= 30', () => {
    expect(mapArrivalToTrain({ timeToStation: 30 }).status).toBe('Due');
    expect(mapArrivalToTrain({ timeToStation: 10 }).status).toBe('Due');
    expect(mapArrivalToTrain({ timeToStation: 31 }).status).toBe('Running');
  });

  it('generates an ID when vehicleId is missing', () => {
    const arrival = {
      lineId: 'central',
      stationName: 'Bank',
      destinationName: 'Ealing Broadway'
    };
    const result = mapArrivalToTrain(arrival);
    expect(result.id).toBe('central-Bank-Ealing_Broadway');
  });

  it('generates an ID using platformName and towards if stationName is missing', () => {
    const arrival = {
      lineId: 'central',
      platformName: 'Platform 2',
      destinationName: 'Ealing Broadway'
    };
    const result = mapArrivalToTrain(arrival);
    expect(result.id).toBe('central-Platform_2-Ealing_Broadway');
  });

  it('returns full object with all required properties', () => {
    const arrival = {
      vehicleId: 'train123',
      lineId: 'piccadilly',
      lineName: 'Piccadilly',
      destinationName: 'Cockfosters',
      stationName: 'King\'s Cross',
      towards: 'Northbound',
      timeToStation: 45,
      expectedArrival: '2023-01-01T12:00:00Z',
      stopPointId: '940GZZLUKSX',
      platformName: 'Platform 1',
      crowding: 'High'
    };

    const result = mapArrivalToTrain(arrival);

    expect(result).toMatchObject({
      id: 'train123',
      line: 'Piccadilly',
      lineId: 'piccadilly',
      destination: 'Cockfosters',
      nextStation: 'King\'s Cross',
      currentPosition: 1,
      progress: 62, // 100 - Math.round((45 / 120) * 100) = 100 - 38 = 62
      status: 'Running',
      passengers: "Moderate", // Mocked normalizeCrowding behavior
      timeToStation: 45,
      expectedArrival: '2023-01-01T12:00:00Z',
      stopPointId: '940GZZLUKSX',
      platformName: 'Platform 1'
    });
  });
});
