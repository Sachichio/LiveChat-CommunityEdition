import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

// Dapatkan konfigurasi dari script tag
const currentScript =
  document.currentScript ||
  (function () {
    const scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

const WIDGET_TOKEN = currentScript?.getAttribute("data-token") || "";
const API_BASE = "http://localhost:4000";
const WS_BASE = "ws://localhost:4000/ws";

interface Message {
  id: string;
  projectId: string;
  senderType: "VISITOR" | "MEMBER" | "AGENT";
  senderName: string;
  senderId?: string | null;
  content: string;
  attachmentUrl?: string | null;
  createdAt: string;
  isSystem?: boolean;
}

function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");

  // Status Keanggotaan & Form
  const [isJoined, setIsJoined] = useState(false);
  const [activeTab, setActiveTab] = useState<"guest" | "login" | "register" | "admin">("guest");
  const [currentMember, setCurrentMember] = useState<any>(null);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);

  // Form Fields
  const [guestName, setGuestName] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [slowModeCooldown, setSlowModeCooldown] = useState(0);
  const [isValidProject, setIsValidProject] = useState<boolean | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Cooldown timer
  useEffect(() => {
    if (slowModeCooldown <= 0) return;
    const timer = setInterval(() => {
      setSlowModeCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [slowModeCooldown]);

  // Cek admin, member, atau nama tamu tersimpan saat inisialisasi
  useEffect(() => {
    const savedAdmin = localStorage.getItem("livechat_admin_user");
    if (savedAdmin) {
      try {
        const admin = JSON.parse(savedAdmin);
        setCurrentAdmin(admin);
      } catch {}
    }

    const savedMember = localStorage.getItem("livechat_member_user");
    if (savedMember) {
      try {
        const member = JSON.parse(savedMember);
        setCurrentMember(member);
      } catch {}
    }

    const savedGuest = localStorage.getItem("livechat_guest_name");
    if (savedGuest) {
      setGuestName(savedGuest);
    }
  }, []);

  // Verifikasi keabsahan proyek ke backend (Auto-destruct jika proyek dihapus)
  useEffect(() => {
    if (!WIDGET_TOKEN) {
      setIsValidProject(false);
      return;
    }

    fetch(`${API_BASE}/api/widget/init?token=${WIDGET_TOKEN}`)
      .then((res) => {
        if (!res.ok) throw new Error("Project not found");
        return res.json();
      })
      .then((data) => {
        if (data.project) {
          setIsValidProject(true);
        } else {
          setIsValidProject(false);
        }
      })
      .catch(() => {
        setIsValidProject(false);
      });
  }, []);

  // Ambil riwayat pesan grup
  const fetchMessages = async () => {
    if (!WIDGET_TOKEN) return;
    try {
      const res = await fetch(`${API_BASE}/api/widget/messages?token=${WIDGET_TOKEN}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Gagal mengambil pesan:", err);
    }
  };

  // WebSocket Connection Helper
  const connectWebSocket = () => {
    if (socketRef.current) socketRef.current.close();
    const ws = new WebSocket(WS_BASE);
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "join",
          token: WIDGET_TOKEN
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const incoming = JSON.parse(event.data);

        // 1. Pesan Baru
        if (incoming.type === "new_message" && incoming.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.message.id)) return prev;
            return [...prev, incoming.message];
          });
        }

        // 2. Notifikasi Sistem
        if (incoming.type === "system" && incoming.message) {
          const sysMsg: Message = {
            id: "sys-" + Date.now() + "-" + Math.random(),
            projectId: "",
            senderType: "AGENT",
            senderName: "Sistem",
            content: incoming.message,
            createdAt: new Date().toISOString(),
            isSystem: true
          };
          setMessages((prev) => [...prev, sysMsg]);
        }

        // 3. Error Toast dari server (Slow mode / Banned / Kata kasar)
        if (incoming.type === "error" && incoming.message) {
          setErrorToast(incoming.message);
          setTimeout(() => setErrorToast(null), 5000);

          const match = incoming.message.match(/(\d+)\s*detik/);
          if (match && match[1]) {
            setSlowModeCooldown(parseInt(match[1]));
          }
        }

        // 4. Pesan Dihapus Realtime
        if (incoming.type === "message_deleted" && incoming.messageId) {
          setMessages((prev) => prev.filter((m) => m.id !== incoming.messageId));
        }
      } catch (e) {
        console.error("WS error:", e);
      }
    };
  };

  // 1. Gabung Sebagai Admin
  const joinAsAdmin = (admin: any) => {
    setCurrentAdmin(admin);
    setIsJoined(true);
    fetchMessages();
    connectWebSocket();
  };

  // 2. Gabung Sebagai Member
  const joinAsMember = (member: any) => {
    setCurrentMember(member);
    setIsJoined(true);
    fetchMessages();
    connectWebSocket();
  };

  // 3. Gabung Sebagai Tamu
  const joinAsGuest = (name: string) => {
    localStorage.setItem("livechat_guest_name", name);
    setGuestName(name);
    setIsJoined(true);
    fetchMessages();
    connectWebSocket();
  };

  // Buka Widget
  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    if (nextState && !isJoined) {
      const savedAdmin = localStorage.getItem("livechat_admin_user");
      if (savedAdmin) {
        try {
          const admin = JSON.parse(savedAdmin);
          joinAsAdmin(admin);
          return;
        } catch {}
      }

      const savedMember = localStorage.getItem("livechat_member_user");
      if (savedMember) {
        try {
          const member = JSON.parse(savedMember);
          joinAsMember(member);
          return;
        } catch {}
      }

      const savedGuest = localStorage.getItem("livechat_guest_name");
      if (savedGuest) {
        joinAsGuest(savedGuest);
      }
    }
  };

  // Submit Tamu
  const handleSubmitGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    joinAsGuest(guestName.trim());
  };

  // Submit Login Member
  const handleLoginMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/member/login`, {
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
      joinAsMember(data.member);
    } catch (err: any) {
      setAuthError("Gagal menghubungi server");
    } finally {
      setAuthLoading(false);
    }
  };

  // Submit Register Member
  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/member/register`, {
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
      joinAsMember(data.member);
    } catch (err: any) {
      setAuthError("Gagal menghubungi server");
    } finally {
      setAuthLoading(false);
    }
  };

  // Submit Login Admin
  const handleLoginAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
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
      joinAsAdmin(data.user);
    } catch (err: any) {
      setAuthError("Gagal menghubungi server");
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout
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
          token: WIDGET_TOKEN,
          senderType: "AGENT",
          senderName: currentAdmin.name || "Admin",
          senderId: currentAdmin.id,
          content: `/ban ${targetName}`
        })
      );
    }
  };

  // Hapus Pesan Obrolan (Admin)
  const handleDeleteMessage = (messageId: string) => {
    if (!socketRef.current) return;
    if (confirm("Apakah Anda yakin ingin menghapus pesan ini untuk semua orang?")) {
      socketRef.current.send(
        JSON.stringify({
          type: "delete_message",
          token: WIDGET_TOKEN,
          senderType: "AGENT",
          messageId
        })
      );
    }
  };

  // Kirim Pesan
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !socketRef.current) return;

    if (!currentAdmin && slowModeCooldown > 0) {
      setErrorToast(`🐢 Slow Mode aktif! Tunggu ${slowModeCooldown} detik.`);
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
        token: WIDGET_TOKEN,
        senderType,
        senderName,
        senderId,
        content: inputValue.trim()
      })
    );

    setInputValue("");
  };

  // Kirim Gambar
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socketRef.current) return;

    if (!file.type.startsWith("image/")) {
      alert("Hanya file gambar (PNG, JPG, GIF, WEBP) yang diperbolehkan!");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran gambar terlalu besar! Maksimal 5 MB.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
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
          token: WIDGET_TOKEN,
          senderType,
          senderName,
          senderId,
          content: inputValue.trim() || "",
          attachmentUrl: data.url
        })
      );

      setInputValue("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      alert("Terjadi kesalahan jaringan saat mengunggah gambar: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Jangan render apapun jika proyek tidak valid atau telah dihapus
  if (isValidProject !== true) {
    return null;
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
      {/* CHAT WINDOW */}
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
                Komunitas LiveChat
                <span style={{ fontSize: "10px", backgroundColor: "rgba(255,255,255,0.2)", padding: "2px 6px", borderRadius: "10px" }}>
                  Grup
                </span>
              </div>
              <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "2px" }}>
                {isJoined ? (
                  <span>
                    Sebagai: <b>{currentAdmin ? `👑 ${currentAdmin.name}` : currentMember ? `@${currentMember.username}` : guestName || "Tamu"}</b>
                  </span>
                ) : (
                  "Pilih identitas untuk bergabung"
                )}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {isJoined && (
                <button
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
                onClick={handleToggle}
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

          {/* ERROR TOAST */}
          {errorToast && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                color: "#b91c1c",
                fontSize: "11px",
                padding: "8px 12px",
                borderBottom: "1px solid #fecaca",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <span>⚠️ {errorToast}</span>
              <button
                onClick={() => setErrorToast(null)}
                style={{ background: "none", border: "none", color: "#b91c1c", cursor: "pointer", fontSize: "12px" }}
              >
                ✕
              </button>
            </div>
          )}

          {/* BODY */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {!isJoined ? (
              /* TAB IDENTITAS (TAMU / LOGIN / DAFTAR / ADMIN) */
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", backgroundColor: "#f1f5f9", borderRadius: "10px", padding: "2px", gap: "2px" }}>
                  <button
                    type="button"
                    onClick={() => { setActiveTab("guest"); setAuthError(""); }}
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
                    onClick={() => { setActiveTab("login"); setAuthError(""); }}
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
                    onClick={() => { setActiveTab("register"); setAuthError(""); }}
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
                    onClick={() => { setActiveTab("admin"); setAuthError(""); }}
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

                {authError && (
                  <div style={{ padding: "8px 12px", backgroundColor: "#fef2f2", color: "#dc2626", borderRadius: "8px", fontSize: "11px" }}>
                    ⚠️ {authError}
                  </div>
                )}

                {/* Form Tamu */}
                {activeTab === "guest" && (
                  <form onSubmit={handleSubmitGuest} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
                  <form onSubmit={activeTab === "login" ? handleLoginMember : handleRegisterMember} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
                      disabled={authLoading}
                      style={{
                        padding: "10px",
                        backgroundColor: activeTab === "login" ? "#059669" : "#0d9488",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        fontSize: "13px",
                        opacity: authLoading ? 0.7 : 1
                      }}
                    >
                      {authLoading ? "Memproses..." : activeTab === "login" ? "Masuk Member →" : "Buat Akun Member ✨"}
                    </button>
                  </form>
                )}

                {/* Form Admin Login */}
                {activeTab === "admin" && (
                  <form onSubmit={handleLoginAdmin} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ fontSize: "11px", color: "#b45309", fontWeight: "bold" }}>
                      👑 Masuk Sebagai Pemilik/Operator:
                    </div>
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@email.com"
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
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Password Admin..."
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
                      disabled={authLoading}
                      style={{
                        padding: "10px",
                        backgroundColor: "#d97706",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        fontSize: "13px",
                        opacity: authLoading ? 0.7 : 1
                      }}
                    >
                      {authLoading ? "Memverifikasi..." : "Masuk Sebagai Admin 👑"}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* CHAT MESSAGES */
              <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "12px", marginTop: "40px" }}>
                    Ruang obrolan masih sepi. Sapa semua orang sekarang! 👋
                  </div>
                ) : (
                  messages.map((m) => {
                    // System message
                    if (m.isSystem) {
                      return (
                        <div key={m.id} style={{ textAlign: "center", margin: "4px 0" }}>
                          <span
                            style={{
                              backgroundColor: "#f1f5f9",
                              color: "#475569",
                              fontSize: "10px",
                              padding: "3px 10px",
                              borderRadius: "12px",
                              border: "1px solid #e2e8f0",
                              display: "inline-block"
                            }}
                          >
                            {m.content}
                          </span>
                        </div>
                      );
                    }

                    const isAdmin = m.senderType === "AGENT";
                    const isMember = m.senderType === "MEMBER";
                    const isMe =
                      (currentAdmin && isAdmin && m.senderId === currentAdmin.id) ||
                      (currentMember && isMember && m.senderId === currentMember.id) ||
                      (!currentAdmin && !currentMember && !isAdmin && !isMember && m.senderName === guestName);

                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: isMe ? "flex-end" : "flex-start",
                          maxWidth: "85%",
                          display: "flex",
                          flexDirection: "column"
                        }}
                      >
                        {/* SENDER BADGE & BAN BUTTON */}
                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: "bold",
                            marginBottom: "2px",
                            color: isAdmin ? "#d97706" : isMember ? "#059669" : "#64748b",
                            textAlign: isMe ? "right" : "left",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            justifyContent: isMe ? "flex-end" : "flex-start"
                          }}
                        >
                          <span>{m.senderName || (isAdmin ? "Admin" : "Tamu")}</span>
                          <span style={{ opacity: 0.75, fontWeight: "normal", fontSize: "9px" }}>
                            {isAdmin ? "👑 Admin" : isMember ? "👤 Member" : "💬 Tamu"}
                          </span>

                          {/* Tombol 1-Click Ban untuk Admin */}
                          {currentAdmin && !isAdmin && (
                            <button
                              onClick={() => handleQuickBan(m.senderName)}
                              title={`Blokir "${m.senderName}"`}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#ef4444",
                                cursor: "pointer",
                                fontSize: "9px",
                                padding: "0 2px",
                                fontWeight: "bold"
                              }}
                            >
                              [Ban]
                            </button>
                          )}

                          {/* Tombol Hapus Pesan untuk Admin */}
                          {currentAdmin && (
                            <button
                              onClick={() => handleDeleteMessage(m.id)}
                              title="Hapus pesan ini"
                              style={{
                                background: "none",
                                border: "none",
                                color: "#94a3b8",
                                cursor: "pointer",
                                fontSize: "9px",
                                padding: "0 2px",
                                fontWeight: "bold"
                              }}
                            >
                              [Hapus]
                            </button>
                          )}
                        </div>

                        <div
                          style={{
                            padding: "9px 13px",
                            borderRadius: "14px",
                            borderBottomRightRadius: isMe ? "2px" : "14px",
                            borderBottomLeftRadius: isMe ? "14px" : "2px",
                            backgroundColor: isMe ? "#4f46e5" : isAdmin ? "#f8fafc" : "#f1f5f9",
                            color: isMe ? "#ffffff" : "#0f172a",
                            boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
                            border: isMe ? "none" : isAdmin ? "1px solid #cbd5e1" : "1px solid #e2e8f0",
                            fontSize: "13px",
                            lineHeight: "1.4"
                          }}
                        >
                          {m.attachmentUrl && (
                            <div style={{ marginBottom: "6px" }}>
                              <img
                                src={m.attachmentUrl}
                                alt="Lampiran"
                                onClick={() => setLightboxImg(m.attachmentUrl!)}
                                title="Klik untuk memperbesar"
                                style={{
                                  maxWidth: "100%",
                                  maxHeight: "180px",
                                  borderRadius: "8px",
                                  objectFit: "cover",
                                  display: "block",
                                  cursor: "pointer"
                                }}
                              />
                            </div>
                          )}
                          {m.content && <div>{m.content}</div>}
                          <div
                            style={{
                              fontSize: "9px",
                              marginTop: "3px",
                              textAlign: "right",
                              opacity: 0.75
                            }}
                          >
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* FOOTER INPUT */}
          {isJoined && (
            <div style={{ padding: "10px 14px", borderTop: "1px solid #e2e8f0", backgroundColor: "#ffffff" }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                style={{ display: "none" }}
              />
              <form onSubmit={handleSend} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  title="Unggah Gambar (Maks 5 MB)"
                  style={{
                    padding: "8px 10px",
                    backgroundColor: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    opacity: uploading ? 0.5 : 1
                  }}
                >
                  +
                </button>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    uploading
                      ? "Sedang mengunggah (maks 5MB)..."
                      : slowModeCooldown > 0 && !currentAdmin
                      ? `⏳ Tunggu ${slowModeCooldown}s...`
                      : "Ketik pesan..."
                  }
                  disabled={uploading || (slowModeCooldown > 0 && !currentAdmin)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    outline: "none"
                  }}
                />
                <button
                  type="submit"
                  disabled={(!inputValue.trim() && !uploading) || uploading || (slowModeCooldown > 0 && !currentAdmin)}
                  style={{
                    padding: "8px 14px",
                    backgroundColor: "#4f46e5",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontSize: "13px",
                    opacity: (!inputValue.trim() && !uploading) || uploading || (slowModeCooldown > 0 && !currentAdmin) ? 0.5 : 1
                  }}
                >
                  {slowModeCooldown > 0 && !currentAdmin ? `(${slowModeCooldown}s)` : "Kirim"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* FLOATING ACTION BUTTON (FAB) */}
      <button
        onClick={handleToggle}
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: "#4f46e5",
          color: "#ffffff",
          border: "none",
          boxShadow: "0 8px 20px rgba(79, 70, 229, 0.4)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          float: "right",
          transition: "transform 0.2s"
        }}
      >
        {isOpen ? (
          <span style={{ fontSize: "22px" }}>✕</span>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>

      {/* Lightbox Pop-up Modal Gambar */}
      {lightboxImg && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            zIndex: 99999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            cursor: "zoom-out"
          }}
          onClick={() => setLightboxImg(null)}
        >
          <div style={{ position: "relative", maxWidth: "90%", maxHeight: "90%" }}>
            <div
              style={{
                position: "absolute",
                top: "-36px",
                right: "0px",
                color: "#ffffff",
                fontSize: "13px",
                cursor: "pointer",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                padding: "3px 12px",
                borderRadius: "20px"
              }}
              onClick={() => setLightboxImg(null)}
            >
              ✕ Tutup
            </div>
            <img
              src={lightboxImg}
              alt="Pratinjau"
              style={{
                maxWidth: "100%",
                maxHeight: "85vh",
                borderRadius: "8px",
                objectFit: "contain",
                cursor: "default",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)"
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Injeksi otomatis ke DOM
const container = document.createElement("div");
container.id = "livechat-widget-root";
document.body.appendChild(container);
const root = createRoot(container);
root.render(<LiveChatWidget />);
