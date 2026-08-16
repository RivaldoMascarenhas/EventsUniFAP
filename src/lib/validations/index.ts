import { z } from "zod";

// Authentication
export const loginSchema = z.object({
  email: z.string().email("Insira um e-mail válido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Event Schemas
export const eventSchema = z.object({
  name: z.string().min(3, "O nome do evento deve ter no mínimo 3 caracteres"),
  slug: z.string().min(3, "O slug deve ter no mínimo 3 caracteres").regex(/^[a-z0-9-]+$/, "O slug só pode conter letras minúsculas, números e hífens"),
  description: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  time: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  coverUrl: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "FINISHED", "ARCHIVED"]).default("DRAFT"),
  primaryColor: z.string().default("#002B49"),
  secondaryColor: z.string().default("#EAA023"),
  allowRepeatWinners: z.boolean().default(false),
  maxParticipants: z.number().int().positive().optional().nullable(),
  registrationOpenRule: z.enum(["IMMEDIATE", "1_HOUR_BEFORE", "2_HOURS_BEFORE", "ON_EVENT_START", "CUSTOM"]).default("IMMEDIATE"),
  registrationCustomOpensAt: z.string().optional().nullable(),
});

export type EventInput = z.infer<typeof eventSchema>;

// Sponsor Schemas
export const sponsorSchema = z.object({
  name: z.string().min(2, "O nome do patrocinador deve ter no mínimo 2 caracteres"),
  logoUrl: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  website: z.string().url("Insira uma URL válida").optional().or(z.literal("")).nullable(),
  instagram: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Insira um e-mail válido").optional().or(z.literal("")).nullable(),
  notes: z.string().optional().nullable(),
});

export type SponsorInput = z.infer<typeof sponsorSchema>;

// Prize Schemas
export const prizeSchema = z.object({
  eventId: z.string().uuid("ID do evento inválido"),
  sponsorId: z.string().uuid("ID do patrocinador inválido").optional().nullable(),
  name: z.string().min(2, "O nome do prêmio deve ter no mínimo 2 caracteres"),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  quantity: z.number().int().min(1, "A quantidade deve ser no mínimo 1").default(1),
  estimatedValue: z.number().min(0).optional().nullable(),
  order: z.number().int().default(0),
  status: z.enum(["AVAILABLE", "DRAWN", "CANCELLED"]).default("AVAILABLE"),
});

export type PrizeInput = z.infer<typeof prizeSchema>;

// Participant Schemas
export const participantSchema = z.object({
  eventId: z.string().uuid("ID do evento inválido"),
  name: z.string().min(3, "O nome deve ter no mínimo 3 caracteres"),
  cpf: z.string().optional().nullable(),
  registration: z.string().optional().nullable(),
  email: z.string().email("Insira um e-mail válido").optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  isEligible: z.boolean().default(true),
});

export type ParticipantInput = z.infer<typeof participantSchema>;

// Public Registration Schema (Mobile-first QR Code)
export const publicRegistrationSchema = z.object({
  eventId: z.string().uuid("ID do evento inválido"),
  name: z.string().min(3, "Nome completo é obrigatório (mínimo 3 caracteres)"),
  registration: z.string().min(3, "Matrícula ou CPF é obrigatório"),
  category: z.string().min(2, "Curso, Setor ou Categoria é obrigatório").default("Aluno de Graduação"),
  email: z.string().email("Insira um e-mail válido").optional().or(z.literal("")).nullable(),
  phone: z.string().optional().or(z.literal("")).nullable(),
});

export type PublicRegistrationInput = z.infer<typeof publicRegistrationSchema>;

// Draw Execution Schema
export const executeDrawSchema = z.object({
  eventId: z.string().uuid("ID do evento inválido"),
  prizeId: z.string().uuid("ID do prêmio inválido"),
  drawType: z.enum(["NUMBER", "NAME", "RANGE"]).default("NUMBER"),
  minNumber: z.number().int().min(1).default(1).optional(),
  maxNumber: z.number().int().min(1).default(100).optional(),
  notes: z.string().optional().nullable(),
});

export type ExecuteDrawInput = z.infer<typeof executeDrawSchema>;
