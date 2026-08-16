import { prisma } from "@/lib/prisma";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { AuditAction } from "@/lib/types/enums";
import { AuditService } from "./auditService";

export interface ColumnMapping {
  name: string;
  registration?: string;
  cpf?: string;
  email?: string;
  phone?: string;
  category?: string;
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  value: string;
}

export interface ImportPreviewRow {
  rowNumber: number;
  name: string;
  registration?: string | null;
  cpf?: string | null;
  email?: string | null;
  phone?: string | null;
  category?: string | null;
  isValid: boolean;
  errors: string[];
}

export interface ImportPreviewResult {
  headers: string[];
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  previewRows: ImportPreviewRow[];
  errors: ImportError[];
  suggestedMapping: ColumnMapping;
}

export class ImportService {
  /**
   * Parses raw file content from CSV or XLSX Buffer
   */
  public static parseFile(fileBuffer: Buffer, fileName: string): { headers: string[]; data: Record<string, string>[] } {
    const isCsv = fileName.toLowerCase().endsWith(".csv");

    if (isCsv) {
      const csvText = fileBuffer.toString("utf-8");
      const parsed = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: (h) => h.trim(),
      });

      const headers = parsed.meta.fields || [];
      const data = parsed.data.map((row) => {
        const cleanRow: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          cleanRow[k] = typeof v === "string" ? v.trim() : String(v || "");
        }
        return cleanRow;
      });

      return { headers, data };
    } else {
      // Excel XLS / XLSX
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

      if (jsonData.length === 0) {
        return { headers: [], data: [] };
      }

      const rawHeaders = (jsonData[0] as unknown[]) || [];
      const headers = rawHeaders.map((h) => String(h || "").trim()).filter(Boolean);

      const data: Record<string, string>[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as unknown[];
        if (!row || row.every((cell) => cell === undefined || cell === null || String(cell).trim() === "")) {
          continue; // Skip empty row
        }

        const rowObj: Record<string, string> = {};
        headers.forEach((h, colIndex) => {
          const val = row[colIndex];
          rowObj[h] = val !== undefined && val !== null ? String(val).trim() : "";
        });
        data.push(rowObj);
      }

      return { headers, data };
    }
  }

  /**
   * Suggests best matching column headers
   */
  public static autoDetectColumns(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = { name: "" };

    const findMatch = (terms: string[]) => {
      return headers.find((h) => {
        const clean = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return terms.some((t) => clean.includes(t));
      });
    };

    mapping.name = findMatch(["nome", "participante", "aluno", "name"]) || headers[0] || "";
    mapping.registration = findMatch(["matricula", "registro", "codigo", "id", "ra", "inscricao"]);
    mapping.cpf = findMatch(["cpf", "documento"]);
    mapping.email = findMatch(["email", "e-mail", "correio"]);
    mapping.phone = findMatch(["telefone", "celular", "tel", "whatsapp", "fone", "phone"]);
    mapping.category = findMatch(["categoria", "curso", "tipo", "turma", "setor"]);

    return mapping;
  }

  /**
   * Validates and generates preview of rows with error feedback
   */
  public static async previewImport(
    eventId: string,
    fileBuffer: Buffer,
    fileName: string,
    customMapping?: ColumnMapping
  ): Promise<ImportPreviewResult> {
    const { headers, data } = this.parseFile(fileBuffer, fileName);
    const mapping = customMapping || this.autoDetectColumns(headers);

    // Fetch existing participants in this event for duplicate detection
    const existing = await prisma.participant.findMany({
      where: { eventId },
      select: { cpf: true, registration: true, email: true },
    });

    const existingCpfs = new Set(existing.map((p) => p.cpf).filter(Boolean));
    const existingRegs = new Set(existing.map((p) => p.registration).filter(Boolean));
    const existingEmails = new Set(existing.map((p) => p.email).filter(Boolean));

    const seenInBatchCpfs = new Set<string>();
    const seenInBatchRegs = new Set<string>();
    const seenInBatchEmails = new Set<string>();

    const previewRows: ImportPreviewRow[] = [];
    const errors: ImportError[] = [];

    data.forEach((row, idx) => {
      const rowNum = idx + 2; // +1 for 1-based, +1 for header row
      const name = mapping.name ? row[mapping.name] || "" : "";
      const reg = mapping.registration ? row[mapping.registration] || null : null;
      const rawCpf = mapping.cpf ? row[mapping.cpf] || null : null;
      const cleanCpf = rawCpf ? rawCpf.replace(/\D/g, "") : null;
      const rawEmail = mapping.email ? row[mapping.email] || null : null;
      const cleanEmail = rawEmail ? rawEmail.toLowerCase().trim() : null;
      const phone = mapping.phone ? row[mapping.phone] || null : null;
      const category = mapping.category ? row[mapping.category] || null : null;

      const rowErrors: string[] = [];

      // Validate Name
      if (!name || name.trim().length < 2) {
        const msg = "Nome é obrigatório (mínimo 2 caracteres)";
        rowErrors.push(msg);
        errors.push({ row: rowNum, field: "Nome", message: msg, value: name });
      }

      // Validate Email (if present)
      if (cleanEmail && !cleanEmail.includes("@")) {
        const msg = "E-mail inválido";
        rowErrors.push(msg);
        errors.push({ row: rowNum, field: "E-mail", message: msg, value: cleanEmail });
      }

      // Validate CPF duplicates
      if (cleanCpf) {
        if (existingCpfs.has(cleanCpf)) {
          const msg = "CPF já cadastrado neste evento";
          rowErrors.push(msg);
          errors.push({ row: rowNum, field: "CPF", message: msg, value: cleanCpf });
        } else if (seenInBatchCpfs.has(cleanCpf)) {
          const msg = "CPF duplicado na própria planilha";
          rowErrors.push(msg);
          errors.push({ row: rowNum, field: "CPF", message: msg, value: cleanCpf });
        } else {
          seenInBatchCpfs.add(cleanCpf);
        }
      }

      // Validate Registration duplicates
      if (reg) {
        if (existingRegs.has(reg)) {
          const msg = "Matrícula já cadastrada no evento";
          rowErrors.push(msg);
          errors.push({ row: rowNum, field: "Matrícula", message: msg, value: reg });
        } else if (seenInBatchRegs.has(reg)) {
          const msg = "Matrícula duplicada na planilha";
          rowErrors.push(msg);
          errors.push({ row: rowNum, field: "Matrícula", message: msg, value: reg });
        } else {
          seenInBatchRegs.add(reg);
        }
      }

      // Validate Email duplicates
      if (cleanEmail) {
        if (existingEmails.has(cleanEmail)) {
          const msg = "E-mail já cadastrado no evento";
          rowErrors.push(msg);
          errors.push({ row: rowNum, field: "E-mail", message: msg, value: cleanEmail });
        } else if (seenInBatchEmails.has(cleanEmail)) {
          const msg = "E-mail duplicado na planilha";
          rowErrors.push(msg);
          errors.push({ row: rowNum, field: "E-mail", message: msg, value: cleanEmail });
        } else {
          seenInBatchEmails.add(cleanEmail);
        }
      }

      previewRows.push({
        rowNumber: rowNum,
        name,
        registration: reg,
        cpf: cleanCpf,
        email: cleanEmail,
        phone,
        category,
        isValid: rowErrors.length === 0,
        errors: rowErrors,
      });
    });

    const validRowsCount = previewRows.filter((r) => r.isValid).length;
    const invalidRowsCount = previewRows.length - validRowsCount;

    return {
      headers,
      totalRows: previewRows.length,
      validRowsCount,
      invalidRowsCount,
      previewRows: previewRows.slice(0, 100), // Preview up to first 100 rows
      errors: errors.slice(0, 50),
      suggestedMapping: mapping,
    };
  }

  /**
   * Commits the valid rows into the database inside a transaction
   */
  public static async executeImport(params: {
    eventId: string;
    rows: {
      name: string;
      registration?: string | null;
      cpf?: string | null;
      email?: string | null;
      phone?: string | null;
      category?: string | null;
    }[];
    operatorId?: string;
  }) {
    const { eventId, rows, operatorId } = params;

    if (rows.length === 0) {
      throw new Error("Nenhum registro válido para importar.");
    }

    return await prisma.$transaction(async (tx) => {
      // Find current max ticket number
      const highest = await tx.participant.findFirst({
        where: { eventId },
        orderBy: { ticketNumber: "desc" },
        select: { ticketNumber: true },
      });

      let startNumber = (highest?.ticketNumber ?? 0) + 1;

      const dataToInsert = rows.map((r) => {
        const ticketNumber = startNumber++;
        return {
          eventId,
          name: r.name.trim(),
          registration: r.registration ? r.registration.trim() : null,
          cpf: r.cpf ? r.cpf.replace(/\D/g, "") : null,
          email: r.email ? r.email.toLowerCase().trim() : null,
          phone: r.phone ? r.phone.trim() : null,
          category: r.category ? r.category.trim() : "Geral",
          ticketNumber,
          isEligible: true,
        };
      });

      // Insert all participants
      const result = await tx.participant.createMany({
        data: dataToInsert,
      });

      // Audit log
      await AuditService.log({
        userId: operatorId,
        action: AuditAction.PARTICIPANT_IMPORTED,
        entity: "Participant",
        entityId: eventId,
        metadata: {
          importedCount: result.count,
          startTicket: (highest?.ticketNumber ?? 0) + 1,
          endTicket: startNumber - 1,
        },
      });

      return {
        importedCount: result.count,
        startTicket: (highest?.ticketNumber ?? 0) + 1,
        endTicket: startNumber - 1,
      };
    });
  }
}
