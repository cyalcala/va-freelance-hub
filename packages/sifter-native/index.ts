import { dlopen, FFIType, ptr } from "bun:ffi";
import { join } from "path";
import { config } from "@va-hub/config";

// Locate the native library
const libPath = join(import.meta.dir, "sifter.dll");

// Load the library
const lib = dlopen(libPath, {
  sift_job: {
    args: [
      FFIType.ptr, // title
      FFIType.ptr, // company
      FFIType.ptr, // desc
      FFIType.ptr, // kills_list (pipe delimited)
      FFIType.ptr  // signals_list (pipe delimited)
    ],
    returns: FFIType.u8,
  },
});

export enum OpportunityTier {
  GOLD = 1,
  SILVER = 2,
  BRONZE = 3,
  TRASH = 4,
}

// Pre-join config parameters for efficiency (Cached)
const killsString = [...config.kill_lists.titles, ...config.kill_lists.companies, ...config.kill_lists.content].join("|") + "\0";
const signalsString = config.target_signals.role.join("|") + "\0";

const killsPtr = Buffer.from(killsString);
const signalsPtr = Buffer.from(signalsString);

/**
 * Parametric Native Sifter (Zig-Powered)
 * High-performance substring matching driven by @va-hub/config.
 */
export function siftNative(title: string, company: string, description: string): OpportunityTier {
  const titlePtr = Buffer.from(title + "\0");
  const companyPtr = Buffer.from(company + "\0");
  const descPtr = Buffer.from(description + "\0");

  return lib.symbols.sift_job(
    ptr(titlePtr),
    ptr(companyPtr),
    ptr(descPtr),
    ptr(killsPtr),
    ptr(signalsPtr)
  ) as OpportunityTier;
}
