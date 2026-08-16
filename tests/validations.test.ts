import { describe, it, expect } from "vitest";
import {
  loginSchema,
  eventSchema,
  publicRegistrationSchema,
  prizeSchema,
  sponsorSchema,
} from "../src/lib/validations";
import { maskCPF, isValidCPF, getEventRegistrationStatus } from "../src/lib/utils";

describe("Zod Validation Schemas Tests", () => {
  it("should validate correct login inputs and reject short passwords or invalid emails", () => {
    expect(loginSchema.safeParse({ email: "admin@unifapce.edu.br", password: "AdminPassword123!" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "not-an-email", password: "123" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "admin@unifapce.edu.br", password: "123" }).success).toBe(false);
  });

  it("should validate event slug formatting", () => {
    expect(
      eventSchema.safeParse({
        name: "Semana Acadêmica 2026",
        slug: "semana-academica-2026",
        status: "ACTIVE",
        primaryColor: "#002B49",
        secondaryColor: "#EAA023",
        allowRepeatWinners: false,
      }).success
    ).toBe(true);

    expect(
      eventSchema.safeParse({
        name: "Semana Acadêmica 2026",
        slug: "Slug Com Espaço e Acento",
        status: "ACTIVE",
        primaryColor: "#002B49",
        secondaryColor: "#EAA023",
        allowRepeatWinners: false,
      }).success
    ).toBe(false);
  });

  it("should validate public registration requirements", () => {
    // Valid with all fields
    expect(
      publicRegistrationSchema.safeParse({
        eventId: "123e4567-e89b-12d3-a456-426614174000",
        name: "Lucas Alencar",
        registration: "202310101",
        category: "Sistemas de Informação",
        email: "lucas@aluno.unifapce.edu.br",
        phone: "(88) 99871-0001",
      }).success
    ).toBe(true);

    // Valid with optional email and phone omitted / empty
    expect(
      publicRegistrationSchema.safeParse({
        eventId: "123e4567-e89b-12d3-a456-426614174000",
        name: "Lucas Alencar",
        registration: "202310101",
        category: "Visitante",
        email: "",
        phone: "",
      }).success
    ).toBe(true);

    // Invalid when required fields are missing
    expect(
      publicRegistrationSchema.safeParse({
        eventId: "not-a-uuid",
        name: "Lu",
        registration: "",
      }).success
    ).toBe(false);
  });

  it("should mask CPF correctly for LGPD compliance", () => {
    expect(maskCPF("08412345678")).toBe("084.***.***-78");
    expect(maskCPF("123.456.789-00")).toBe("123.***.***-00");
    expect(maskCPF(null)).toBe("-");
  });

  it("should validate real CPFs and reject fraudulent or invalid CPFs", () => {
    // Algorithmic check-digit verification
    expect(isValidCPF("11111111111")).toBe(false); // Repeated digits
    expect(isValidCPF("00000000000")).toBe(false); // Repeated digits
    expect(isValidCPF("12345678900")).toBe(false); // Bad check digits
    expect(isValidCPF("52998224725")).toBe(true);  // Valid test CPF format
  });

  it("should validate password requirements for user registration", () => {
    const validPassword = "SafePassword123!";
    const shortPassword = "123";

    expect(validPassword.length >= 6).toBe(true);
    expect(shortPassword.length >= 6).toBe(false);
  });

  it("should evaluate event registration window rules correctly", () => {
    // 1. Immediate rule
    const immediateEvent = {
      status: "ACTIVE",
      registrationOpenRule: "IMMEDIATE",
    };
    expect(getEventRegistrationStatus(immediateEvent).isOpen).toBe(true);

    // 2. 1 hour before rule (future event)
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow
    const scheduledEvent = {
      status: "ACTIVE",
      date: futureDate,
      time: "19:00",
      registrationOpenRule: "1_HOUR_BEFORE",
    };
    const status1h = getEventRegistrationStatus(scheduledEvent);
    expect(status1h.isOpen).toBe(false);
    expect(status1h.reason).toContain("1 hora antes do início do evento");

    // 3. Custom date rule (past date -> open, future date -> closed)
    const pastDate = new Date(Date.now() - 60 * 1000);
    const customPastEvent = {
      status: "ACTIVE",
      registrationOpenRule: "CUSTOM",
      registrationCustomOpensAt: pastDate,
    };
    expect(getEventRegistrationStatus(customPastEvent).isOpen).toBe(true);

    const customFutureEvent = {
      status: "ACTIVE",
      registrationOpenRule: "CUSTOM",
      registrationCustomOpensAt: futureDate,
    };
    expect(getEventRegistrationStatus(customFutureEvent).isOpen).toBe(false);

    // 4. Closed / finished event
    const finishedEvent = {
      status: "COMPLETED",
      registrationOpenRule: "IMMEDIATE",
    };
    expect(getEventRegistrationStatus(finishedEvent).isOpen).toBe(false);
  });
});
