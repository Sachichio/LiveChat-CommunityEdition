"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShoppingBag,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Laptop,
  AlertTriangle
} from "lucide-react";

export default function WidgetSimulatorPage() {
  const params = useParams();
  const token = params?.token as string;
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (!token) return;

    // 1. Verifikasi keberadaan proyek dari backend
    fetch(`http://localhost:4000/api/widget/init?token=${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Proyek / Widget tidak ditemukan");
        }
        setProject(data.project);

        // 2. Jika valid, bersihkan script lama jika ada
        const existingScript = document.querySelector(`script[data-token="${token}"]`);
        if (existingScript) {
          existingScript.remove();
        }

        // 3. Pasang script widget.js secara dinamis
        const script = document.createElement("script");
        script.src = "http://localhost:4000/widget.js";
        script.setAttribute("data-token", token);
        script.defer = true;
        script.onload = () => {
          setScriptLoaded(true);
        };
        document.body.appendChild(script);
      })
      .catch((err) => {
        setError(err.message || "Proyek / Widget tidak ditemukan");
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      // Cleanup script & widget container saat keluar
      const script = document.querySelector(`script[data-token="${token}"]`);
      if (script) script.remove();
      const container = document.getElementById("livechat-widget-root") || document.getElementById("livechat-widget-container");
      if (container) container.remove();
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Memverifikasi status widget simulator...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
        <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Simulator Gagal: Widget Tidak Ditemukan</h1>
        <p className="text-sm text-slate-500 max-w-sm mb-6">
          {error || "Proyek atau widget ini tidak ditemukan di server. Ruang komunitas mungkin telah dihapus secara permanen oleh Admin."}
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/30"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* SIMULATOR NOTICE BAR */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white px-6 py-3 border-b border-indigo-700/50 shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px] tracking-wide uppercase">
              Simulasi Embed
            </span>
            <span className="text-slate-200">
              Menampilkan widget untuk ruang <strong>{project.name}</strong>. Perhatikan <strong>tombol chat bulat di pojok kanan bawah layar</strong>! 👇
            </span>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Dashboard Admin
          </Link>
        </div>
      </div>

      {/* DUMMY CLIENT WEBSITE CONTENT */}
      <nav className="bg-white border-b border-slate-200 py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900 text-lg">TokoOnlineKeren.id</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-600 font-medium">
            <span className="hover:text-indigo-600 cursor-pointer">Produk</span>
            <span className="hover:text-indigo-600 cursor-pointer">Promo</span>
            <span className="hover:text-indigo-600 cursor-pointer">Testimoni</span>
            <span className="hover:text-indigo-600 cursor-pointer">Tentang Kami</span>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="max-w-5xl mx-auto py-16 px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs rounded-full font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" /> Demo Live Chat: {project.name}
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Website Klien Anda Sedang Berjalan
        </h1>
        <p className="mt-4 text-slate-600 max-w-xl mx-auto text-base">
          Script widget untuk <strong>{project.name}</strong> telah disisipkan ke halaman ini. Cobalah klik <strong>ikon chat di pojok kanan bawah</strong> untuk mengirim pesan uji coba!
        </p>

        <div className="mt-8 flex justify-center gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 text-left">
            <Laptop className="w-8 h-8 text-indigo-600" />
            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">Status Widget</div>
              <div className="text-sm font-bold text-slate-900">
                {scriptLoaded ? "Aktif & Siap Digunakan ✅" : "Memuat Script..."}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* DUMMY PRODUCTS */}
      <section className="max-w-5xl mx-auto pb-24 px-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Produk Unggulan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((item) => (
            <div key={item} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow transition">
              <div className="h-44 bg-gradient-to-tr from-slate-100 to-indigo-50 flex items-center justify-center text-slate-400">
                <ShoppingBag className="w-12 h-12 stroke-1 text-slate-300" />
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-slate-900 text-base">Produk Demo #{item}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Pengunjung website ini dapat bertanya langsung ke Admin toko Anda melalui widget obrolan di pojok kanan.
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-bold text-indigo-600 text-sm">Rp 150.000</span>
                  <button className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium">
                    Beli
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 py-8 bg-white text-center text-xs text-slate-400">
        <p>&copy; {new Date().getFullYear()} TokoOnlineKeren.id (Simulasi Halaman Pihak Ketiga)</p>
      </footer>
    </div>
  );
}
