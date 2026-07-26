const { summarizeStatuses } = require('../server');

describe('summarizeStatuses', () => {
  it('should return all zeros for an empty map', () => {
    const result = summarizeStatuses({});
    expect(result).toEqual({ healthy: 0, minor: 0, disrupted: 0, unknown: 0, total: 0 });
  });

  it('should increment healthy for "Good Service"', () => {
    const statusMap = {
      'victoria': { statusSeverityDescription: 'Good Service' },
      'central': { statusSeverityDescription: 'good service' },
    };
    const result = summarizeStatuses(statusMap);
    expect(result).toEqual({ healthy: 2, minor: 0, disrupted: 0, unknown: 0, total: 2 });
  });

  it('should increment minor for minor delays, reduced service, part suspension, or planned closure', () => {
    const statusMap = {
      'line1': { statusSeverityDescription: 'Minor Delays' },
      'line2': { statusSeverityDescription: 'Reduced Service' },
      'line3': { statusSeverityDescription: 'Part Suspension' },
      'line4': { statusSeverityDescription: 'Planned Closure' },
    };
    const result = summarizeStatuses(statusMap);
    expect(result).toEqual({ healthy: 0, minor: 4, disrupted: 0, unknown: 0, total: 4 });
  });

  it('should increment disrupted for severe delays, suspended, disrupted, major, or closure', () => {
    const statusMap = {
      'line1': { statusSeverityDescription: 'Severe Delays' },
      'line2': { statusSeverityDescription: 'Suspended' },
      'line3': { statusSeverityDescription: 'Disrupted' },
      'line4': { statusSeverityDescription: 'Major Delays' },
      'line5': { statusSeverityDescription: 'Closure' },
    };
    const result = summarizeStatuses(statusMap);
    expect(result).toEqual({ healthy: 0, minor: 0, disrupted: 5, unknown: 0, total: 5 });
  });

  it('should handle different data shapes (arrays and nested lineStatuses)', () => {
    const statusMap = {
      'arrayShape': [{ statusSeverityDescription: 'Good Service' }],
      'nestedShape': { lineStatuses: [{ statusSeverityDescription: 'Severe Delays' }] },
      'arrayNestedShape': [{ lineStatuses: [{ statusSeverityDescription: 'Minor Delays' }] }]
    };
    const result = summarizeStatuses(statusMap);
    expect(result).toEqual({ healthy: 1, minor: 1, disrupted: 1, unknown: 0, total: 3 });
  });

  it('should categorize as unknown for unrecognized statuses or empty descriptions', () => {
    const statusMap = {
      'empty': {},
      'nullDesc': { statusSeverityDescription: null },
      'weird': { statusSeverityDescription: 'Alien Invasion' }
    };
    const result = summarizeStatuses(statusMap);
    expect(result).toEqual({ healthy: 0, minor: 0, disrupted: 0, unknown: 3, total: 3 });
  });

  it('should process a mix of statuses correctly', () => {
    const statusMap = {
      'victoria': { statusSeverityDescription: 'Good Service' },
      'central': { statusSeverityDescription: 'Severe Delays' },
      'piccadilly': { statusSeverityDescription: 'Minor Delays' },
      'district': { statusSeverityDescription: 'Unknown status' }
    };
    const result = summarizeStatuses(statusMap);
    expect(result).toEqual({ healthy: 1, minor: 1, disrupted: 1, unknown: 1, total: 4 });
  });
});
