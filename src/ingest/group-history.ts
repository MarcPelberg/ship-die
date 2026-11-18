import type { WASocket, WAMessage } from "baileys";

const pageSize = 50;
const maxPages = 24;

type Anchor = { id: string; fromMe: boolean; timestampMs: number };
type RecoveryState = {
  anchor: Anchor;
  pages: number;
  status: "sending" | "requested" | "send_failed" | "no_older_returned" | "page_limit" | "resume_requested";
  requestId?: string;
  oldestReturned?: Anchor;
};
type StateDb = {
  query(sql: string, params: string[]): Promise<{ rows: { value: RecoveryState }[]; rowCount: number | null }>;
};

function oldestAnchor(group: string, messages: WAMessage[]): Anchor | undefined {
  let oldest: Anchor | undefined;
  for (const item of messages) {
    const key = item.key;
    const timestampMs = Number(item.messageTimestamp) * 1000;
    if (key.remoteJid !== group || !key.id || typeof key.fromMe !== "boolean") continue;
    if (!item.message || item.message.protocolMessage || !Number.isSafeInteger(timestampMs) || timestampMs <= 0) continue;
    if (!oldest || timestampMs < oldest.timestampMs) oldest = { id: key.id, fromMe: key.fromMe, timestampMs };
  }
  return oldest;
}

/** At most one page is outstanding. A reconnect must not repeat an unacknowledged request. */
export class GroupHistoryRecovery {
  private readonly stateKey: string;
  private checkedInitial = false;
  private queue = Promise.resolve();

  constructor(private readonly group: string, private readonly db: StateDb,
              private readonly fetchHistory: WASocket["fetchMessageHistory"]) {
    this.stateKey = `whatsapp_history_recovery:${group}`;
  }

  observe(messages: WAMessage[], replyTo?: string | null, finalChunk = true): Promise<void> {
    if (replyTo === null || (replyTo === undefined && this.checkedInitial)) return this.queue;
    const anchor = oldestAnchor(this.group, messages);
    if (!anchor && !replyTo) return this.queue;
    return this.serialize(async () => {
      if (!replyTo && this.checkedInitial) return;
      const state = await this.read();
      if (!replyTo) {
        if (!state && anchor) await this.send(undefined, anchor, 1);
        this.checkedInitial = true;
        return;
      }
      if (!state || state.requestId !== replyTo || !["requested", "no_older_returned"].includes(state.status)) return;
      let oldest = state.oldestReturned;
      if (anchor && anchor.id !== state.anchor.id && anchor.timestampMs < (oldest ?? state.anchor).timestampMs) oldest = anchor;
      if (!finalChunk) {
        if (oldest !== state.oldestReturned) await this.save(state, { ...state, oldestReturned: oldest });
      } else if (!oldest || state.pages >= maxPages) {
        await this.save(state, { ...state, oldestReturned: oldest, status: oldest ? "page_limit" : "no_older_returned" });
      } else {
        await this.send(state, oldest, state.pages + 1);
      }
    });
  }

  /** Only an explicit operator decision can re-arm a bounded or interrupted run. */
  resumeIfRequested(): Promise<void> {
    return this.serialize(async () => {
      const state = await this.read();
      if (state?.status === "resume_requested") await this.send(state, state.oldestReturned ?? state.anchor, 1);
    });
  }

  private serialize(action: () => Promise<void>): Promise<void> {
    this.queue = this.queue.then(action).catch(() => {
      console.error("Could not record WhatsApp history recovery progress.");
    });
    return this.queue;
  }

  private async read(): Promise<RecoveryState | undefined> {
    const res = await this.db.query("select value from system_state where key = $1", [this.stateKey]);
    return res.rows[0]?.value;
  }

  private async save(previous: RecoveryState | undefined, next: RecoveryState): Promise<boolean> {
    const params = [this.stateKey, JSON.stringify(next)];
    const res = previous
      ? await this.db.query("update system_state set value=$2::jsonb, updated_at=now() where key=$1 and value=$3::jsonb",
        [...params, JSON.stringify(previous)])
      : await this.db.query("insert into system_state (key,value) values ($1,$2::jsonb) on conflict (key) do nothing", params);
    return res.rowCount === 1;
  }

  private async send(previous: RecoveryState | undefined, anchor: Anchor, pages: number): Promise<void> {
    const sending: RecoveryState = { anchor, pages, status: "sending" };
    if (!await this.save(previous, sending)) return;
    let result: RecoveryState;
    try {
      const requestId = await this.fetchHistory(pageSize, { remoteJid: this.group, id: anchor.id, fromMe: anchor.fromMe }, anchor.timestampMs);
      result = { ...sending, status: "requested", requestId };
    } catch {
      // Delivery is uncertain. Keep the reservation across reconnects instead of replaying it.
      result = { ...sending, status: "send_failed" };
      console.warn("WhatsApp history request failed; recovery paused.");
    }
    await this.save(sending, result);
  }
}
