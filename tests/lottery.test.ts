import { describe, it, expect } from "vitest";
import { LotteryService } from "../src/lib/services/lotteryService";

describe("LotteryService Unit Tests", () => {
  it("should generate random index within valid bounds [0, max-1]", () => {
    const max = 50;
    for (let i = 0; i < 100; i++) {
      const idx = LotteryService.getRandomIndex(max);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(max);
      expect(Number.isInteger(idx)).toBe(true);
    }
  });

  it("should throw error if max is zero or negative", () => {
    expect(() => LotteryService.getRandomIndex(0)).toThrow("Intervalo inválido para sorteio");
    expect(() => LotteryService.getRandomIndex(-5)).toThrow("Intervalo inválido para sorteio");
  });

  it("should filter out non-eligible participants correctly", () => {
    const mockParticipants = [
      { id: "1", name: "Alice", ticketNumber: 101, isEligible: true, isWinner: false, status: "ACTIVE" },
      { id: "2", name: "Bob", ticketNumber: 102, isEligible: false, isWinner: false, status: "ACTIVE" },
      { id: "3", name: "Charlie", ticketNumber: 103, isEligible: true, isWinner: false, status: "INACTIVE" },
      { id: "4", name: "Diana", ticketNumber: 104, isEligible: true, isWinner: false, status: "ACTIVE" },
    ];

    const eligible = mockParticipants.filter((p) => p.isEligible && p.status === "ACTIVE");
    expect(eligible.length).toBe(2);
    expect(eligible.map((p) => p.name)).toEqual(["Alice", "Diana"]);
  });

  it("should filter out past winners when allowRepeatWinners is false", () => {
    const mockParticipants = [
      { id: "1", name: "Alice", ticketNumber: 101, isEligible: true, isWinner: true, status: "ACTIVE" },
      { id: "2", name: "Bob", ticketNumber: 102, isEligible: true, isWinner: false, status: "ACTIVE" },
      { id: "3", name: "Diana", ticketNumber: 104, isEligible: true, isWinner: false, status: "ACTIVE" },
    ];

    const allowRepeatWinners = false;
    const candidates = mockParticipants.filter(
      (p) => p.isEligible && p.status === "ACTIVE" && (!allowRepeatWinners ? !p.isWinner : true)
    );

    expect(candidates.length).toBe(2);
    expect(candidates.map((p) => p.name)).toEqual(["Bob", "Diana"]);
  });

  it("should calculate available numbers in range without repeating previously drawn numbers", () => {
    const min = 1;
    const max = 10;
    const alreadyDrawn = new Set([3, 7, 9]);

    const availablePool: number[] = [];
    for (let i = min; i <= max; i++) {
      if (!alreadyDrawn.has(i)) {
        availablePool.push(i);
      }
    }

    expect(availablePool.length).toBe(7);
    expect(availablePool).toEqual([1, 2, 4, 5, 6, 8, 10]);
    expect(availablePool.includes(3)).toBe(false);
    expect(availablePool.includes(7)).toBe(false);
    expect(availablePool.includes(9)).toBe(false);
  });

  it("should include past winners when allowRepeatWinners is true", () => {
    const mockParticipants = [
      { id: "1", name: "Alice", ticketNumber: 101, isEligible: true, isWinner: true, status: "ACTIVE" },
      { id: "2", name: "Bob", ticketNumber: 102, isEligible: true, isWinner: false, status: "ACTIVE" },
    ];

    const allowRepeatWinners = true;
    const candidates = mockParticipants.filter(
      (p) => p.isEligible && p.status === "ACTIVE" && (!allowRepeatWinners ? !p.isWinner : true)
    );

    expect(candidates.length).toBe(2);
  });

  it("should draw random available tickets within maxParticipants range without collisions", () => {
    const maxParticipants = 100;
    const usedTickets = new Set<number>([1, 2, 3, 50, 99]);

    const available: number[] = [];
    for (let i = 1; i <= maxParticipants; i++) {
      if (!usedTickets.has(i)) {
        available.push(i);
      }
    }

    expect(available.length).toBe(95);
    expect(available.includes(1)).toBe(false);
    expect(available.includes(50)).toBe(false);

    // Pick 10 random tickets
    const picked: number[] = [];
    for (let j = 0; j < 10; j++) {
      const idx = LotteryService.getRandomIndex(available.length);
      const ticket = available[idx];
      expect(ticket).toBeGreaterThanOrEqual(1);
      expect(ticket).toBeLessThanOrEqual(100);
      expect(usedTickets.has(ticket)).toBe(false);
      picked.push(ticket);
    }
    expect(picked.length).toBe(10);
  });
});
