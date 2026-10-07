import type { PublicBoard } from "./public-board";
import captured from "../data/public-lkg.json";

/**
 * Durable last-known-good board captured from production D1.
 * Descriptions are omitted so the bundle stays small. A live snapshot refresh
 * replaces this copy when D1 is healthy. This is real public inventory, not a
 * sample catalog.
 */
export function getDurableLkgSnapshot(): PublicBoard {
  return structuredClone(captured) as PublicBoard;
}
