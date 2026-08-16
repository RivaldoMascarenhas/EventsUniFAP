import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export type PresentationStageState = "IDLE" | "SHOWING_QR_CODE" | "SHOWING_EVENT_LOGO" | "SHOWING_PRIZE" | "DRAWING" | "RESULT";

export interface RealtimePayload {
  type: "state:sync" | "qr:show" | "logo:show" | "idle:show" | "prize:show" | "draw:start" | "draw:result" | "draw:cancel" | "audio:config";
  eventId: string;
  state: PresentationStageState;
  prizeId?: string | null;
  prize?: any;
  drawId?: string | null;
  winner?: any;
  soundEnabled?: boolean;
  volume?: number;
  timestamp: number;
}

interface EventChannel {
  state: PresentationStageState;
  currentPrizeId: string | null;
  currentPrize: any | null;
  currentWinner: any | null;
  soundEnabled: boolean;
  volume: number;
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
        soundEnabled: true,
        volume: 0.85,
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
      soundEnabled: channel.soundEnabled,
      volume: channel.volume,
      timestamp: Date.now(),
    });

    return () => {
      channel.subscribers.delete(callback);
    };
  }

  public async publish(eventId: string, event: Omit<RealtimePayload, "timestamp">) {
    const channel = this.getChannel(eventId);
    channel.state = event.state;
    if (event.prize !== undefined) channel.currentPrize = event.prize;
    if (event.prizeId !== undefined) channel.currentPrizeId = event.prizeId;
    if (event.winner !== undefined) channel.currentWinner = event.winner;
    if (event.soundEnabled !== undefined) channel.soundEnabled = event.soundEnabled;
    if (event.volume !== undefined) channel.volume = event.volume;

    const payload: RealtimePayload = {
      ...event,
      timestamp: Date.now(),
    };

    // 1. Dispatch to local Node SSE subscribers
    channel.subscribers.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error("[RealtimeService] Error dispatching to subscriber:", err);
      }
    });

    // 2. Persist in Database for multi-server / serverless sync
    try {
      await prisma.idempotencyRecord.upsert({
        where: { key: `presentation_state:${eventId}` },
        update: {
          result: JSON.stringify(payload),
        },
        create: {
          key: `presentation_state:${eventId}`,
          eventId,
          result: JSON.stringify(payload),
        },
      });
    } catch (dbErr) {
      console.warn("[RealtimeService] Could not persist state in DB:", dbErr);
    }

    // 3. Broadcast to Supabase Realtime WebSocket channel for cross-device instant sync
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const ch = supabase.channel(`presentation:${eventId}`);
        ch.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            ch.send({
              type: "broadcast",
              event: "state_change",
              payload,
            }).finally(() => {
              supabase.removeChannel(ch);
            });
          }
        });

        // Also notify global admin dashboard of live draw state change
        const adminCh = supabase.channel("admin_dashboard_sync");
        adminCh.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            adminCh.send({
              type: "broadcast",
              event: "dashboard_update",
              payload: { type: "draw", eventId, timestamp: Date.now() },
            }).finally(() => {
              supabase.removeChannel(adminCh);
            });
          }
        });
      } catch (sbErr) {
        console.warn("[RealtimeService] Supabase broadcast error:", sbErr);
      }
    }
  }

  /**
   * Broadcasts a lightweight invalidation signal to all open admin dashboards via Supabase Realtime WebSocket
   */
  public async broadcastGlobalUpdate(event: { type: string; eventId?: string; metadata?: any }) {
    return RealtimeService.broadcastGlobalUpdate(event);
  }

  public static async broadcastGlobalUpdate(event: { type: string; eventId?: string; metadata?: any }) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const adminCh = supabase.channel("admin_dashboard_sync");
        adminCh.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            adminCh.send({
              type: "broadcast",
              event: "dashboard_update",
              payload: { ...event, timestamp: Date.now() },
            }).finally(() => {
              supabase.removeChannel(adminCh);
            });
          }
        });
      } catch (sbErr) {
        console.warn("[RealtimeService] Global broadcast error:", sbErr);
      }
    }
  }

  public async getPersistentState(eventId: string): Promise<RealtimePayload> {
    try {
      const record = await prisma.idempotencyRecord.findUnique({
        where: { key: `presentation_state:${eventId}` },
      });

      if (record && record.result) {
        return JSON.parse(record.result);
      }
    } catch {
      // Fallback
    }

    const channel = this.getChannel(eventId);
    return {
      type: "state:sync",
      eventId,
      state: channel.state,
      prizeId: channel.currentPrizeId,
      prize: channel.currentPrize,
      winner: channel.currentWinner,
      timestamp: Date.now(),
    };
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
