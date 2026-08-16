import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ArrowRight, Sparkles, Calendar, Users, Trophy, ExternalLink, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { BrandLogo } from "@/components/branding/BrandLogo";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let activeEvents: any[] = [];
  try {
    activeEvents = await prisma.event.findMany({
      where: { status: "ACTIVE" },
      include: {
        _count: {
          select: { participants: true, prizes: true, winners: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    activeEvents = [];
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col justify-between selection:bg-unifap-gold selection:text-unifap-dark">
      {/* Header */}
      <header className="border-b border-white/10 bg-unifap-navy/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo variant="white" width={240} height={56} priority />
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-unifap-gold hover:bg-unifap-goldHover text-unifap-dark font-bold text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <span>Acessar Painel</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 bg-mesh-presentation flex-1 flex flex-col justify-center">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-unifap-light/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-unifap-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-unifap-goldLight mb-8 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-unifap-gold" />
            <span>Sistema Institucional de Sorteios & Premiações</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight mb-6">
            Sorteios Oficiais da <span className="text-unifap-gold">UniFAP</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            Plataforma oficial de premiações para conferências, semanas acadêmicas, vestibulares e eventos institucionais do Centro Universitário Paraíso.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-unifap-gold hover:bg-unifap-goldHover text-unifap-dark font-bold text-base shadow-xl shadow-amber-500/25 transition-all hover:scale-105 active:scale-95"
            >
              <span>Entrar como Operador / Gestor</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="https://unifapce.edu.br"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-base transition-all backdrop-blur-md"
            >
              <span>Portal UniFAP</span>
              <ExternalLink className="w-4 h-4 text-slate-300" />
            </a>
          </div>
        </div>

        {/* Active Events Carousel / Cards */}
        <div className="max-w-6xl mx-auto px-6 mt-20 w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-unifap-gold" />
              <span>Eventos Institucionais Ativos</span>
            </h2>
          </div>

          {activeEvents.length === 0 ? (
            <div className="p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md text-center">
              <p className="text-sm text-slate-400">
                Nenhum evento em andamento no momento. Acesse o painel administrativo para criar ou agendar eventos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-6 flex flex-col justify-between hover:border-unifap-gold/50 transition-all hover:bg-white/15 group shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        ● Em Andamento
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {formatDate(ev.date)}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white group-hover:text-unifap-gold transition-colors">
                      {ev.name}
                    </h3>
                    <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                      {ev.description || "Evento oficial da UniFAP."}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-blue-300" />
                        {ev._count.participants} inscritos
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-unifap-gold" />
                        {ev._count.prizes} prêmios
                      </span>
                    </div>

                    <Link
                      href={`/public/event/${ev.slug}`}
                      className="px-3 py-1.5 rounded-lg bg-unifap-navy hover:bg-unifap-blue text-xs font-bold text-white border border-unifap-light/40 transition"
                    >
                      Inscrever-se
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-unifap-darker/90 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-unifap-gold" />
            <span>Centro Universitário Paraíso — UniFAP • Juazeiro do Norte - Ceará</span>
          </div>
          <div>
            Desenvolvido com tecnologia e integridade institucional para a comunidade acadêmica.
          </div>
        </div>
      </footer>
    </main>
  );
}
