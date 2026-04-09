import { db, schema, normalizeDate } from './index';
import { config } from '@va-hub/config';

export async function getRegionalHealth() {
  const now = Date.now();
  const { slo } = config;
  const allVitals = await db.select().from(schema.vitals);
  const globalVitals = allVitals.find(v => v.id === 'GLOBAL');

  return (config.regions || ['Philippines']).map(regionName => {
    const regionVitals = allVitals.find(v => v.region === regionName) || globalVitals;
    
    const processingHeartbeatMs = regionVitals?.lastProcessingHeartbeatMs || (regionVitals?.lockUpdatedAt ? normalizeDate(regionVitals.lockUpdatedAt).getTime() : 0);
    const ingestionHeartbeatMs = regionVitals?.lastIngestionHeartbeatMs || 0;

    const pAge = (now - processingHeartbeatMs) / 60000;
    const iAge = ingestionHeartbeatMs > 0 ? (now - ingestionHeartbeatMs) / 60000 : Infinity;

    let state = "FRESH";
    if (pAge >= slo.heartbeat_stale_minutes && iAge >= slo.heartbeat_stale_minutes) {
      state = "STALE";
    } else if (pAge >= slo.heartbeat_delayed_minutes || iAge >= slo.heartbeat_delayed_minutes) {
      state = "DELAYED";
    }
    
    if (pAge <= slo.heartbeat_delayed_minutes && iAge >= slo.heartbeat_suspect_window_minutes) {
      state = "SUSPECT_HEARTBEAT";
    }

    return {
      name: regionName,
      state,
      pAge,
      iAge
    };
  });
}
