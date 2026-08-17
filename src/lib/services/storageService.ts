import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

export interface SaveFileResult {
  url: string;
  fileName: string;
  size: number;
}

export class StorageService {
  private static uploadDir = process.env.UPLOAD_DIR || "./public/uploads";

  /**
   * Helper to get Supabase client if configured
   */
  private static getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      return createClient(supabaseUrl, supabaseKey);
    }
    return null;
  }

  /**
   * Validates file size and MIME type
   */
  public static validateFile(
    file: { size: number; type: string },
    allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
    maxBytes = 5 * 1024 * 1024
  ) {
    if (file.size > maxBytes) {
      throw new Error(`O arquivo excede o tamanho máximo permitido de ${Math.round(maxBytes / (1024 * 1024))}MB.`);
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Tipo de arquivo não permitido (${file.type}). Use JPG, PNG, WebP ou SVG.`);
    }
  }

  /**
   * Saves uploaded file to Supabase Storage (Production) or local public storage (Development)
   */
  public static async saveFile(
    buffer: Buffer,
    originalName: string,
    subFolder: string = "general",
    mimeType?: string
  ): Promise<SaveFileResult> {
    const ext = (path.extname(originalName) || ".png").toLowerCase();

    // Prevent Stored XSS in SVG uploads
    if (ext === ".svg" || mimeType === "image/svg+xml") {
      const content = buffer.toString("utf-8").toLowerCase();
      if (
        content.includes("<script") ||
        content.includes("javascript:") ||
        content.includes("onload=") ||
        content.includes("onerror=") ||
        content.includes("onclick=") ||
        content.includes("xlink:href") ||
        content.includes("<foreignobject")
      ) {
        throw new Error("O arquivo SVG contém scripts ou elementos potencialmente perigosos e foi bloqueado por segurança.");
      }
    }

    const cleanSubFolder = subFolder.replace(/[^a-zA-Z0-9_-]/g, "") || "general";
    const cleanBase = path
      .basename(originalName, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-");
    const uniqueName = `${cleanBase}-${Date.now()}${ext}`;

    const supabase = this.getSupabaseClient();

    // 1. Supabase Storage Provider
    if (supabase) {
      const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "sorteios";
      const storagePath = `${cleanSubFolder}/${uniqueName}`;

      const { data, error } = await supabase.storage.from(bucketName).upload(storagePath, buffer, {
        contentType: mimeType || (ext === ".svg" ? "image/svg+xml" : ext === ".webp" ? "image/webp" : ext === ".png" ? "image/png" : "image/jpeg"),
        upsert: true,
      });

      if (error) {
        console.error("[Supabase Storage Error]:", error);
        throw new Error(`Erro ao enviar arquivo para o Supabase Storage: ${error.message}`);
      }

      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(storagePath);

      return {
        url: publicUrlData.publicUrl,
        fileName: uniqueName,
        size: buffer.length,
      };
    }

    // 2. Fallback to Local Storage (Development)
    const targetFolder = path.join(process.cwd(), this.uploadDir, subFolder);

    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const filePath = path.join(targetFolder, uniqueName);
    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${subFolder}/${uniqueName}`;
    return {
      url: publicUrl,
      fileName: uniqueName,
      size: buffer.length,
    };
  }
}

