"use client";

import React, { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validations";
import { Lock, Mail, AlertCircle, Shield, Eye, EyeOff, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { cn } from "@/lib/utils";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin/dashboard";
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (res?.error) {
        setErrorMsg("E-mail institucional ou senha incorretos.");
        setIsLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setErrorMsg("Ocorreu um erro ao processar a autenticação. Tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md relative z-10">
      {/* Card Container */}
      <div className="glass-panel-dark rounded-3xl p-7 sm:p-9 shadow-2xl shadow-black/60 border border-white/15 relative overflow-hidden backdrop-blur-xl">
        {/* Top glowing ambient highlight line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-unifap-gold to-transparent opacity-75" />

        {/* Top Brand Header (Aligned with Institutional Branding) */}
        <div className="text-center mb-7 flex flex-col items-center">
          {/* Logo UniFAP Centralizado */}
          <div className="flex justify-center mb-3">
            <BrandLogo
              variant="white"
              width={220}
              height={54}
              priority
              className="h-9 sm:h-10 w-auto drop-shadow-md"
            />
          </div>

          {/* Badge Sorteios em baixo do Logo */}
          <div className="inline-flex items-center px-3.5 py-0.5 rounded-full bg-unifap-gold text-slate-950 shadow-md shadow-amber-500/25 border border-amber-300/40 select-none">
            <span className="text-[11px] sm:text-xs uppercase font-black tracking-widest">
              Sorteios
            </span>
          </div>

          <h1 className="text-sm sm:text-base font-semibold text-blue-100 tracking-wide mt-3">
            Painel Institucional de Gestão
          </h1>
          
          <div className="inline-flex items-center justify-center gap-2 mt-1.5 px-3 py-0.5 rounded-full bg-white/5 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-blue-200/75 font-normal tracking-wide">
              Acesso Restrito • Comissão & Operadores
            </span>
          </div>
        </div>

        {/* Subtle decorative separator */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent mb-6" />

        {/* Error Banner */}
        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-3 shadow-lg animate-in fade-in zoom-in-95 duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-100/90 mb-1.5">
              E-mail Institucional <span className="text-unifap-gold">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-blue-300/70 pointer-events-none flex items-center">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                placeholder="seu.nome@unifapce.edu.br"
                className={cn(
                  "flex h-11 w-full rounded-xl border border-white/15 bg-white/[0.07] pl-10 pr-3.5 py-2 text-sm text-white placeholder:text-slate-400/80 focus:outline-none focus:ring-2 focus:ring-unifap-gold/40 focus:border-unifap-gold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50",
                  errors.email && "border-rose-500/80 focus:ring-rose-500/40 focus:border-rose-500"
                )}
                {...register("email")}
              />
            </div>
            {errors.email?.message && (
              <p className="text-xs text-rose-400 mt-1 font-medium">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-100/90 mb-1.5">
              Senha de Acesso <span className="text-unifap-gold">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-blue-300/70 pointer-events-none flex items-center">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className={cn(
                  "flex h-11 w-full rounded-xl border border-white/15 bg-white/[0.07] pl-10 pr-11 py-2 text-sm text-white placeholder:text-slate-400/80 focus:outline-none focus:ring-2 focus:ring-unifap-gold/40 focus:border-unifap-gold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50",
                  errors.password && "border-rose-500/80 focus:ring-rose-500/40 focus:border-rose-500"
                )}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white transition rounded-lg hover:bg-white/10"
                title={showPassword ? "Ocultar senha" : "Ver senha"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password?.message && (
              <p className="text-xs text-rose-400 mt-1 font-medium">{errors.password.message}</p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center font-black tracking-wider rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-unifap-dark disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] bg-unifap-gold hover:bg-unifap-goldHover text-slate-950 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 border border-amber-400/60 text-sm py-3 px-4 uppercase gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0 text-slate-950" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <span>Entrar no Painel</span>
              )}
            </button>
          </div>
        </form>

        {/* Security Notice */}
        <div className="mt-7 pt-4 border-t border-white/10 text-center text-xs text-blue-200/80 flex items-center justify-center gap-1.5 font-medium">
          <Shield className="w-3.5 h-3.5 text-unifap-gold shrink-0" />
          <span>Ambiente seguro com criptografia e trilha de auditoria</span>
        </div>
      </div>

      {/* Footer institutional copyright & credits */}
      <div className="mt-6 text-center space-y-1 select-none">
        <p className="text-xs text-blue-200/75 font-medium tracking-wide">
          Centro Universitário Paraíso — UniFAP
        </p>
        <p className="text-[11px] text-blue-200/50 tracking-wide font-normal">
          Desenvolvido pelo Suporte de TI & Multimídia
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-mesh-unifap flex items-center justify-center p-4 sm:p-6 selection:bg-unifap-gold selection:text-slate-950 overflow-hidden">
      {/* Ambient background glow orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-unifap-blue/25 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-12 right-12 w-80 h-80 bg-unifap-gold/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-12 left-12 w-72 h-72 bg-unifap-light/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <Suspense fallback={<div className="text-white text-sm font-semibold">Carregando formulário...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
