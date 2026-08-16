export const AuditAction = {
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  EVENT_CREATED: "EVENT_CREATED",
  EVENT_UPDATED: "EVENT_UPDATED",
  EVENT_DELETED: "EVENT_DELETED",
  PRIZE_CREATED: "PRIZE_CREATED",
  PRIZE_UPDATED: "PRIZE_UPDATED",
  PRIZE_DELETED: "PRIZE_DELETED",
  SPONSOR_CREATED: "SPONSOR_CREATED",
  SPONSOR_UPDATED: "SPONSOR_UPDATED",
  SPONSOR_DELETED: "SPONSOR_DELETED",
  PARTICIPANT_IMPORTED: "PARTICIPANT_IMPORTED",
  PARTICIPANT_CREATED: "PARTICIPANT_CREATED",
  PARTICIPANT_UPDATED: "PARTICIPANT_UPDATED",
  PARTICIPANT_DELETED: "PARTICIPANT_DELETED",
  DRAW_STARTED: "DRAW_STARTED",
  DRAW_COMPLETED: "DRAW_COMPLETED",
  DRAW_CANCELLED: "DRAW_CANCELLED",
  WINNER_SELECTED: "WINNER_SELECTED",
  PRESENTATION_TOKEN_REVOKED: "PRESENTATION_TOKEN_REVOKED",
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  USER_DELETED: "USER_DELETED",
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const DrawType = {
  NUMBER: "NUMBER",
  NAME: "NAME",
  RANGE: "RANGE",
} as const;

export type DrawType = (typeof DrawType)[keyof typeof DrawType];

export const PrizeStatus = {
  AVAILABLE: "AVAILABLE",
  DRAWN: "DRAWN",
  CANCELLED: "CANCELLED",
} as const;

export type PrizeStatus = (typeof PrizeStatus)[keyof typeof PrizeStatus];

export const EventStatus = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  ACTIVE: "ACTIVE",
  FINISHED: "FINISHED",
  ARCHIVED: "ARCHIVED",
} as const;

export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

export const Role = {
  ADMIN: "ADMIN",
  OPERATOR: "OPERATOR",
  PRESENTER: "PRESENTER",
} as const;

export type Role = (typeof Role)[keyof typeof Role];
