"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import {
  MessageSquare,
  Send,
  User,
  Crown,
  Share2,
  Check,
  Shield,
  LogOut,
  KeyRound,
  UserPlus,
  Plus,
  Users,
  Settings,
  Ban,
  Clock,
  AlertTriangle,
  Trash2
} from "lucide-react";

interface Message {
  id: string;
  projectId: string;
  senderType: "VISITOR" | "AGENT" | "MEMBER";
  senderName: string;
  senderId?: string | null;
  content: string;
  attachmentUrl?: string | null;
  createdAt: string;
  isSystem?: boolean;
}

export default function PublicChatRoomPage() {
  const params = useParams();
  const token = params?.token as string;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Authentication & Identity State
  const [currentMember, setCurrentMember] = useState<any>(null);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"guest" | "login" | "register" | "admin">("guest");
  const [guestName, setGuestName] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Moderation Settings (Admin only)
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"moderation" | "banned">("moderation");
  const [slowModeSeconds, setSlowModeSeconds] = useState(0);
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [filterMode, setFilterMode] = useState<"CENSOR" | "REJECT">("CENSOR");
  const [bannedWords, setBannedWords] = useState("");
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [newBanName, setNewBanName] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Slow mode countdown
  const [slowModeCooldown, setSlowModeCooldown] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Slow mode countdown interval
  useEffect(() => {
    if (slowModeCooldown <= 0) return;
    const timer = setInterval(() => {
      setSlowModeCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [slowModeCooldown]);

  // Load project info & existing sessions
  useEffect(() => {
    if (!token) return;

    const fetchProject = async () => {
      try {
        const res = await fetch(
          `http://localhost:4000/api/widget/init?token=${token}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Room chat tidak ditemukan");
        setProject(data.project);

        if (data.project.settings) {
          setSlowModeSeconds(data.project.settings.slowModeSeconds || 0);
          setFilterEnabled(Boolean(data.project.settings.filterEnabled));
          setFilterMode(data.project.settings.filterMode || "CENSOR");
          setBannedWords(data.project.settings.bannedWords || "");
        }

        // Ambil riwayat obrolan grup
        fetchMessages(token);

        // 1. Cek Admin session
        const savedAdmin = localStorage.getItem("livechat_admin_user");
        if (savedAdmin) {
          try {
            const adminObj = JSON.parse(savedAdmin);
            setCurrentAdmin(adminObj);
            setIsJoined(true);
            connectWebSocket(token);
            return;
          } catch {}
        }

        // 2. Cek Member session
        const savedMember = localStorage.getItem("livechat_member_user");
        if (savedMember) {
          try {
            const memberObj = JSON.parse(savedMember);
            setCurrentMember(memberObj);
            setIsJoined(true);
            connectWebSocket(token);
            return;
          } catch {}
        }

        // 3. Cek Tamu session
        const savedGuest = localStorage.getItem("livechat_guest_name");
        if (savedGuest) {
          setGuestName(savedGuest);
          setIsJoined(true);
          connectWebSocket(token);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [token]);

  const fetchMessages = async (t: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/widget/messages?token=${t}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Gagal memuat pesan:", err);
    }
  };

  const loadBannedUsers = async () => {
    if (!project) return;
    const adminToken = localStorage.getItem("livechat_admin_token");
    if (!adminToken) return;

    try {
      const res = await fetch(`http://localhost:4000/api/projects/${project.id}/banned`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (data.bannedUsers) {
        setBannedUsers(data.bannedUsers);
      }
    } catch (err) {
      console.error("Gagal memuat daftar ban:", err);
    }
  };

  const connectWebSocket = (t: string) => {
    if (socketRef.current) socketRef.current.close();

    const ws = new WebSocket("ws://localhost:4000/ws");
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "join",
          token: t
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // 1. Pesan Baru
        if (data.type === "new_message" && data.message) {
          const newMsg: Message = data.message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }

        // 2. Notifikasi Sistem
        if (data.type === "system" && data.message) {
          const sysMsg: Message = {
            id: "sys-" + Date.now() + "-" + Math.random(),
            projectId: project?.id || "",
            senderType: "AGENT",
            senderName: "Sistem",
            content: data.message,
            createdAt: new Date().toISOString(),
            isSystem: true
          };
          setMessages((prev) => [...prev, sysMsg]);
        }

        // 3. Update Slow Mode
        if (data.type === "slow_mode_update") {
          setSlowModeSeconds(data.seconds);
        }

        // 4. Error Toast dari Server
        if (data.type === "error" && data.message) {
          setErrorToast(data.message);
          setTimeout(() => setErrorToast(null), 6000);

          // Jika ada sisa detik slow mode, pasang countdown
          const match = data.message.match(/(\d+)\s*detik/);
          if (match && match[1]) {
            setSlowModeCooldown(parseInt(match[1]));
          }
        }

        // 5. Pesan Dihapus Realtime
        if (data.type === "message_deleted" && data.messageId) {
          setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
        }
      } catch (err) {
        console.error("Gagal memproses pesan WS:", err);
      }
    };
  };

  // Hapus Pesan Obrolan (Admin)
  const handleDeleteMessage = (messageId: string) => {
    if (!socketRef.current) return;
    if (confirm("Apakah Anda yakin ingin menghapus pesan ini untuk semua orang?")) {
      socketRef.current.send(
        JSON.stringify({
          type: "delete_message",
          token,
          senderType: "AGENT",
          messageId
        })
      );
    }
  };

  // 1. Masuk Sebagai Tamu
  const handleJoinGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    localStorage.setItem("livechat_guest_name", guestName.trim());
    setIsJoined(true);
    connectWebSocket(token);
  };

  // 2. Login Member
  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const res = await fetch("http://localhost:4000/api/member/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: authUsername.trim(),
          password: authPassword
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || "Gagal masuk");
        return;
      }

      localStorage.setItem("livechat_member_user", JSON.stringify(data.member));
      localStorage.setItem("livechat_member_token", data.token);
      setCurrentMember(data.member);
      setIsJoined(true);
      connectWebSocket(token);
    } catch (err: any) {
      setAuthError("Terjadi gangguan koneksi: " + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // 3. Register Member
  const handleMemberRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const res = await fetch("http://localhost:4000/api/member/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: authUsername.trim(),
          password: authPassword
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || "Gagal mendaftar");
        return;
      }

      localStorage.setItem("livechat_member_user", JSON.stringify(data.member));
      localStorage.setItem("livechat_member_token", data.token);
      setCurrentMember(data.member);
      setIsJoined(true);
      connectWebSocket(token);
    } catch (err: any) {
      setAuthError("Terjadi gangguan koneksi: " + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // 4. Login Admin / Operator di Room
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const res = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail.trim(),
          password: adminPassword
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || "Gagal masuk sebagai Admin");
        return;
      }

      localStorage.setItem("livechat_admin_user", JSON.stringify(data.user));
      localStorage.setItem("livechat_admin_token", data.token);
      setCurrentAdmin(data.user);
      setIsJoined(true);
      connectWebSocket(token);
    } catch (err: any) {
      setAuthError("Terjadi gangguan koneksi: " + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("livechat_admin_user");
    localStorage.removeItem("livechat_admin_token");
    localStorage.removeItem("livechat_member_user");
    localStorage.removeItem("livechat_member_token");
    localStorage.removeItem("livechat_guest_name");
    setCurrentAdmin(null);
    setCurrentMember(null);
    setGuestName("");
    setIsJoined(false);
    if (socketRef.current) socketRef.current.close();
  };

  // 1-Click Ban (Admin Only)
  const handleQuickBan = (targetName: string) => {
    if (!currentAdmin || !socketRef.current) return;
    if (confirm(`Apakah Anda yakin ingin memblokir "${targetName}"?`)) {
      socketRef.current.send(
        JSON.stringify({
          type: "message",
          token,
          senderType: "AGENT",
          senderName: currentAdmin.name || "Admin",
          senderId: currentAdmin.id,
          content: `/ban ${targetName}`
        })
      );
    }
  };

  // Simpan Moderasi Settings (Admin Only)
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    const adminToken = localStorage.getItem("livechat_admin_token");
    if (!adminToken) return;

    setSavingSettings(true);
    try {
      const res = await fetch(`http://localhost:4000/api/projects/${project.id}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          slowModeSeconds: Number(slowModeSeconds) || 0,
          filterEnabled,
          filterMode,
          bannedWords
        })
      });

      if (res.ok) {
        alert("✅ Pengaturan moderasi berhasil disimpan!");
        setShowSettingsModal(false);
      } else {
        const d = await res.json();
        alert(d.error || "Gagal menyimpan");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Unban user (Admin Only)
  const handleUnban = async (bannedId: string) => {
    if (!project) return;
    const adminToken = localStorage.getItem("livechat_admin_token");
    if (!adminToken) return;

    try {
      const res = await fetch(`http://localhost:4000/api/projects/${project.id}/banned/${bannedId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      if (res.ok) {
        setBannedUsers((prev) => prev.filter((b) => b.id !== bannedId));
      }
    } catch (err) {
      console.error("Gagal mencabut ban:", err);
    }
  };

  // Kirim Pesan
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socketRef.current) return;

    if (!currentAdmin && slowModeCooldown > 0) {
      setErrorToast(`🐢 Slow Mode aktif! Tunggu ${slowModeCooldown} detik lagi.`);
      return;
    }

    const senderType = currentAdmin ? "AGENT" : currentMember ? "MEMBER" : "VISITOR";
    const senderName = currentAdmin
      ? (currentAdmin.name || "Admin")
      : currentMember
      ? (currentMember.name || currentMember.username)
      : (guestName || "Tamu");
    const senderId = currentAdmin ? currentAdmin.id : currentMember ? currentMember.id : null;

    socketRef.current.send(
      JSON.stringify({
        type: "message",
        token,
        senderType,
        senderName,
        senderId,
        content: inputMessage.trim()
      })
    );

    setInputMessage("");

    // Trigger local cooldown for non-admin if slow mode active
    if (!currentAdmin && slowModeSeconds > 0) {
      setSlowModeCooldown(slowModeSeconds);
    }
  };

  // Kirim Gambar
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socketRef.current) return;

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

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:4000/api/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Gagal mengunggah gambar!");
        return;
      }

      const senderType = currentAdmin ? "AGENT" : currentMember ? "MEMBER" : "VISITOR";
      const senderName = currentAdmin
        ? (currentAdmin.name || "Admin")
        : currentMember
        ? (currentMember.name || currentMember.username)
        : (guestName || "Tamu");
      const senderId = currentAdmin ? currentAdmin.id : currentMember ? currentMember.id : null;

      socketRef.current.send(
        JSON.stringify({
          type: "message",
          token,
          senderType,
          senderName,
          senderId,
          content: inputMessage.trim() || "",
          attachmentUrl: data.url
        })
      );

      setInputMessage("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      alert("Terjadi kesalahan jaringan saat mengunggah gambar: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Menghubungkan ke ruang obrolan...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
        <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Room Tidak Ditemukan</h1>
        <p className="text-sm text-slate-500 max-w-sm">
          {error || "Tautan yang Anda tuju mungkin salah atau telah dinonaktifkan oleh pemilik ruang."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 flex-col items-center justify-center overflow-hidden">
      <div className="w-full max-w-4xl h-full sm:h-[94vh] flex flex-col bg-slate-900 sm:rounded-3xl border border-slate-800 shadow-2xl overflow-hidden relative">
        
        {/* HEADER ROOM */}
        <div className="px-6 py-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base flex items-center gap-2">
                {project.name}
                <span className="text-[11px] font-normal bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  Komunitas Publik
                </span>
                {slowModeSeconds > 0 && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" /> {slowModeSeconds}s
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Chatango Room
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isJoined && (
              <div className="hidden sm:flex items-center gap-2 mr-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/50">
                {currentAdmin ? (
                  <span className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-400" /> {currentAdmin.name || "Admin"}
                  </span>
                ) : currentMember ? (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> @{currentMember.username}
                  </span>
                ) : (
                  <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" /> {guestName} (Tamu)
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  title="Ganti Nama / Keluar"
                  className="text-slate-400 hover:text-red-400 transition ml-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Tombol Moderasi untuk Admin */}
            {currentAdmin && (
              <button
                onClick={() => {
                  loadBannedUsers();
                  setShowSettingsModal(true);
                }}
                title="Moderasi & Pengaturan Proyek"
                className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition flex items-center gap-1.5 text-xs font-semibold"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Moderasi</span>
              </button>
            )}

            <button
              onClick={handleCopyLink}
              title="Bagikan Tautan Room"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1.5 text-xs font-medium border border-slate-700"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? "Tersalin!" : "Bagikan"}</span>
            </button>
          </div>
        </div>

        {/* ERROR / SYSTEM TOAST */}
        {errorToast && (
          <div className="mx-6 mt-3 p-3 bg-red-500/15 border border-red-500/40 text-red-300 rounded-xl text-xs flex items-center justify-between shadow-lg z-20">
            <span className="flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" /> {errorToast}
            </span>
            <button onClick={() => setErrorToast(null)} className="text-red-400 hover:text-white text-sm">
              ✕
            </button>
          </div>
        )}

        {/* AUTH TAB MODAL JIKA BELUM JOIN */}
        {!isJoined ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
              
              {/* Tab Selector (Tamu | Masuk | Daftar | Admin) */}
              <div className="grid grid-cols-4 p-1 bg-slate-950 rounded-2xl mb-6 border border-slate-800 gap-1">
                <button
                  type="button"
                  onClick={() => { setActiveTab("guest"); setAuthError(""); }}
                  className={`py-2 text-[11px] font-semibold rounded-xl transition flex items-center justify-center gap-1 ${
                    activeTab === "guest"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <User className="w-3 h-3" /> Tamu
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab("login"); setAuthError(""); }}
                  className={`py-2 text-[11px] font-semibold rounded-xl transition flex items-center justify-center gap-1 ${
                    activeTab === "login"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <KeyRound className="w-3 h-3" /> Masuk
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab("register"); setAuthError(""); }}
                  className={`py-2 text-[11px] font-semibold rounded-xl transition flex items-center justify-center gap-1 ${
                    activeTab === "register"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <UserPlus className="w-3 h-3" /> Daftar
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab("admin"); setAuthError(""); }}
                  className={`py-2 text-[11px] font-semibold rounded-xl transition flex items-center justify-center gap-1 ${
                    activeTab === "admin"
                      ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                      : "text-amber-400/70 hover:text-amber-300"
                  }`}
                >
                  <Crown className="w-3 h-3" /> Admin
                </button>
              </div>

              {authError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 text-left">
                  ⚠️ {authError}
                </div>
              )}

              {/* Form 1: Tamu */}
              {activeTab === "guest" && (
                <form onSubmit={handleJoinGuest} className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Nama Panggilan Tamu
                    </label>
                    <input
                      type="text"
                      required
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="cth: Budi, Traveler, Anonim"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition shadow-lg shadow-indigo-600/30"
                  >
                    Masuk ke Ruang Obrolan
                  </button>
                </form>
              )}

              {/* Form 2: Login Member */}
              {activeTab === "login" && (
                <form onSubmit={handleMemberLogin} className="space-y-3.5 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      placeholder="Username Anda"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition shadow-lg shadow-emerald-600/30"
                  >
                    {authLoading ? "Memverifikasi..." : "Masuk Sebagai Member"}
                  </button>
                </form>
              )}

              {/* Form 3: Register Member */}
              {activeTab === "register" && (
                <form onSubmit={handleMemberRegister} className="space-y-3.5 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Pilih Username
                    </label>
                    <input
                      type="text"
                      required
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      placeholder="cth: sacchio"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Buat Password
                    </label>
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition shadow-lg shadow-teal-600/30"
                  >
                    {authLoading ? "Mendaftarkan..." : "Buat Akun Member"}
                  </button>
                </form>
              )}

              {/* Form 4: Login Admin / Operator */}
              {activeTab === "admin" && (
                <form onSubmit={handleAdminLogin} className="space-y-3.5 text-left">
                  <div className="text-xs text-amber-400/90 font-medium mb-1">
                    👑 Masuk dengan akun Pemilik/Operator Proyek:
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Email Admin
                    </label>
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@email.com"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition shadow-lg shadow-amber-600/30"
                  >
                    {authLoading ? "Memverifikasi..." : "Masuk Sebagai Admin"}
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          /* JIKA SUDAH JOIN: AREA CHAT GRUP */
          <>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <MessageSquare className="w-12 h-12 mb-3 stroke-1 text-slate-600" />
                  <p className="text-sm font-medium">Belum ada obrolan di ruang ini</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Jadilah yang pertama menyapa semua orang di komunitas ini!
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  // Jika notifikasi sistem
                  if (m.isSystem) {
                    return (
                      <div key={m.id} className="flex justify-center my-2">
                        <div className="bg-slate-800/90 text-amber-300 px-4 py-1.5 rounded-full text-xs font-medium border border-amber-500/20 shadow-sm flex items-center gap-1.5">
                          {m.content}
                        </div>
                      </div>
                    );
                  }

                  const isAgent = m.senderType === "AGENT";
                  const isMember = m.senderType === "MEMBER";
                  const isMe =
                    (currentAdmin && isAgent && m.senderId === currentAdmin.id) ||
                    (currentMember && isMember && m.senderId === currentMember.id) ||
                    (!currentAdmin && !currentMember && !isAgent && !isMember && m.senderName === guestName);

                  return (
                    <div
                      key={m.id}
                      className={`flex gap-3 items-start ${
                        isMe ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                          isAgent
                            ? "bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20"
                            : isMember
                            ? "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md"
                            : "bg-slate-800 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {isAgent ? (
                          <Crown className="w-4 h-4" />
                        ) : isMember ? (
                          <Shield className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>

                      <div className={`max-w-md ${isMe ? "items-end" : "items-start"}`}>
                        {/* Nama Pengirim, Badge & Tombol Moderasi */}
                        <div
                          className={`flex items-center gap-1.5 mb-1 px-1 ${
                            isMe ? "justify-end" : "justify-start"
                          }`}
                        >
                          <span className="text-xs font-semibold text-slate-300">
                            {m.senderName || (isAgent ? "Admin" : "Tamu")}
                          </span>
                          {isAgent ? (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                              <Crown className="w-2.5 h-2.5" /> Admin
                            </span>
                          ) : isMember ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5" /> Member
                            </span>
                          ) : (
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded">
                              Tamu
                            </span>
                          )}

                          {/* Tombol Ban untuk Admin */}
                          {currentAdmin && !isAgent && (
                            <button
                              onClick={() => handleQuickBan(m.senderName)}
                              title={`Blokir "${m.senderName}"`}
                              className="text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/20 p-0.5 rounded transition flex items-center gap-0.5 ml-1"
                            >
                              <Ban className="w-3 h-3 text-red-400" /> Ban
                            </button>
                          )}

                          {/* Tombol Hapus Pesan untuk Admin */}
                          {currentAdmin && (
                            <button
                              onClick={() => handleDeleteMessage(m.id)}
                              title="Hapus pesan ini"
                              className="text-[10px] text-slate-400 hover:text-red-400 hover:bg-red-500/20 p-0.5 rounded transition flex items-center gap-0.5 ml-0.5"
                            >
                              <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-400" /> Hapus
                            </button>
                          )}

                          <span className="text-[10px] text-slate-500 ml-1">
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>

                        {/* Bubble Chat */}
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            isAgent
                              ? "bg-gradient-to-r from-indigo-950 to-slate-900 border border-indigo-500/40 text-indigo-100 rounded-tl-none"
                              : isMe
                              ? "bg-indigo-600 text-white rounded-tr-none"
                              : "bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none"
                          }`}
                        >
                          {m.attachmentUrl && (
                            <div className="mb-2">
                              <img
                                src={m.attachmentUrl}
                                alt="Lampiran"
                                onClick={() => setLightboxImg(m.attachmentUrl!)}
                                className="rounded-lg max-h-64 max-w-full object-cover border border-white/10 hover:opacity-90 transition cursor-pointer shadow-sm"
                                title="Klik untuk memperbesar"
                              />
                            </div>
                          )}
                          {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* INPUT BAR */}
            <div className="p-4 bg-slate-900 border-t border-slate-800">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                className="hidden"
              />
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  title="Unggah Foto / Gambar (Maks 2MB)"
                  className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition flex items-center justify-center shrink-0 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    uploading
                      ? "Sedang mengunggah gambar (maks 2MB)..."
                      : slowModeCooldown > 0 && !currentAdmin
                      ? `⏳ Slow Mode: tunggu ${slowModeCooldown} detik...`
                      : currentAdmin
                      ? "Kirim pesan atau command (/ban, /unban, /slow)..."
                      : `Tulis pesan sebagai ${currentMember ? `@${currentMember.username}` : guestName || "Tamu"}...`
                  }
                  disabled={uploading || (slowModeCooldown > 0 && !currentAdmin)}
                  className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={(!inputMessage.trim() && !uploading) || uploading || (slowModeCooldown > 0 && !currentAdmin)}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-medium text-sm transition shadow-md shadow-indigo-600/30 shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {slowModeCooldown > 0 && !currentAdmin ? `(${slowModeCooldown}s)` : "Kirim"}
                  </span>
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* MODAL MODERASI UNTUK ADMIN DI ROOM */}
      {showSettingsModal && currentAdmin && project && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-500" /> Moderasi Room (Admin)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Proyek: {project.name}
                </p>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex border-b border-slate-800 px-6 pt-2 bg-slate-950">
              <button
                type="button"
                onClick={() => setSettingsTab("moderation")}
                className={`py-2 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 ${
                  settingsTab === "moderation"
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Shield className="w-4 h-4" /> Filter &amp; Slow Mode
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab("banned")}
                className={`py-2 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 ${
                  settingsTab === "banned"
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Ban className="w-4 h-4" /> Banned Users ({bannedUsers.length})
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {settingsTab === "moderation" ? (
                <form onSubmit={handleSaveSettings} className="space-y-4 text-left">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <label className="block text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400" /> Slow Mode (Detik)
                    </label>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        min="0"
                        value={slowModeSeconds}
                        onChange={(e) => setSlowModeSeconds(Number(e.target.value))}
                        className="w-24 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-xs text-slate-400">detik (0 = nonaktif)</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" /> Filter Sensor Kata Kasar
                      </label>
                      <input
                        type="checkbox"
                        checked={filterEnabled}
                        onChange={(e) => setFilterEnabled(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 cursor-pointer"
                      />
                    </div>

                    {filterEnabled && (
                      <>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <label className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs cursor-pointer">
                            <input
                              type="radio"
                              name="filterMode"
                              value="CENSOR"
                              checked={filterMode === "CENSOR"}
                              onChange={() => setFilterMode("CENSOR")}
                            />
                            Sensor (***)
                          </label>
                          <label className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs cursor-pointer">
                            <input
                              type="radio"
                              name="filterMode"
                              value="REJECT"
                              checked={filterMode === "REJECT"}
                              onChange={() => setFilterMode("REJECT")}
                            />
                            Tolak Pesan
                          </label>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
                            Kata Terlarang (pisah koma):
                          </label>
                          <textarea
                            rows={3}
                            value={bannedWords}
                            onChange={(e) => setBannedWords(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSettingsModal(false)}
                      className="px-4 py-2 text-xs text-slate-400 hover:bg-slate-800 rounded-lg"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="px-4 py-2 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium"
                    >
                      {savingSettings ? "Menyimpan..." : "Simpan Pengaturan"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                    {bannedUsers.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        Belum ada pengguna yang diblokir.
                      </div>
                    ) : (
                      bannedUsers.map((bu) => (
                        <div key={bu.id} className="p-3 flex items-center justify-between">
                          <div className="text-xs">
                            <span className="font-bold text-white">{bu.username || bu.guestName}</span>
                            <span className="text-[10px] text-slate-400 block">oleh {bu.bannedBy}</span>
                          </div>
                          <button
                            onClick={() => handleUnban(bu.id)}
                            className="text-xs text-emerald-400 hover:bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30"
                          >
                            Cabut Ban
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Pop-up Modal Gambar */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImg(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setLightboxImg(null)}
              className="absolute -top-10 right-0 text-white/90 hover:text-white text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition flex items-center gap-1 font-medium cursor-pointer"
            >
              ✕ Tutup (Klik luar untuk menutup)
            </button>
            <img
              src={lightboxImg}
              alt="Pratinjau Gambar"
              className="max-w-full max-h-[85vh] rounded-xl object-contain cursor-default shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
