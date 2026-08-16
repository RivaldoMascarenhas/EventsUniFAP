export type PresentationStageState = "IDLE" | "SHOWING_QR_CODE" | "SHOWING_EVENT_LOGO" | "SHOWING_PRIZE" | "DRAWING" | "RESULT";

export interface RealtimePayload {
  type: "state:sync" | "qr:show" | "logo:show" | "idle:show" | "prize:show" | "draw:start" | "draw:result" | "draw:cancel";
  eventId: string;
  state: PresentationStageState;
  prizeId?: string | null;
  prize?: any;
  drawId?: string | null;
  winner?: any;
  timestamp: number;
}

interface EventChannel {
  state: PresentationStageState;
  currentPrizeId: string | null;
  currentPrize: any | null;
  currentWinner: any | null;
  subscribers: Set<(payload: RealtimePayload) => void>;
}

class RealtimeService {
  private channels = new Map<string, EventChannel>();

  private getChannel(eventId: string): EventChannel {
    if (!this.channels.has(eventId)) {
      this.channels.set(eventId, {
        state: "IDLE",
        currentPrizeId: null,
        currentPrize: null,
        currentWinner: null,
        subscribers: new Set(),
      });
    }
    return this.channels.get(eventId)!;
  }

  public subscribe(eventId: string, callback: (payload: RealtimePayload) => void): () => void {
    const channel = this.getChannel(eventId);
    channel.subscribers.add(callback);

    // Immediately send current state snapshot
    callback({
      type: "state:sync",
      eventId,
      state: channel.state,
      prizeId: channel.currentPrizeId,
      prize: channel.currentPrize,
      winner: channel.currentWinner,
      timestamp: Date.now(),
    });

    return () => {
      channel.subscribers.delete(callback);
    };
  }

  public publish(eventId: string, event: Omit<RealtimePayload, "timestamp">) {
    const channel = this.getChannel(eventId);
    channel.state = event.state;
    if (event.prize !== undefined) channel.currentPrize = event.prize;
    if (event.prizeId !== undefined) channel.currentPrizeId = event.prizeId;
    if (event.winner !== undefined) channel.currentWinner = event.winner;

    const payload: RealtimePayload = {
      ...event,
      timestamp: Date.now(),
    };

    channel.subscribers.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error("[RealtimeService] Error dispatching to subscriber:", err);
      }
    });
  }

  public getState(eventId: string) {
    const channel = this.getChannel(eventId);
    return {
      eventId,
      state: channel.state,
      prizeId: channel.currentPrizeId,
      prize: channel.currentPrize,
      winner: channel.currentWinner,
      activeListeners: channel.subscribers.size,
    };
  }
}

const globalForRealtime = globalThis as unknown as {
  realtimeService: RealtimeService | undefined;
};

export const realtimeService = globalForRealtime.realtimeService ?? new RealtimeService();
if (process.env.NODE_ENV !== "production") globalForRealtime.realtimeService = realtimeService;
