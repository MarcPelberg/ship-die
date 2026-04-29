import type { RawMessageInput } from "../domain/types.js";

export interface IngestAdapter {
  start(onMessage: (message: RawMessageInput) => Promise<void>): Promise<void>;
}
