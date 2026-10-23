"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Code2,
  Globe2,
  Headphones,
  Link2,
  LockKeyhole,
  Menu,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  PanelLeft,
  Radio,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import "./landing.css";

type ChatMessage = {
  id: number;
  sender: "visitor" | "assistant";
  senderName?: string;
  senderRole?: "ADMIN" | "MEMBER" | "VISITOR";
  content: string;
  attachmentUrl?: string;
};

const welcomeMessage: ChatMessage = {
  id: -1,
  sender: "assistant",
  senderName: "Asisten Lobbio",
  senderRole: "ADMIN",
  content: "Halo! 👋 Selamat datang di Lobbio Community. Coba pilih tab identitas atau kirim gambar untuk mencoba!",
};

const features = [
  {
    number: "01",
    icon: Zap,
    tone: "purple",
    title: "Respons Kilat Tanpa Jeda",
    description: "Didukung WebSocket asli dan Bun runtime untuk percakapan real-time dengan latensi di bawah 5 milidetik.",
  },
  {
    number: "02",
    icon: Globe2,
    tone: "blue",
    title: "Dua Cara Hadir (Hybrid)",
    description: "Pasang widget melayang di website komunitas Anda atau bagikan link Room Publik mandiri ala Chatango.",
  },
  {
    number: "03",
    icon: UsersRound,
    tone: "peach",
    title: "Nyaman untuk Tamu & Member",
    description: "Sambut pengunjung anonim tanpa registrasi ribet, atau biarkan member mendaftar untuk mengunci nama profil.",
  },
  {
    number: "04",
    icon: ShieldCheck,
    tone: "mint",
    title: "Moderasi \"Sapu Bersih\"",
    description: "Admin memegang kendali mutlak: sensor kata otomatis, blokir spammer, hingga hapus pesan secara real-time.",
  },
];

function Logo() {
  return (
    <span className="logo-lockup">
      <span className="logo-mark">
        <MessageSquare size={20} strokeWidth={2.6} />
        <span className="logo-mark-dot" />
      </span>
      <span className="logo-word">
        Lobbio<span>.</span>
      </span>
      <span className="ml-1.5 px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/80">
        Community
      </span>
    </span>
  );
}

function HeroVisual() {
  return (
    <div className="hero-visual" role="img" aria-label="Ilustrasi widget live chat komunitas yang terpasang di sebuah website">
      <div className="hero-visual-glow" />
      <div className="hero-visual-dots" />

      <div className="browser-card" aria-hidden="true">
        <div className="browser-chrome">
          <div className="chrome-dots"><i /><i /><i /></div>
          <div className="browser-address"><LockKeyhole size={10} /> lobbio-community.sacchio.com</div>
          <MoreHorizontal size={16} />
        </div>
        <div className="store-navbar">
          <span className="store-logo">lobbio<span>.</span></span>
          <span className="store-links">Ruang Publik&nbsp;&nbsp;&nbsp; Komunitas&nbsp;&nbsp;&nbsp; Panduan</span>
          <span className="store-menu-icon"><span /><span /></span>
        </div>
        <div className="store-hero">
          <div className="store-hero-copy">
            <span>RUANG KUMPUL DIGITAL</span>
            <strong>Ngobrol seru<br />tanpa sekat.</strong>
            <span className="store-faux-button">Gabung Room Obrolan <ArrowRight size={12} /></span>
          </div>
        </div>
      </div>

      <div className="visual-online-badge" aria-hidden="true">
        <span className="online-badge-icon"><Radio size={17} /></span>
        <span><strong>1,240 Online</strong><small>Anggota aktif di ruang obrolan</small></span>
      </div>

      <div className="widget-preview" aria-hidden="true">
        <div className="widget-preview-head">
          <div className="widget-preview-avatar"><MessageCircle size={19} strokeWidth={2.3} /></div>
          <div><strong>Ruang Hangout #Umum</strong><span><i /> 14 anggota sedang aktif</span></div>
          <MoreHorizontal className="widget-preview-more" size={19} />
        </div>
        <div className="widget-preview-body">
          <span className="widget-preview-time">Hari ini</span>
          <div className="preview-bubble preview-bubble-left">Halo semua! Ada yang lagi nonton match malam ini? 🔥</div>
          <div className="preview-bubble preview-bubble-right">Hadir! Seru banget rame-rame di sini haha</div>
          <div className="preview-bubble preview-bubble-left">👑 [Admin] Selamat datang di room komunitas kita! ✨</div>
        </div>
        <div className="widget-preview-input"><span>Ketik pesan obrolan...</span><Send size={15} /></div>
      </div>

      <div className="visual-speed-badge" aria-hidden="true"><Zap size={15} fill="currentColor" /> Real-Time &lt; 5ms</div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="portal-visual" role="img" aria-label="Ilustrasi portal admin workspace Lobbio Community">
      <div className="portal-visual-blob" />
      <div className="dashboard-card" aria-hidden="true">
        <div className="dashboard-topbar">
          <div className="dashboard-mini-brand"><span><MessageSquare size={15} /></span> Lobbio<span className="dashboard-brand-dot">.</span></div>
          <div className="dashboard-breadcrumb">Workspace <ChevronRight size={12} /> <strong>Moderasi & Room</strong></div>
          <div className="dashboard-top-actions"><Search size={15} /><Bell size={15} /><span className="dashboard-admin-avatar">👑</span></div>
        </div>
        <div className="dashboard-body">
          <div className="dashboard-rail">
            <span className="rail-selected"><MessageSquare size={17} /></span>
            <span><UsersRound size={17} /></span>
            <span><PanelLeft size={17} /></span>
            <span className="rail-bottom"><ShieldCheck size={17} /></span>
          </div>
          <div className="dashboard-list">
            <div className="dashboard-list-title"><strong>Daftar Room</strong><span>2 Aktif</span></div>
            <div className="dashboard-search"><Search size={13} /> Cari ruang komunitas...</div>
            <div className="dashboard-filters"><span className="filter-active">Semua Room</span><span>Arsip</span></div>
            <div className="inbox-person inbox-person-active">
              <span className="inbox-avatar avatar-lavender">K</span>
              <span className="inbox-person-text"><strong>Komunitas Anime</strong><small>Tamu #402: Link download...</small></span>
              <span className="inbox-person-meta">Baru<i /></span>
            </div>
            <div className="inbox-person">
              <span className="inbox-avatar avatar-peach">G</span>
              <span className="inbox-person-text"><strong>Gamers Lounge</strong><small>Rizky: Mabar yuk!</small></span>
              <span className="inbox-person-meta">10m</span>
            </div>
            <div className="inbox-person">
              <span className="inbox-avatar avatar-mint">D</span>
              <span className="inbox-person-text"><strong>Dev Community</strong><small>Dinda: Mantap websocketnya</small></span>
              <span className="inbox-person-meta">1j</span>
            </div>
          </div>
          <div className="dashboard-conversation">
            <div className="conversation-header">
              <span className="conversation-avatar">K</span>
              <span><strong>Komunitas Anime</strong><small><i /> 18 orang online • Filter Aktif</small></span>
              <MoreHorizontal size={18} />
            </div>
            <div className="conversation-messages">
              <span className="conversation-date">Hari ini, 10:42</span>
              <div className="conversation-bubble received">Tamu #402: Halo semuanya, salam kenal dari Bandung! 👋</div>
              <div className="conversation-bubble sent">👑 Admin: Halo bro! Patuhi aturan room ya, enjoy!</div>
              <div className="conversation-bubble received">Member Budi: Siap min! Rame juga ya di sini 🔥</div>
            </div>
            <div className="conversation-input">Kirim sebagai Admin... <span><Send size={14} /></span></div>
          </div>
        </div>
      </div>
      <div className="portal-floating-note" aria-hidden="true"><span><CheckCheck size={17} /></span> Kendali Penuh Admin & Sapu Bersih</div>
    </div>
  );
}

function ChatDemo({ isOpen, onOpen, onClose }: { isOpen: boolean; onOpen: () => void; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [activeTab, setActiveTab] = useState<"guest" | "login" | "register" | "admin">("guest");
  const [guestName, setGuestName] = useState("");
  const [currentRole, setCurrentRole] = useState<"ADMIN" | "MEMBER" | "VISITOR">("VISITOR");
  const [currentUserLabel, setCurrentUserLabel] = useState("Tamu");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [isOpen, messages, sending, isJoined]);

  function handleJoinGuest() {
    const name = guestName.trim() || `Tamu #${Math.floor(100 + Math.random() * 900)}`;
    setGuestName(name);
    setCurrentRole("VISITOR");
    setCurrentUserLabel(name);
    setIsJoined(true);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: "visitor",
        senderName: name,
        senderRole: "VISITOR",
        content: `Bergabung ke obrolan sebagai ${name} 👋`,
      },
    ]);
  }

  function handleJoinMember() {
    const user = authUsername.trim() || "MemberDemo";
    setCurrentRole("MEMBER");
    setCurrentUserLabel(`@${user}`);
    setIsJoined(true);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: "visitor",
        senderName: `@${user}`,
        senderRole: "MEMBER",
        content: `Halo semua! @${user} siap berpartisipasi 🚀`,
      },
    ]);
  }

  function handleJoinAdmin() {
    setCurrentRole("ADMIN");
    setCurrentUserLabel("👑 Admin Lobbio");
    setIsJoined(true);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: "visitor",
        senderName: "👑 Admin Lobbio",
        senderRole: "ADMIN",
        content: "👑 Super Admin hadir untuk memantau room komunitas.",
      },
    ]);
  }

  function handleLogout() {
    setIsJoined(false);
    setCurrentUserLabel("Tamu");
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedMimes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
    if (!file.type || !allowedMimes.includes(file.type.toLowerCase())) {
      alert("Format file tidak didukung! Hanya gambar (PNG, JPG, JPEG, WEBP, GIF) yang diperbolehkan.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran file terlalu besar! Maksimal ukuran gambar adalah 2 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImg(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function makeReply(userText: string) {
    const text = userText.toLowerCase();
    if (/widget|embed|pasang|website|web/.test(text)) {
      return "Widget Lobbio Community bisa ditempel di website Anda hanya dengan 1 baris skrip HTML! Tombol melayang akan langsung menghubungkan semua pengunjung ke ruang obrolan Anda. ✨";
    }
    if (/room|ruang|chatango|link|tautan|publik/.test(text)) {
      return "Room Chat adalah halaman publik mandiri seperti Chatango. Anda cukup membagikan link room, dan siapa saja bisa langsung nimbrung mengobrol tanpa install apapun! 🚀";
    }
    if (/moderasi|sapu|bersih|hapus|sensor|ban|aman/.test(text)) {
      return "Lobbio Community dilengkapi sistem moderasi Sapu Bersih: Admin dapat menghapus pesan real-time, menyensor kata kasar otomatis, hingga memblokir spammer dengan sekali klik! 🛡️";
    }
    if (/support|bisnis|beda|perbedaan/.test(text)) {
      return "Lobbio memiliki 2 varian: 'Lobbio Support' khusus untuk customer service bisnis 1-on-1, sedangkan 'Lobbio Community' dirancang untuk grup chat ramai-ramai tanpa sekat. 🏛️";
    }
    if (/halo|hai|hi|hello|pagi|siang|sore|malam/.test(text)) {
      return `Halo ${currentUserLabel}! Senang bisa mengobrol. Coba tanyakan seputar 'widget', 'room chat', atau coba kirim gambar di sini! 😊`;
    }
    return "Terima kasih sudah mencoba demo Lobbio Community! Ini adalah contoh interaksi grup chat real-time. Anda bisa bertanya tentang cara pasang widget atau sistem moderasi. 💬";
  }

  function handleSend(contentToSend?: string) {
    const text = (contentToSend || input).trim();
    if ((!text && !selectedImg) || sending) return;

    const userMsg: ChatMessage = {
      id: Date.now(),
      sender: "visitor",
      senderName: currentUserLabel,
      senderRole: currentRole,
      content: text || (selectedImg ? "Mengirim gambar 📷" : ""),
      attachmentUrl: selectedImg || undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSelectedImg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSending(true);

    setTimeout(() => {
      const replyMsg: ChatMessage = {
        id: Date.now() + 1,
        sender: "assistant",
        senderName: "Asisten Lobbio",
        senderRole: "ADMIN",
        content: makeReply(text),
      };
      setMessages((prev) => [...prev, replyMsg]);
      setSending(false);
    }, 600);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    handleSend();
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 999999,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      {isOpen && (
        <div
          style={{
            width: "360px",
            height: "520px",
            backgroundColor: "#ffffff",
            borderRadius: "18px",
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.18)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            marginBottom: "16px",
            border: "1px solid #e2e8f0"
          }}
        >
          {/* HEADER */}
          <div
            style={{
              padding: "14px 16px",
              backgroundColor: "#4f46e5",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div>
              <div style={{ fontWeight: "bold", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                Lobbio Community
                <span style={{ fontSize: "10px", backgroundColor: "rgba(255,255,255,0.2)", padding: "2px 6px", borderRadius: "10px" }}>
                  Grup
                </span>
              </div>
              <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "2px" }}>
                {isJoined ? (
                  <span>
                    Sebagai: <b>{currentUserLabel}</b>
                  </span>
                ) : (
                  "Pilih identitas untuk bergabung"
                )}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {isJoined && (
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Ganti Pengguna / Keluar"
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    border: "none",
                    color: "white",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    fontSize: "10px",
                    cursor: "pointer"
                  }}
                >
                  Keluar
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "18px",
                  cursor: "pointer",
                  padding: "2px"
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* BODY */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {!isJoined ? (
              /* TAB IDENTITAS (TAMU / LOGIN / DAFTAR / ADMIN) */
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", backgroundColor: "#f1f5f9", borderRadius: "10px", padding: "2px", gap: "2px" }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab("guest")}
                    style={{
                      flex: 1,
                      padding: "6px 2px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      border: "none",
                      borderRadius: "7px",
                      cursor: "pointer",
                      backgroundColor: activeTab === "guest" ? "#ffffff" : "transparent",
                      color: activeTab === "guest" ? "#4f46e5" : "#64748b"
                    }}
                  >
                    Tamu
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("login")}
                    style={{
                      flex: 1,
                      padding: "6px 2px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      border: "none",
                      borderRadius: "7px",
                      cursor: "pointer",
                      backgroundColor: activeTab === "login" ? "#ffffff" : "transparent",
                      color: activeTab === "login" ? "#4f46e5" : "#64748b"
                    }}
                  >
                    Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("register")}
                    style={{
                      flex: 1,
                      padding: "6px 2px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      border: "none",
                      borderRadius: "7px",
                      cursor: "pointer",
                      backgroundColor: activeTab === "register" ? "#ffffff" : "transparent",
                      color: activeTab === "register" ? "#4f46e5" : "#64748b"
                    }}
                  >
                    Daftar
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("admin")}
                    style={{
                      flex: 1,
                      padding: "6px 2px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      border: "none",
                      borderRadius: "7px",
                      cursor: "pointer",
                      backgroundColor: activeTab === "admin" ? "#d97706" : "transparent",
                      color: activeTab === "admin" ? "#ffffff" : "#b45309"
                    }}
                  >
                    Admin
                  </button>
                </div>

                {/* Form Tamu */}
                {activeTab === "guest" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleJoinGuest();
                    }}
                    style={{ display: "flex", flexDirection: "column", gap: "10px" }}
                  >
                    <div style={{ fontSize: "12px", color: "#475569" }}>
                      Masuk cepat tanpa password:
                    </div>
                    <input
                      type="text"
                      required
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Nama panggilan Anda..."
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        outline: "none"
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: "10px",
                        backgroundColor: "#4f46e5",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        fontSize: "13px"
                      }}
                    >
                      Mulai Mengobrol →
                    </button>
                  </form>
                )}

                {/* Form Member Login & Register */}
                {(activeTab === "login" || activeTab === "register") && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleJoinMember();
                    }}
                    style={{ display: "flex", flexDirection: "column", gap: "10px" }}
                  >
                    <input
                      type="text"
                      required
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      placeholder="Username..."
                      style={{
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        outline: "none"
                      }}
                    />
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Password..."
                      style={{
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        outline: "none"
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: "10px",
                        backgroundColor: "#4f46e5",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        fontSize: "13px"
                      }}
                    >
                      {activeTab === "login" ? "Masuk Sebagai Member →" : "Daftar & Mulai Chat →"}
                    </button>
                  </form>
                )}

                {/* Form Admin */}
                {activeTab === "admin" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "center" }}>
                    <div style={{ fontSize: "12px", fontWeight: "bold", color: "#334155" }}>
                      👑 Mode Super Admin
                    </div>
                    <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>
                      Masuk dengan identitas Admin untuk menguji fitur moderasi &amp; lencana mahkota.
                    </p>
                    <button
                      type="button"
                      onClick={handleJoinAdmin}
                      style={{
                        padding: "10px",
                        backgroundColor: "#0f172a",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        fontSize: "13px"
                      }}
                    >
                      Masuk Sebagai Admin 👑 →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* CHAT MESSAGES & COMPOSER */
              <>
                <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ textAlign: "center", fontSize: "10px", color: "#94a3b8", margin: "4px 0" }}>
                    Anda terhubung ke ruang <b>Lobbio Community</b>.
                  </div>

                  {messages.map((message) => (
                    <div
                      key={message.id}
                      style={{
                        maxWidth: "80%",
                        alignSelf: message.sender === "visitor" ? "flex-end" : "flex-start",
                        backgroundColor: message.sender === "visitor" ? "#4f46e5" : "#f1f5f9",
                        color: message.sender === "visitor" ? "#ffffff" : "#0f172a",
                        borderRadius: "14px",
                        padding: "8px 12px",
                        fontSize: "12px",
                        lineHeight: 1.4,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                      }}
                    >
                      {message.senderName && (
                        <div
                          style={{
                            fontSize: "9px",
                            fontWeight: "bold",
                            marginBottom: "3px",
                            opacity: message.sender === "visitor" ? 0.85 : 0.65
                          }}
                        >
                          {message.senderRole === "ADMIN" && "👑 "}
                          {message.senderName}
                        </div>
                      )}
                      {message.attachmentUrl && (
                        <img
                          src={message.attachmentUrl}
                          alt="Lampiran"
                          style={{
                            borderRadius: "8px",
                            maxHeight: "130px",
                            width: "100%",
                            objectFit: "cover",
                            marginBottom: "6px"
                          }}
                        />
                      )}
                      <div>{message.content}</div>
                    </div>
                  ))}

                  {sending && (
                    <div style={{ alignSelf: "flex-start", fontSize: "10px", color: "#94a3b8", fontStyle: "italic" }}>
                      Asisten Lobbio sedang mengetik...
                    </div>
                  )}
                  <div ref={endRef} />
                </div>

                {/* IMAGE PREVIEW BAR */}
                {selectedImg && (
                  <div style={{ padding: "6px 12px", backgroundColor: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <img src={selectedImg} alt="Thumbnail" style={{ width: "28px", height: "28px", borderRadius: "4px", objectFit: "cover" }} />
                      <span style={{ fontSize: "11px", color: "#475569" }}>Gambar siap dikirim (&le;2MB)</span>
                    </div>
                    <button type="button" onClick={() => setSelectedImg(null)} style={{ background: "none", border: "none", color: "#ef4444", fontWeight: "bold", cursor: "pointer" }}>✕</button>
                  </div>
                )}

                {/* COMPOSER FORM */}
                <form
                  onSubmit={handleSubmit}
                  style={{
                    padding: "10px 12px",
                    borderTop: "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Unggah Foto / Gambar (Maks 2MB)"
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "8px",
                      backgroundColor: "#f1f5f9",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    📷
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Tulis pesan Anda..."
                    maxLength={500}
                    disabled={sending}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                      outline: "none"
                    }}
                  />
                  <button
                    type="submit"
                    disabled={(!input.trim() && !selectedImg) || sending}
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "8px",
                      backgroundColor: "#4f46e5",
                      color: "#ffffff",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: (!input.trim() && !selectedImg) || sending ? 0.5 : 1
                    }}
                  >
                    <Send size={15} />
                  </button>
                </form>
              </>
            )}
          </div>

          {/* PERMANENT FOOTER */}
          <div
            style={{
              padding: "9px 12px",
              textAlign: "center",
              fontSize: "11px",
              color: "#94a3b8",
              backgroundColor: "#f8fafc",
              borderTop: "1px solid #f1f5f9",
              letterSpacing: "-0.01em"
            }}
          >
            Didukung oleh <strong style={{ color: "#4f46e5" }}>Lobbio Community.</strong>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTON (FAB) */}
      <button
        type="button"
        onClick={isOpen ? onClose : onOpen}
        aria-label="Buka Lobbio Community Chat"
        style={{
          position: "relative",
          width: "60px",
          height: "60px",
          borderRadius: "18px",
          background: "linear-gradient(135deg, #6677f2, #4c5de0)",
          color: "#ffffff",
          border: "none",
          boxShadow: "0 13px 30px rgba(61, 79, 198, 0.35)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          float: "right",
          transition: "transform 0.2s ease, box-shadow 0.2s ease"
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "4px",
            right: "4px",
            width: "12px",
            height: "12px",
            backgroundColor: "#53d6a0",
            border: "2px solid #ffffff",
            borderRadius: "50%"
          }}
        />
        {isOpen ? (
          <span style={{ fontSize: "20px", fontWeight: "bold" }}>✕</span>
        ) : (
          <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>
    </div>
  );
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  function openChat() {
    setMenuOpen(false);
    setChatOpen(true);
  }

  return (
    <div className="site-shell" id="atas">
      {/* HEADER */}
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand-link" href="#atas" aria-label="Lobbio Community, kembali ke atas">
            <Logo />
          </Link>
          <nav className="desktop-nav" aria-label="Navigasi utama">
            <a href="#fitur">Fitur Unggulan</a>
            <a href="#cara-kerja">Dua Mode Chat</a>
            <a href="#portal">Portal Admin</a>
          </nav>
          <div className="header-actions">
            <Link href="/login" className="header-portal-link">
              Masuk Admin <ArrowUpRight size={15} />
            </Link>
            <button type="button" className="button button-primary header-button" onClick={openChat}>
              Coba Demo Chat <ArrowUpRight size={17} />
            </button>
          </div>
          <button
            type="button"
            className="mobile-menu-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
          >
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
        {menuOpen && (
          <nav className="mobile-nav" id="mobile-navigation" aria-label="Navigasi seluler">
            <a href="#fitur" onClick={() => setMenuOpen(false)}>Fitur Unggulan <ArrowUpRight size={16} /></a>
            <a href="#cara-kerja" onClick={() => setMenuOpen(false)}>Dua Mode Chat <ArrowUpRight size={16} /></a>
            <a href="#portal" onClick={() => setMenuOpen(false)}>Portal Admin <ArrowUpRight size={16} /></a>
            <Link href="/login" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>
              Masuk Admin <ArrowUpRight size={16} />
            </Link>
            <button type="button" className="button button-primary" onClick={openChat}>
              Coba Demo Chat <ArrowUpRight size={17} />
            </button>
          </nav>
        )}
      </header>

      {/* MAIN CONTENT */}
      <main>
        {/* HERO SECTION */}
        <section className="hero-section">
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="hero-eyebrow">
                <span><Sparkles size={14} /></span> Ruang Kumpul Digital Generasi Baru
              </div>
              <h1>
                Kumpul lebih seru.<br />
                <span>Ngobrol tanpa sekat.</span>
              </h1>
              <p className="hero-description">
                Hadirkan ruang interaksi langsung untuk komunitas dan pengunjung website Anda.
                Pasang widget hangout di website Anda atau bagikan tautan Room Publik dalam hitungan detik.
              </p>
              <div className="hero-buttons">
                <Link href="/login" className="button button-primary button-large">
                  Buka Portal Admin <ArrowUpRight size={19} />
                </Link>
                <button type="button" className="hero-secondary-link" onClick={openChat}>
                  Coba Demo Chat <ArrowRight size={17} />
                </button>
              </div>
              <div className="hero-reassurance">
                <span><Check size={14} /> Latensi Rendah &lt; 5ms</span>
                <span><Check size={14} /> Widget &amp; Room Publik</span>
                <span><Check size={14} /> Bebas Spam &amp; Sensor Otomatis</span>
              </div>
            </div>
            <HeroVisual />
          </div>
        </section>

        {/* HIGHLIGHTS BAR */}
        <div className="container highlights-wrap">
          <div className="highlights-bar">
            <div className="highlight-lead">
              <span>DIRANCANG UNTUK KOMUNITAS</span>
              <strong>Lebih dari sekadar chat biasa.</strong>
            </div>
            <div className="highlight-item">
              <span className="highlight-icon highlight-icon-purple"><Zap size={20} /></span>
              <span><strong>Super Real-Time</strong><small>WebSocket asli &lt; 5ms</small></span>
            </div>
            <div className="highlight-item">
              <span className="highlight-icon highlight-icon-blue"><Globe2 size={20} /></span>
              <span><strong>Mode Hybrid</strong><small>Widget &amp; Halaman Room</small></span>
            </div>
            <div className="highlight-item">
              <span className="highlight-icon highlight-icon-green"><ShieldCheck size={20} /></span>
              <span><strong>Sapu Bersih</strong><small>Kendali penuh moderasi</small></span>
            </div>
          </div>
        </div>

        {/* FEATURES SECTION */}
        <section className="features-section section-spacing" id="fitur">
          <div className="container">
            <div className="section-heading features-heading">
              <span className="section-kicker"><span /> FITUR UNGGULAN</span>
              <h2>Semua yang dibutuhkan untuk <span>ruang obrolan ramai.</span></h2>
              <p>Dari sapaan pertama tamu hingga moderasi ketat, seluruh interaksi komunitas berjalan harmonis.</p>
            </div>
            <div className="feature-grid">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article className={`feature-card feature-${feature.tone}`} key={feature.number}>
                    <div className="feature-card-top">
                      <span className="feature-icon"><Icon size={25} strokeWidth={1.9} /></span>
                      <span className="feature-number">{feature.number} / 04</span>
                    </div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                    <span className="feature-card-line" />
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* PORTAL SECTION */}
        <section className="portal-section" id="portal">
          <div className="container portal-grid">
            <div className="portal-copy">
              <span className="section-kicker"><span /> PORTAL ADMIN</span>
              <h2>Satu dashboard. Pantau semua room <span>dengan leluasa.</span></h2>
              <p>
                Kelola ruang komunitas, pantau obrolan real-time, dan tegakkan aturan komunitas dari satu tempat kerja yang nyaman.
              </p>
              <div className="portal-benefits">
                <div>
                  <span className="portal-benefit-icon"><MessageCircle size={19} /></span>
                  <span>
                    <strong>Kelola Multi-Room Komunitas</strong>
                    <small>Buat dan konfigurasi banyak room untuk berbagai topik atau website mitra.</small>
                  </span>
                </div>
                <div>
                  <span className="portal-benefit-icon"><Headphones size={19} /></span>
                  <span>
                    <strong>Sapu Bersih &amp; Sensor Otomatis</strong>
                    <small>Hapus pesan nakal seketika dan filter kata kasar otomatis tanpa jeda.</small>
                  </span>
                </div>
              </div>
              <Link href="/login" className="text-button">
                Buka Portal Admin Sekarang <ArrowUpRight size={18} />
              </Link>
            </div>
            <DashboardPreview />
          </div>
        </section>

        {/* WAYS SECTION */}
        <section className="ways-section section-spacing" id="cara-kerja">
          <div className="container">
            <div className="section-heading ways-heading">
              <span className="section-kicker"><span /> FLEKSIBILITAS TINGGI</span>
              <h2>Dua cara mudah <span>menghubungkan komunitas.</span></h2>
              <p>Pilih mode yang paling cocok dengan gaya situs dan kebutuhan audiens Anda.</p>
            </div>
            <div className="ways-grid">
              <article className="way-card way-widget">
                <div className="way-content">
                  <span className="way-icon"><Code2 size={23} /></span>
                  <span className="way-label">01 / WIDGET WEBSITE</span>
                  <h3>Tertanam rapi di website Anda.</h3>
                  <p>Cukup salin 1 baris skrip HTML, tombol obrolan melayang siap menyapa pengunjung di situs anime, blog, atau portal komunitas.</p>
                  <button type="button" onClick={openChat}>Coba interaksi widget <ArrowUpRight size={16} /></button>
                </div>
                <div className="way-illustration widget-illustration" aria-hidden="true">
                  <div className="mini-browser">
                    <div className="mini-browser-top"><i /><i /><i /><span>situskomunitas.com</span></div>
                    <div className="mini-browser-body"><span /><strong /><em /><em /></div>
                  </div>
                  <div className="mini-chat-bubble">
                    <span><MessageSquare size={16} /></span>
                    <div><strong>Obrolan Komunitas</strong><small>Klik untuk nimbrung bareng 👋</small></div>
                  </div>
                </div>
              </article>

              <article className="way-card way-room">
                <div className="way-content">
                  <span className="way-icon"><Link2 size={23} /></span>
                  <span className="way-label">02 / ROOM CHAT PUBLIK</span>
                  <h3>Satu tautan, langsung kumpul.</h3>
                  <p>Bagikan URL room (ala Chatango) ke Discord, WhatsApp, atau media sosial. Siapapun bisa langsung mengobrol tanpa instalasi.</p>
                  <button type="button" onClick={openChat}>Lihat demo room <ArrowUpRight size={16} /></button>
                </div>
                <div className="way-illustration room-illustration" aria-hidden="true">
                  <div className="room-window">
                    <div className="room-window-top"><span><MessageSquare size={13} /></span> Room Komunitas <MoreHorizontal size={17} /></div>
                    <div className="room-participants">
                      <span className="room-avatar room-a">👑</span>
                      <span className="room-avatar room-b">B</span>
                      <span className="room-avatar room-c">R</span>
                      <span className="room-extra">+12</span>
                    </div>
                    <div className="room-message">
                      <span className="room-avatar room-a">👑</span>
                      <span>Selamat datang di Room Lobbio! ✨</span>
                    </div>
                    <div className="room-link"><Link2 size={13} /> lobbio / room / komunitas-anda</div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* FINAL CTA SECTION */}
        <section className="container cta-container">
          <div className="final-cta">
            <div className="cta-decor cta-decor-one" />
            <div className="cta-decor cta-decor-two" />
            <div className="cta-copy">
              <span className="cta-kicker"><Sparkles size={14} /> MULAI RUANG KOMUNITAS ANDA</span>
              <h2>Semua keseruan dimulai dari <em>“halo”.</em></h2>
              <p>Rasakan betapa mudahnya mengumpulkan ratusan orang dalam satu lobi obrolan yang interaktif dan terkendali.</p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/login" className="button button-white">
                  Buka Portal Admin Sekarang <ArrowUpRight size={18} />
                </Link>
                <button type="button" className="text-white text-xs font-semibold underline underline-offset-4 hover:text-indigo-200" onClick={openChat}>
                  Coba Demo Chat Live
                </button>
              </div>
            </div>
            <div className="cta-art" aria-hidden="true">
              <div className="cta-art-circle"><MessageSquare size={65} strokeWidth={1.4} /></div>
              <div className="cta-art-bubble bubble-one">Halo semua! Selamat datang 👋</div>
              <div className="cta-art-bubble bubble-two">Seru banget rame-rame di sini! ✨</div>
              <span className="cta-art-spark spark-one">✦</span>
              <span className="cta-art-spark spark-two">✳</span>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="container footer-top">
          <div className="footer-about">
            <Link href="#atas" aria-label="Lobbio Community, kembali ke atas">
              <Logo />
            </Link>
            <p>Ruang kumpul obrolan real-time generasi baru untuk komunitas dan website modern.</p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
              <span>Bagian dari ekosistem:</span>
              <a href="https://lobbio-support.sacchio.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 hover:underline">
                Lobbio Support
              </a>
              <span className="text-slate-300">•</span>
              <a href="https://lobbio-community.sacchio.com" className="font-semibold text-slate-700 hover:text-indigo-600">
                Lobbio Community
              </a>
            </div>
          </div>
          <div className="footer-links">
            <a href="#fitur">Fitur Unggulan</a>
            <a href="#cara-kerja">Dua Mode Chat</a>
            <a href="#portal">Portal Admin</a>
            <Link href="/login">Masuk Admin</Link>
            <button type="button" onClick={openChat}>Coba Demo <ArrowUpRight size={15} /></button>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} Lobbio Community Edition. Diciptakan untuk percakapan yang berarti.</span>
          <a href="#atas">Kembali ke atas ↑</a>
        </div>
      </footer>

      {/* FLOATING DEMO CHAT */}
      <ChatDemo isOpen={chatOpen} onOpen={openChat} onClose={() => setChatOpen(false)} />
    </div>
  );
}
