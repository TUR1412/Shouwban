import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPerfVitals } from '../scripts/modules/perf-vitals.js';

describe('PerfVitals', () => {
  it('snapshot returns a stable shape', () => {
    const Logger = { info: () => {} };
    const Telemetry = { track: () => {} };
    const Utils = { getPageName: () => 'test' };

    const perf = createPerfVitals({ Logger, Telemetry, Utils });
    const snap = perf.snapshot();

    assert.equal(snap.page, 'test');
    assert.equal(typeof snap.time, 'string');
    assert.ok('ttfbMs' in snap);
    assert.ok('fcpMs' in snap);
    assert.ok('lcpMs' in snap);
    assert.ok('cls' in snap);
    assert.ok('inpMs' in snap);
  });

  it('report logs once by default', () => {
    const loggerCalls = [];
    const telemetryCalls = [];

    const Logger = { info: (msg, detail) => loggerCalls.push({ msg, detail }) };
    const Telemetry = { track: (name, payload) => telemetryCalls.push({ name, payload }) };
    const Utils = { getPageName: () => 'test' };

    const perf = createPerfVitals({ Logger, Telemetry, Utils }, { reportOnce: true });

    assert.equal(perf.report('manual'), true);
    assert.equal(perf.report('manual2'), false);

    assert.equal(loggerCalls.length, 1);
    assert.equal(telemetryCalls.length, 1);
    assert.equal(loggerCalls[0].msg, 'PerfVitals');
    assert.equal(telemetryCalls[0].name, 'perf_vitals');
  });

  it('init does not throw when sampling is disabled', () => {
    const perf = createPerfVitals({}, { sampleRate: 0 });
    assert.doesNotThrow(() => perf.init());
  });
});

