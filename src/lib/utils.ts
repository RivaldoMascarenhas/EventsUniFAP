import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value?: number | null): string {
  if (value === null || value === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date?: Date | string | null): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date?: Date | string | null): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatCPF(cpf?: string | null): string {
  if (!cpf) return "-";
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function isValidCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false; // Reject repeated digits like 111.111.111-11

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10))) return false;

  return true;
}

export function maskCPF(cpf?: string | null): string {
  if (!cpf) return "-";
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})\d{3}\d{3}(\d{2})/, "$1.***.***-$2");
}

export function formatPhone(phone?: string | null): string {
  if (!phone) return "-";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return phone;
}

export function padNumber(num: number, length: number = 3): string {
  return String(num).padStart(length, "0");
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export interface EventRegistrationStatus {
  isOpen: boolean;
  reason?: string;
  opensAt?: Date | null;
  rule: string;
}

export function getEventRegistrationStatus(event: {
  status?: string | null;
  date?: Date | string | null;
  time?: string | null;
  registrationOpenRule?: string | null;
  registrationCustomOpensAt?: Date | string | null;
}): EventRegistrationStatus {
  if (event.status === "COMPLETED" || event.status === "CANCELLED") {
    return {
      isOpen: false,
      reason: "As inscrições para este evento foram encerradas.",
      rule: event.registrationOpenRule || "IMMEDIATE",
    };
  }

  const rule = event.registrationOpenRule || "IMMEDIATE";
  const now = new Date();

  if (rule === "IMMEDIATE") {
    return { isOpen: true, rule };
  }

  if (rule === "CUSTOM" && event.registrationCustomOpensAt) {
    const opensAt = new Date(event.registrationCustomOpensAt);
    if (now < opensAt) {
      return {
        isOpen: false,
        reason: `As inscrições abrirão em ${formatDateTime(opensAt)}.`,
        opensAt,
        rule,
      };
    }
    return { isOpen: true, opensAt, rule };
  }

  if (event.date) {
    const eventDateTime = new Date(event.date);
    if (event.time) {
      const parts = event.time.split(":");
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1] || "0", 10);
      if (!isNaN(hours) && !isNaN(minutes)) {
        eventDateTime.setHours(hours, minutes, 0, 0);
      }
    }

    let opensAt = new Date(eventDateTime);
    if (rule === "1_HOUR_BEFORE") {
      opensAt = new Date(eventDateTime.getTime() - 60 * 60 * 1000);
    } else if (rule === "2_HOURS_BEFORE") {
      opensAt = new Date(eventDateTime.getTime() - 2 * 60 * 60 * 1000);
    } else if (rule === "ON_EVENT_START") {
      opensAt = eventDateTime;
    }

    if (now < opensAt) {
      let label = "no início do evento";
      if (rule === "1_HOUR_BEFORE") label = "1 hora antes do início do evento";
      if (rule === "2_HOURS_BEFORE") label = "2 horas antes do início do evento";

      return {
        isOpen: false,
        reason: `As inscrições abrirão automaticamente ${label} (${formatDateTime(opensAt)}).`,
        opensAt,
        rule,
      };
    }

    return { isOpen: true, opensAt, rule };
  }

  return { isOpen: true, rule };
}

export function escapeHtml(unsafe?: string | null): string {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


