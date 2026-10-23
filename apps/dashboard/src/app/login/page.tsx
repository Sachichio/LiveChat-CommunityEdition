"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Lock,
  ArrowLeft,
  KeyRound,
  AlertCircle
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (parseErr) {
        throw new Error("Gagal terhubung ke database server. Pastikan MySQL di Laragon sudah dinyalakan (Start All)!");
      }

      if (!res.ok) {
        throw new Error(data.error || "Email atau password yang Anda masukkan salah.");
      }

      // Validasi ketat role: hanya ADMIN & AGENT
      if (data.user.role !== "ADMIN" && data.user.role !== "AGENT") {
        throw new Error("Akses ditolak: Akun Anda bukan akun Admin.");
      }

      localStorage.setItem("livechat_token", data.token);
      localStorage.setItem("livechat_user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err: any) {
      if (err.message && err.message.includes("Failed to fetch")) {
        setError("Server backend (port 4000) belum berjalan. Silakan jalankan 'bun run dev:api' di terminal.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Background radial glow */}
      <div className="absolute w-[500px] h-[500px] -top-32 -left-32 bg-indigo-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] -bottom-32 -right-32 bg-sky-100/60 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white p-8 sm:p-9 rounded-[24px] shadow-[0_20px_50px_rgba(50,65,140,0.08)] border border-[#e7eaf2] relative z-10">
        
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Beranda
        </Link>

        {/* Header Branding */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="relative mb-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white bg-gradient-to-tr from-[#6688fb] to-[#5064ed] shadow-lg shadow-indigo-500/20">
              <MessageSquare className="w-6 h-6" strokeWidth={2.4} />
            </div>
            <span className="absolute bottom-1 right-1 w-3 h-3 bg-[#53d6a0] border-2 border-white rounded-full" />
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-extrabold tracking-tight text-[#1e2942]">
              Lobbio<span className="text-indigo-600">.</span>
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/80">
              Community Edition
            </span>
          </div>

          <h1 className="text-sm font-semibold text-slate-600 mt-2">
            Portal Admin Workspace &amp; Moderasi
          </h1>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2.5 leading-relaxed">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email Admin
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@email.com"
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#e2e6f0] focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-sm placeholder-slate-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#e2e6f0] focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-sm placeholder-slate-400 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5263e9] hover:bg-[#4054d9] text-white font-bold py-3 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 disabled:opacity-50 text-sm mt-3"
          >
            {loading ? "Memverifikasi..." : "Masuk ke Workspace"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Security Notice */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <KeyRound className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Pendaftaran admin publik dinonaktifkan demi keamanan.</span>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 text-indigo-500" /> Role-Guarded Access
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Super Admin
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="mt-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} Lobbio Community. Bagian dari ekosistem Lobbio.</p>
      </footer>
    </main>
  );
}
