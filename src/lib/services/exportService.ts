import * as XLSX from "xlsx";
import Papa from "papaparse";
import { formatDate, formatDateTime, maskCPF, padNumber } from "@/lib/utils";

export interface WinnerExportItem {
  drawnNumber: number;
  winnerName: string;
  cpf?: string | null;
  registration?: string | null;
  email?: string | null;
  phone?: string | null;
  category?: string | null;
  prizeName: string;
  sponsorName?: string | null;
  drawDate: Date | string;
  operatorName?: string | null;
}

export interface ParticipantExportItem {
  ticketNumber: number;
  name: string;
  cpf?: string | null;
  registration?: string | null;
  email?: string | null;
  phone?: string | null;
  category?: string | null;
  isWinner?: boolean;
  isEligible?: boolean;
  registeredAt?: Date | string;
}

export class ExportService {
  /**
   * Generates CSV string for participants
   */
  public static generateParticipantsCsv(eventName: string, items: ParticipantExportItem[]): string {
    const data = items.map((item) => ({
      "Nº do Bilhete": padNumber(item.ticketNumber, 3),
      "Nome do Participante": item.name,
      "Matrícula": item.registration || "-",
      "CPF": maskCPF(item.cpf),
      "Curso / Categoria": item.category || "Geral",
      "E-mail": item.email || "-",
      "Telefone": item.phone || "-",
      "Status": item.isWinner ? "Sorteado (Ganhador)" : item.isEligible ? "Elegível" : "Inelegível",
      "Data de Inscrição": item.registeredAt ? formatDateTime(item.registeredAt) : "-",
    }));

    return Papa.unparse(data, { quotes: true });
  }

  /**
   * Generates Excel XLSX Buffer for participants
   */
  public static generateParticipantsXlsx(eventName: string, items: ParticipantExportItem[]): Buffer {
    const data = items.map((item) => ({
      "Nº Bilhete": item.ticketNumber,
      "Nome do Participante": item.name,
      "Matrícula": item.registration || "-",
      "CPF": maskCPF(item.cpf),
      "Curso / Categoria": item.category || "Geral",
      "E-mail": item.email || "-",
      "Telefone": item.phone || "-",
      "Status": item.isWinner ? "Sorteado" : item.isEligible ? "Elegível" : "Inelegível",
      "Data Inscrição": item.registeredAt ? formatDateTime(item.registeredAt) : "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    const colWidths = [
      { wch: 12 }, // Nº Bilhete
      { wch: 32 }, // Nome
      { wch: 16 }, // Matrícula
      { wch: 18 }, // CPF
      { wch: 22 }, // Curso / Categoria
      { wch: 28 }, // E-mail
      { wch: 16 }, // Telefone
      { wch: 16 }, // Status
      { wch: 20 }, // Data Inscrição
    ];
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Participantes");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    return Buffer.from(excelBuffer);
  }

  /**
   * Generates Institutional Printable HTML Report for participants
   */
  public static generateParticipantsPrintableHtml(
    eventName: string,
    eventDate: Date | string | null,
    items: ParticipantExportItem[],
    generatedAt: Date = new Date()
  ): string {
    const rowsHtml = items
      .map(
        (item, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
          <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-weight: bold; color: #002B49; text-align: center;">
            #${padNumber(item.ticketNumber, 3)}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #1E293B;">
            ${item.name}
            ${item.email ? `<div style="font-size: 11px; color: #64748B; font-weight: normal;">${item.email}</div>` : ''}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; color: #475569; font-mono: monospace;">
            ${item.registration || (item.cpf ? maskCPF(item.cpf) : '-')}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; color: #002B49; font-weight: 500;">
            ${item.category || 'Geral'}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: center;">
            ${
              item.isWinner
                ? '<span style="background: #FEF3C7; color: #92400E; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">★ Sorteado</span>'
                : '<span style="background: #DCFCE7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">Elegível</span>'
            }
          </td>
        </tr>
      `
      )
      .join("");

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Lista de Participantes - ${eventName} - UniFAP</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      margin: 0;
      padding: 32px;
      background: #FFFFFF;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 3px solid #002B49;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .logo-title {
      font-size: 24px;
      font-weight: 900;
      color: #002B49;
      letter-spacing: -0.5px;
    }
    .logo-title span { color: #EAA023; }
    .badge {
      background: #002B49;
      color: #FFFFFF;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .meta-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 24px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .meta-item label {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .meta-item div {
      font-size: 14px;
      font-weight: 600;
      color: #0F172A;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 40px;
      font-size: 12px;
    }
    th {
      background: #002B49;
      color: #FFFFFF;
      text-align: left;
      padding: 8px 10px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .footer {
      margin-top: 30px;
      border-top: 1px solid #E2E8F0;
      padding-top: 12px;
      font-size: 11px;
      color: #94A3B8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo-title">Uni<span>FAP</span> Sorteios</div>
      <div style="font-size: 13px; color: #005088; font-weight: 600; margin-top: 2px;">Centro Universitário Paraíso — Relação Oficial de Participantes</div>
    </div>
    <div>
      <span class="badge">Inscrições Oficiais</span>
    </div>
  </div>

  <div class="meta-box">
    <div class="meta-item">
      <label>Evento</label>
      <div>${eventName}</div>
    </div>
    <div class="meta-item">
      <label>Data do Evento</label>
      <div>${formatDate(eventDate)}</div>
    </div>
    <div class="meta-item">
      <label>Total de Inscritos</label>
      <div>${items.length} participante(s)</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align: center; width: 90px;">Nº Bilhete</th>
        <th>Nome do Participante</th>
        <th>Matrícula / CPF</th>
        <th>Curso / Categoria</th>
        <th style="text-align: center; width: 100px;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="5" style="text-align: center; padding: 24px; color: #64748B;">Nenhum participante cadastrado para este evento.</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    Lista gerada pelo sistema UniFAP Sorteios em ${formatDateTime(generatedAt)} — Centro Universitário Paraíso.
  </div>

  <div class="no-print" style="margin-top: 32px; text-align: center;">
    <button onclick="window.print()" style="background: #002B49; color: #FFFFFF; border: none; padding: 12px 24px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 14px;">
      🖨️ Imprimir / Salvar Lista como PDF
    </button>
  </div>
</body>
</html>`;
  }
  /**
   * Generates CSV string for winners
   */
  public static generateWinnersCsv(eventName: string, items: WinnerExportItem[]): string {
    const data = items.map((item) => ({
      "Nº do Bilhete": padNumber(item.drawnNumber, 3),
      "Ganhador": item.winnerName,
      "CPF": maskCPF(item.cpf),
      "Matrícula": item.registration || "-",
      "E-mail": item.email || "-",
      "Telefone": item.phone || "-",
      "Categoria": item.category || "-",
      "Prêmio": item.prizeName,
      "Patrocinador": item.sponsorName || "UniFAP",
      "Data/Hora do Sorteio": formatDateTime(item.drawDate),
      "Operador Responsável": item.operatorName || "Sistema",
    }));

    return Papa.unparse(data, { quotes: true });
  }

  /**
   * Generates Excel XLSX Buffer for winners
   */
  public static generateWinnersXlsx(eventName: string, items: WinnerExportItem[]): Buffer {
    const data = items.map((item) => ({
      "Nº Bilhete": item.drawnNumber,
      "Nome do Ganhador": item.winnerName,
      "CPF": maskCPF(item.cpf),
      "Matrícula": item.registration || "-",
      "E-mail": item.email || "-",
      "Telefone": item.phone || "-",
      "Categoria": item.category || "-",
      "Prêmio Conquistado": item.prizeName,
      "Patrocínio": item.sponsorName || "UniFAP",
      "Data e Hora": formatDateTime(item.drawDate),
      "Operador": item.operatorName || "Sistema",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Auto column widths
    const colWidths = [
      { wch: 12 }, // Nº Bilhete
      { wch: 30 }, // Nome
      { wch: 18 }, // CPF
      { wch: 16 }, // Matrícula
      { wch: 28 }, // E-mail
      { wch: 16 }, // Telefone
      { wch: 16 }, // Categoria
      { wch: 28 }, // Prêmio
      { wch: 22 }, // Patrocínio
      { wch: 20 }, // Data e Hora
      { wch: 20 }, // Operador
    ];
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vencedores");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    return Buffer.from(excelBuffer);
  }

  /**
   * Generates Institutional Printable HTML Report (suitable for browser printing / PDF saving)
   */
  public static generatePrintableHtmlReport(
    eventName: string,
    eventDate: Date | string | null,
    items: WinnerExportItem[],
    generatedAt: Date = new Date()
  ): string {
    const rowsHtml = items
      .map(
        (item, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
          <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-weight: bold; color: #002B49; text-align: center;">
            #${padNumber(item.drawnNumber, 3)}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #1E293B;">
            ${item.winnerName}
            <div style="font-size: 11px; color: #64748B; font-weight: normal;">${item.registration ? `Matrícula: ${item.registration}` : ''} ${item.cpf ? `• CPF: ${maskCPF(item.cpf)}` : ''}</div>
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; color: #002B49; font-weight: 600;">
            ${item.prizeName}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; color: #475569;">
            ${item.sponsorName || '<span style="color: #EAA023; font-weight: 600;">UniFAP</span>'}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; color: #64748B; font-size: 12px; text-align: right;">
            ${formatDateTime(item.drawDate)}
          </td>
        </tr>
      `
      )
      .join("");

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Ata de Resultados - ${eventName} - UniFAP Sorteios</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      margin: 0;
      padding: 32px;
      background: #FFFFFF;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 3px solid #002B49;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .logo-title {
      font-size: 26px;
      font-weight: 900;
      color: #002B49;
      letter-spacing: -0.5px;
    }
    .logo-title span { color: #EAA023; }
    .badge {
      background: #002B49;
      color: #FFFFFF;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .meta-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 24px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .meta-item label {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .meta-item div {
      font-size: 14px;
      font-weight: 600;
      color: #0F172A;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 40px;
    }
    th {
      background: #002B49;
      color: #FFFFFF;
      text-align: left;
      padding: 10px 12px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .signatures {
      margin-top: 60px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 48px;
      page-break-inside: avoid;
    }
    .sig-line {
      border-top: 1px solid #94A3B8;
      padding-top: 8px;
      text-align: center;
      font-size: 13px;
      color: #334155;
    }
    .footer {
      margin-top: 40px;
      border-top: 1px solid #E2E8F0;
      padding-top: 12px;
      font-size: 11px;
      color: #94A3B8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo-title">Uni<span>FAP</span> Sorteios</div>
      <div style="font-size: 13px; color: #005088; font-weight: 600; margin-top: 2px;">Centro Universitário Paraíso — Relatório Oficial de Resultados</div>
    </div>
    <div>
      <span class="badge">Documento Oficial</span>
    </div>
  </div>

  <div class="meta-box">
    <div class="meta-item">
      <label>Evento</label>
      <div>${eventName}</div>
    </div>
    <div class="meta-item">
      <label>Data do Evento</label>
      <div>${formatDate(eventDate)}</div>
    </div>
    <div class="meta-item">
      <label>Total de Sorteados</label>
      <div>${items.length} contemplado(s)</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align: center; width: 100px;">Nº Bilhete</th>
        <th>Ganhador</th>
        <th>Prêmio</th>
        <th>Patrocínio</th>
        <th style="text-align: right;">Data / Hora</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="5" style="text-align: center; padding: 24px; color: #64748B;">Nenhum sorteio registrado para este evento.</td></tr>'}
    </tbody>
  </table>

  <div class="signatures">
    <div>
      <div class="sig-line">
        <strong>Comissão Organizadora / Operador</strong><br />
        Centro Universitário Paraíso — UniFAP
      </div>
    </div>
    <div>
      <div class="sig-line">
        <strong>Auditoria e Conformidade</strong><br />
        UniFAP Sorteios
      </div>
    </div>
  </div>

  <div class="footer">
    Relatório emitido automaticamente pelo sistema UniFAP Sorteios em ${formatDateTime(generatedAt)} — Autenticidade institucional garantida por hash de auditoria interna.
  </div>

  <div class="no-print" style="margin-top: 32px; text-align: center;">
    <button onclick="window.print()" style="background: #002B49; color: #FFFFFF; border: none; padding: 12px 24px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 14px;">
      🖨️ Imprimir / Salvar como PDF
    </button>
  </div>
</body>
</html>`;
  }
}
