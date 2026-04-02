/**
 * 🛡️ DEFENSE IN DEPTH: Temporal Normalization
 * Standardizes both 10-digit (seconds) and 13-digit (milliseconds) timestamps.
 * Eliminates "Epoch Hallucination" across distributed environments.
 */
export const normalizeDate = (val: any): Date => {
  if (!val) return new Date(0);
  
  // Convert strings or other formats to numeric timestamp
  const num = typeof val === 'number' ? val : new Date(val).getTime();
  
  // 🛰️ HEAL Hallucination: If year > 10000 (approx 2.5e14 ms), 
  // Drizzle likely hydrated ms as s, or it's a massive overflow.
  if (num > 250000000000000) { 
    return new Date(num / 1000);
  }
  
  // Standard: If < 10B, it's seconds (UNIX default).
  // 10,000,000,000 corresponds to Sat Nov 20 2286 17:46:40 UTC
  return num < 10000000000 ? new Date(num * 1000) : new Date(num);
};
