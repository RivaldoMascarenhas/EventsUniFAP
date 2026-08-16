"use client";

import React, { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";
import {
  KeyRound,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  LogOut,
} from "lucide-react";

export default function ChangePasswordPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const { success, error } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isLengthValid = newPassword.length >= 6;
  const isMatchValid = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isLengthValid) {
      setErrorMsg("A nova senha deve possuir pelo menos 6 caracteres.");
      return;
    }

    if (!isMatchValid) {
      setErrorMsg("A confirmação de senha não coincide com a nova senha digitada.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar senha.");

      // Update NextAuth session token
      await update({ mustChangePassword: false });

      success("Senha Definida com Sucesso!", "Sua senha pessoal foi atualizada. Bem-vindo(a)!");
      router.push("/admin/dashboard");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Ocorreu um erro ao salvar a nova senha.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-mesh-unifap flex items-center justify-center p-4 sm:p-6 selection:bg-unifap-gold selection:text-unifap-navy">
      <div className="w-full max-w-md">
        {/* Glass Container */}
        <div className="glass-panel rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/40 relative overflow-hidden">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-white border border-slate-200 mb-3 shadow-sm">
              <BrandLogo variant="default" width={180} height={46} priority />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold uppercase tracking-wider mb-2">
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              <span>Primeiro Acesso / Redefinição</span>
            </div>

            <h1 className="text-xl font-extrabold text-unifap-navy tracking-tight">
              Defina sua Nova Senha Pessoal
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Por políticas de segurança, é necessário criar uma senha pessoal antes de acessar o sistema.
            </p>
          </div>

          {/* User Badge */}
          {session?.user && (
            <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-unifap-navy text-white flex items-center justify-center font-black text-xs shrink-0">
                {session.user.name ? session.user.name.slice(0, 2).toUpperCase() : "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate">{session.user.name}</div>
                <div className="text-[11px] text-slate-500 truncate">{session.user.email}</div>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label required>Nova Senha</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  leftIcon={<Lock className="w-4 h-4" />}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label required>Confirmar Nova Senha</Label>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Repita a nova senha"
                leftIcon={<Lock className="w-4 h-4" />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {/* Password Validation Feedback */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-1.5 text-[11px]">
              <div className={`flex items-center gap-1.5 font-medium ${isLengthValid ? "text-emerald-600" : "text-slate-400"}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${isLengthValid ? "text-emerald-500" : "text-slate-300"}`} />
                <span>Pelo menos 6 caracteres</span>
              </div>
              <div className={`flex items-center gap-1.5 font-medium ${isMatchValid ? "text-emerald-600" : "text-slate-400"}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${isMatchValid ? "text-emerald-500" : "text-slate-300"}`} />
                <span>As duas senhas coincidem</span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
                disabled={!isLengthValid || !isMatchValid}
              >
                Salvar Nova Senha & Acessar
              </Button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair / Cancelar Acesso</span>
              </button>
            </div>
          </form>
        </div>

        {/* Security Notice */}
        <div className="mt-4 text-center text-xs text-blue-100 flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-unifap-gold" />
          <span>Sua nova senha é criptografada com algoritmo Argon2 / bcrypt</span>
        </div>
      </div>
    </div>
  );
}
