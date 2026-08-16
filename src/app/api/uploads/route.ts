import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { StorageService } from "@/lib/services/storageService";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    StorageService.validateFile(file);

    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await StorageService.saveFile(buffer, file.name, folder, file.type);

    return NextResponse.json(saved, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/uploads]", error);
    return NextResponse.json({ error: error.message || "Erro no upload" }, { status: 400 });
  }
}
