"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validations";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Lock, Mail, AlertCircle, Shield, KeyRound } from "lucide-react";

import { BrandLogo } from "@/components/branding/BrandLogo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin/dashboard";
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
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

  const setDevCredentials = (email: string, pass: string) => {
    setValue("email", email);
    setValue("password", pass);
  };

  return (
    <div className="w-full max-w-md">
      {/* Card Container */}
      <div className="glass-panel rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/40 relative overflow-hidden">
        {/* Top Brand Indicator */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-white border border-slate-200 mb-4 shadow-sm">
            <BrandLogo variant="default" width={200} height={52} priority />
          </div>
          <h1 className="text-2xl font-extrabold text-unifap-navy tracking-tight">
            Uni<span className="text-unifap-gold">FAP</span> Sorteios
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Acesso restrito à comissão organizadora e operadores
          </p>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label required>E-mail Institucional</Label>
            <Input
              type="email"
              placeholder="seu.nome@unifapce.edu.br"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register("email")}
            />
          </div>

          <div>
            <Label required>Senha de Acesso</Label>
            <Input
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register("password")}
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Entrar no Sistema
            </Button>
          </div>
        </form>

        {/* Quick Dev Credentials Helper */}
        <div className="mt-8 pt-6 border-t border-slate-200/80">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
            <KeyRound className="w-3.5 h-3.5 text-unifap-gold" />
            <span>Credenciais de Demonstração (Seed):</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDevCredentials("admin@unifap.local", "Admin123!")}
              className="text-left p-2.5 rounded-xl border border-slate-200 bg-white/70 hover:bg-white text-xs text-slate-700 transition hover:border-unifap-navy group"
            >
              <div className="font-bold text-unifap-navy group-hover:text-unifap-blue">Admin</div>
              <div className="text-[10px] text-slate-500">admin@unifap.local</div>
            </button>

            <button
              type="button"
              onClick={() => setDevCredentials("operador@unifap.local", "Operador123!")}
              className="text-left p-2.5 rounded-xl border border-slate-200 bg-white/70 hover:bg-white text-xs text-slate-700 transition hover:border-unifap-navy group"
            >
              <div className="font-bold text-unifap-navy group-hover:text-unifap-blue">Operador</div>
              <div className="text-[10px] text-slate-500">operador@unifap.local</div>
            </button>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="mt-6 text-center text-xs text-blue-100 flex items-center justify-center gap-1.5 font-medium">
        <Shield className="w-3.5 h-3.5 text-unifap-gold" />
        <span>Ambiente protegido com criptografia e trilha de auditoria</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-mesh-unifap flex items-center justify-center p-4 sm:p-6 selection:bg-unifap-gold selection:text-unifap-navy">
      <Suspense fallback={<div className="text-white text-sm font-semibold">Carregando formulário...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
