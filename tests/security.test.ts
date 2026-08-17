import { describe, it, expect, beforeEach } from "vitest";
import { escapeHtml, maskCPF } from "../src/lib/utils";
import { ExportService } from "../src/lib/services/exportService";
import { rateLimiter } from "../src/lib/security/rateLimiter";

describe("Security & Sanitization Tests", () => {
  describe("escapeHtml", () => {
    it("should escape HTML characters properly", () => {
      const malicious = '<script>alert("xss")</script>';
      const escaped = escapeHtml(malicious);
      expect(escaped).toBe("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
      expect(escaped.includes("<script>")).toBe(false);
    });

    it("should handle null and undefined safely", () => {
      expect(escapeHtml(null)).toBe("");
      expect(escapeHtml(undefined)).toBe("");
      expect(escapeHtml("")).toBe("");
    });

    it("should escape quotes and ampersands", () => {
      expect(escapeHtml("Tom & Jerry's \"Show\"")).toBe("Tom &amp; Jerry&#039;s &quot;Show&quot;");
    });
  });

  describe("ExportService XSS Protection", () => {
    it("should escape malicious participant inputs in printable HTML", () => {
      const maliciousItems = [
        {
          ticketNumber: 1,
          name: '<img src=x onerror=alert("hacked")>',
          email: '<script>alert("email")</script>',
          registration: '<b onmouseover=alert(1)>2023001</b>',
          category: '<svg onload=alert(2)>',
          isWinner: false,
          isEligible: true,
        },
      ];

      const html = ExportService.generateParticipantsPrintableHtml(
        "<script>Evento Inseguro</script>",
        new Date(),
        maliciousItems
      );

      expect(html.includes("<script>alert")).toBe(false);
      expect(html.includes("<img src=x onerror")).toBe(false);
      expect(html.includes("&lt;img src=x onerror=alert(&quot;hacked&quot;)&gt;")).toBe(true);
      expect(html.includes("&lt;script&gt;Evento Inseguro&lt;/script&gt;")).toBe(true);
    });

    it("should escape malicious winner inputs in printable report", () => {
      const maliciousWinners = [
        {
          drawnNumber: 1,
          winnerName: '<script>alert("winner")</script>',
          registration: '<b>202401</b>',
          cpf: "12345678901",
          prizeName: '<marquee>Notebook Gamer</marquee>',
          sponsorName: '<div onclick=steal()>Sponsor</div>',
          drawDate: new Date(),
        },
      ];

      const html = ExportService.generatePrintableHtmlReport(
        "Evento Oficial",
        new Date(),
        maliciousWinners
      );

      expect(html.includes("<script>alert")).toBe(false);
      expect(html.includes("<marquee>")).toBe(false);
      expect(html.includes("&lt;script&gt;alert(&quot;winner&quot;)&lt;/script&gt;")).toBe(true);
      expect(html.includes("&lt;marquee&gt;Notebook Gamer&lt;/marquee&gt;")).toBe(true);
      expect(html.includes("&lt;div onclick=steal()&gt;Sponsor&lt;/div&gt;")).toBe(true);
    });
  });

  describe("maskCPF Utility", () => {
    it("should mask intermediate digits of 11-digit CPFs", () => {
      expect(maskCPF("12345678901")).toBe("123.***.***-01");
      expect(maskCPF("123.456.789-01")).toBe("123.***.***-01");
    });

    it("should handle null and non-11 digits gracefully", () => {
      expect(maskCPF(null)).toBe("-");
      expect(maskCPF(undefined)).toBe("-");
      expect(maskCPF("12345")).toBe("12345");
    });
  });

  describe("RateLimiter Durability", () => {
    beforeEach(() => {
      rateLimiter.reset();
    });

    it("should allow requests up to limit and block afterwards", () => {
      const ip = "192.168.1.50";
      for (let i = 0; i < 5; i++) {
        const res = rateLimiter.check(ip, 5, 60000);
        expect(res.allowed).toBe(true);
      }

      const blockedRes = rateLimiter.check(ip, 5, 60000);
      expect(blockedRes.allowed).toBe(false);
      expect(blockedRes.remaining).toBe(0);
    });

    it("should allow other IPs independently", () => {
      const ipA = "10.0.0.1";
      const ipB = "10.0.0.2";

      for (let i = 0; i < 3; i++) {
        rateLimiter.check(ipA, 3, 60000);
      }
      expect(rateLimiter.check(ipA, 3, 60000).allowed).toBe(false);
      expect(rateLimiter.check(ipB, 3, 60000).allowed).toBe(true);
    });
  });
});
