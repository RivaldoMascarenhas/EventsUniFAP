import { describe, it, expect } from "vitest";
import { ImportService } from "../src/lib/services/importService";

describe("ImportService Unit Tests", () => {
  it("should parse CSV buffer correctly into rows and headers", () => {
    const csvContent = "Nome,Matricula,CPF,Email\nJoão Silva,2023001,12345678901,joao@unifapce.edu.br\nMaria Santos,2023002,98765432100,maria@unifapce.edu.br";
    const buffer = Buffer.from(csvContent, "utf-8");

    const parsed = ImportService.parseFile(buffer, "participantes.csv");

    expect(parsed.headers).toEqual(["Nome", "Matricula", "CPF", "Email"]);
    expect(parsed.data.length).toBe(2);
    expect(parsed.data[0]["Nome"]).toBe("João Silva");
    expect(parsed.data[1]["Nome"]).toBe("Maria Santos");
  });

  it("should auto-detect standard academic column names", () => {
    const headers = ["Nome Completo", "Matrícula do Aluno", "Documento CPF", "E-mail Institucional", "Telefone/WhatsApp", "Curso"];
    const mapping = ImportService.autoDetectColumns(headers);

    expect(mapping.name).toBe("Nome Completo");
    expect(mapping.registration).toBe("Matrícula do Aluno");
    expect(mapping.cpf).toBe("Documento CPF");
    expect(mapping.email).toBe("E-mail Institucional");
    expect(mapping.phone).toBe("Telefone/WhatsApp");
    expect(mapping.category).toBe("Curso");
  });
});
