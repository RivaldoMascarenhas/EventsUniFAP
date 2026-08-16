import { describe, it, expect } from "vitest";
import { realtimeService, RealtimePayload } from "../src/lib/services/realtimeService";

describe("Realtime Synchronization Service Tests", () => {
  it("should subscribe and receive immediate state:sync snapshot", () => {
    const eventId = "test-event-123";
    let receivedPayload: RealtimePayload | null = null;

    const unsubscribe = realtimeService.subscribe(eventId, (payload) => {
      receivedPayload = payload;
    });

    expect(receivedPayload).not.toBeNull();
    expect((receivedPayload as unknown as RealtimePayload)?.type).toBe("state:sync");
    expect((receivedPayload as unknown as RealtimePayload)?.eventId).toBe(eventId);

    unsubscribe();
  });

  it("should broadcast state changes to all subscribers in the event room", () => {
    const eventId = "test-event-room-456";
    const messages: RealtimePayload[] = [];

    const unsubscribe = realtimeService.subscribe(eventId, (payload) => {
      messages.push(payload);
    });

    // Operator triggers prize show
    realtimeService.publish(eventId, {
      type: "prize:show",
      eventId,
      state: "SHOWING_PRIZE",
      prizeId: "prize-1",
      prize: { name: "Notebook Dell" },
    });

    // Operator starts draw
    realtimeService.publish(eventId, {
      type: "draw:start",
      eventId,
      state: "DRAWING",
      prizeId: "prize-1",
    });

    expect(messages.length).toBe(3); // 1 state:sync + 2 published
    expect(messages[1].type).toBe("prize:show");
    expect(messages[1].state).toBe("SHOWING_PRIZE");
    expect(messages[2].type).toBe("draw:start");
    expect(messages[2].state).toBe("DRAWING");

    // Check state query snapshot
    const state = realtimeService.getState(eventId);
    expect(state.state).toBe("DRAWING");
    expect(state.prizeId).toBe("prize-1");

    unsubscribe();
  });
});
