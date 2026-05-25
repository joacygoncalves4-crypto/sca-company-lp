"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Email ou senha inválidos.");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-[#080c10] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span
            className="font-black text-3xl tracking-widest text-white"
            style={{ fontFamily: "sans-serif" }}
          >
            SCA <span className="text-[#0057ff]">COMPANY</span>
          </span>
          <p className="text-[#8a9ab0] text-sm mt-2 tracking-wide uppercase">
            Painel CRM — Equipe de Vendas
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#111820] border border-[#1e2a38] rounded-xl p-8">
          <h1 className="text-white font-bold text-lg mb-6">Entrar no painel</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#c8d4e4] mb-1.5 tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#0d1117] border border-[#1e2a38] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#8a9ab0] focus:outline-none focus:border-[#0057ff] focus:ring-1 focus:ring-[#0057ff]/30"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#c8d4e4] mb-1.5 tracking-wide">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#0d1117] border border-[#1e2a38] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#8a9ab0] focus:outline-none focus:border-[#0057ff] focus:ring-1 focus:ring-[#0057ff]/30"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0057ff] hover:bg-[#0047d4] disabled:opacity-60 text-white font-bold text-sm tracking-widest uppercase rounded-lg py-3 transition-colors mt-2"
            >
              {loading ? "Entrando..." : "Acessar painel"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
