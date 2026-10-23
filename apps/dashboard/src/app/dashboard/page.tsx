"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Send,
  LogOut,
  Code,
  Copy,
  Check,
  Plus,
  ExternalLink,
  Laptop,
  Shield,
  Crown,
  Users,
  Settings,
  Ban,
  Clock,
  AlertTriangle,
  Trash2,
  HelpCircle
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  domain: string;
  widgetToken: string;
  _count?: { messages: number };
  messages?: { content: string; attachmentUrl?: string | null; senderName: string; createdAt: string }[];
  settings?: {
    slowModeSeconds: number;
    filterEnabled: boolean;
    filterMode: "CENSOR" | "REJECT";
    bannedWords?: string | null;
  };
}

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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Moderation Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"moderation" | "banned">("moderation");
  const [slowModeSeconds, setSlowModeSeconds] = useState(0);
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [filterMode, setFilterMode] = useState<"CENSOR" | "REJECT">("CENSOR");
  const [bannedWords, setBannedWords] = useState("");
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [newBanName, setNewBanName] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  const showToast = (message: string, type: "error" | "success" = "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cek Auth & Load Proyek
  useEffect(() => {
    const token = localStorage.getItem("livechat_token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Ambil info profile
    fetch("http://localhost:4000/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        setUser(data.user);
        loadProjects(token);
        setIsAuthChecking(false);
      })
      .catch(() => {
        localStorage.removeItem("livechat_token");
        localStorage.removeItem("livechat_user");
        router.push("/login");
      });
  }, [router]);

  const loadProjects = async (token: string) => {
    try {
      const res = await fetch("http://localhost:4000/api/projects", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.projects) {
        setProjects(data.projects);
        if (data.projects.length > 0) {
          setSelectedProject((prev) => {
            if (!prev) {
              handleSelectProject(data.projects[0]);
              return data.projects[0];
            }
            return prev;
          });
        }
      }
    } catch (err) {
      console.error("Gagal memuat proyek:", err);
    }
  };

  const handleSelectProject = async (project: Project) => {
    setSelectedProject(project);
    const token = localStorage.getItem("livechat_token");
    if (!token) return;

    // Load pesan
    try {
      const res = await fetch(`http://localhost:4000/api/projects/${project.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Gagal memuat pesan:", err);
    }

    // Load settings proyek
    loadProjectSettings(project.id, token);

    // Sambungkan WebSocket
    connectWebSocket(project);
  };

  const loadProjectSettings = async (projectId: string, token: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/projects/${projectId}/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.settings) {
        setSlowModeSeconds(data.settings.slowModeSeconds || 0);
        setFilterEnabled(Boolean(data.settings.filterEnabled));
        setFilterMode(data.settings.filterMode || "CENSOR");
        setBannedWords(data.settings.bannedWords || "");
      }
    } catch (err) {
      console.error("Gagal memuat pengaturan proyek:", err);
    }
  };

  const loadBannedUsers = async (projectId: string) => {
    const token = localStorage.getItem("livechat_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:4000/api/projects/${projectId}/banned`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.bannedUsers) {
        setBannedUsers(data.bannedUsers);
      }
    } catch (err) {
      console.error("Gagal memuat pengguna diblokir:", err);
    }
  };

  const connectWebSocket = (project: Project) => {
    if (socketRef.current) {
      socketRef.current.close();
    }

    const ws = new WebSocket("ws://localhost:4000/ws");
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "join",
          projectId: project.id,
          token: project.widgetToken
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // 1. Pesan Baru
        if (data.type === "new_message" && data.message) {
          const newMsg: Message = data.message;
          if (newMsg.projectId === project.id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }

          // Perbarui cuplikan pesan di sidebar projects
          setProjects((prevProjects) =>
            prevProjects.map((p) => {
              if (p.id === newMsg.projectId) {
                return {
                  ...p,
                  _count: { messages: (p._count?.messages || 0) + 1 },
                  messages: [
                    {
                      content: newMsg.content,
                      attachmentUrl: newMsg.attachmentUrl,
                      senderName: newMsg.senderName,
                      createdAt: newMsg.createdAt
                    }
                  ]
                };
              }
              return p;
            })
          );
        }

        // 2. Notifikasi Sistem (Ban / Unban / Slow Mode)
        if (data.type === "system" && data.message) {
          const sysMsg: Message = {
            id: "sys-" + Date.now() + "-" + Math.random(),
            projectId: project.id,
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

        // 4. Error Toast
        if (data.type === "error" && data.message) {
          showToast(data.message, "error");
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedProject || !socketRef.current) return;

    socketRef.current.send(
      JSON.stringify({
        type: "message",
        projectId: selectedProject.id,
        token: selectedProject.widgetToken,
        senderType: "AGENT",
        senderName: user?.name || "Admin",
        senderId: user?.id,
        content: inputMessage.trim()
      })
    );

    setInputMessage("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject || !socketRef.current) return;

    const allowedMimes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
    if (!file.type || !allowedMimes.includes(file.type.toLowerCase())) {
      showToast("Format file tidak didukung! Hanya gambar (PNG, JPG, JPEG, WEBP, GIF) yang diperbolehkan.", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast("Ukuran file terlalu besar! Maksimal ukuran gambar adalah 2 MB.", "error");
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
        showToast(data.error || "Gagal mengunggah gambar!", "error");
        return;
      }

      socketRef.current.send(
        JSON.stringify({
          type: "message",
          projectId: selectedProject.id,
          token: selectedProject.widgetToken,
          senderType: "AGENT",
          senderName: user?.name || "Admin",
          senderId: user?.id,
          content: inputMessage.trim() || "",
          attachmentUrl: data.url
        })
      );

      setInputMessage("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      showToast("Terjadi kesalahan jaringan saat mengunggah gambar: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // 1-Click Ban User dari bubble chat
  const handleQuickBan = async (targetName: string) => {
    if (!selectedProject || !socketRef.current) return;
    if (confirm(`Apakah Anda yakin ingin memblokir "${targetName}" dari ruang obrolan ini?`)) {
      socketRef.current.send(
        JSON.stringify({
          type: "message",
          projectId: selectedProject.id,
          token: selectedProject.widgetToken,
          senderType: "AGENT",
          senderName: user?.name || "Admin",
          senderId: user?.id,
          content: `/ban ${targetName}`
        })
      );
    }
  };

  // Hapus Pesan Obrolan (Admin)
  const handleDeleteMessage = (messageId: string) => {
    if (!selectedProject || !socketRef.current) return;
    if (confirm("Apakah Anda yakin ingin menghapus pesan ini untuk semua orang?")) {
      socketRef.current.send(
        JSON.stringify({
          type: "delete_message",
          token: selectedProject.widgetToken,
          projectId: selectedProject.id,
          senderType: "AGENT",
          messageId
        })
      );
    }
  };

  // Hapus Proyek (Danger Zone)
  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    const token = localStorage.getItem("livechat_token");
    if (!token) return;

    const confirmation = prompt(
      `⚠️ PERINGATAN: Tindakan ini permanen!\nKetik nama proyek "${selectedProject.name}" untuk mengonfirmasi penghapusan:`
    );

    if (confirmation !== selectedProject.name) {
      if (confirmation !== null) {
        alert("Nama proyek yang Anda ketik tidak cocok. Penghapusan dibatalkan.");
      }
      return;
    }

    try {
      const res = await fetch(`http://localhost:4000/api/projects/${selectedProject.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        alert("✅ Proyek dan seluruh riwayatnya berhasil dihapus.");
        setShowSettingsModal(false);
        const remainingProjects = projects.filter((p) => p.id !== selectedProject.id);
        setProjects(remainingProjects);
        if (remainingProjects.length > 0) {
          handleSelectProject(remainingProjects[0]);
        } else {
          setSelectedProject(null);
          setMessages([]);
        }
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menghapus proyek.");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    }
  };

  // Simpan Pengaturan Moderasi
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    const token = localStorage.getItem("livechat_token");
    if (!token) return;

    setSavingSettings(true);
    try {
      const res = await fetch(`http://localhost:4000/api/projects/${selectedProject.id}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          slowModeSeconds: Number(slowModeSeconds) || 0,
          filterEnabled,
          filterMode,
          bannedWords
        })
      });

      if (res.ok) {
        alert("✅ Pengaturan moderasi proyek berhasil disimpan!");
        setShowSettingsModal(false);
      } else {
        const d = await res.json();
        alert(d.error || "Gagal menyimpan pengaturan");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Manual Ban dari Tab Modal
  const handleManualBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newBanName.trim()) return;
    const token = localStorage.getItem("livechat_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:4000/api/projects/${selectedProject.id}/banned`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newBanName.trim() })
      });

      if (res.ok) {
        setNewBanName("");
        loadBannedUsers(selectedProject.id);
      }
    } catch (err) {
      console.error("Gagal memblokir:", err);
    }
  };

  // Unban dari Tab Modal
  const handleUnban = async (bannedId: string) => {
    if (!selectedProject) return;
    const token = localStorage.getItem("livechat_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:4000/api/projects/${selectedProject.id}/banned/${bannedId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setBannedUsers((prev) => prev.filter((b) => b.id !== bannedId));
      }
    } catch (err) {
      console.error("Gagal mencabut ban:", err);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("livechat_token");
    if (!token || !newProjectName.trim()) return;

    try {
      const res = await fetch("http://localhost:4000/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newProjectName.trim(), domain: "*" })
      });
      const data = await res.json();
      if (data.project) {
        setProjects([data.project, ...projects]);
        handleSelectProject(data.project);
        setNewProjectName("");
        setShowModal(false);
      }
    } catch (err) {
      console.error("Gagal membuat proyek:", err);
    }
  };

  const handleCopyEmbed = () => {
    if (!selectedProject) return;
    const script = `<script src="http://localhost:4000/widget.js" data-token="${selectedProject.widgetToken}"></script>`;
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem("livechat_token");
    localStorage.removeItem("livechat_user");
    router.push("/login");
  };

  if (isAuthChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-1"></div>
          <span className="text-sm font-medium">Memverifikasi Sesi...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 relative">
      {/* FLOATING TOAST NOTIFICATION MODERN */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border bg-white border-red-200 text-red-700">
          <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0 text-red-600 font-bold">
            ⚠️
          </div>
          <div className="text-xs sm:text-sm font-medium pr-2 max-w-sm">
            {toast.message}
          </div>
          <button
            onClick={() => setToast(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition shrink-0"
          >
            ✕
          </button>
        </div>
      )}
      {/* SIDEBAR: DAFTAR PROYEK (COMMUNITY ROOMS) */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full shadow-sm shrink-0">
        {/* Profile Admin Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              {user?.name ? user.name[0].toUpperCase() : "A"}
            </div>
            <div className="truncate">
              <h2 className="font-semibold text-slate-800 text-sm truncate flex items-center gap-1">
                {user?.name || "Admin"}
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">
                  Super Admin
                </span>
              </h2>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Keluar"
            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Header List Proyek */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" /> Ruang Komunitas
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Pilih proyek obrolan grup</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            title="Tambah Proyek Baru"
            className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition font-medium text-xs flex items-center gap-1 border border-indigo-200"
          >
            <Plus className="w-3.5 h-3.5" /> Baru
          </button>
        </div>

        {/* List Proyek */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {projects.length === 0 ? (
            <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center h-full">
              <MessageSquare className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
              <p className="text-sm font-medium">Belum ada proyek</p>
              <p className="text-xs text-slate-400 mt-1">
                Buat proyek pertama Anda untuk mulai mengobrol bersama komunitas.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-3 text-xs bg-indigo-600 text-white hover:bg-indigo-700 font-medium px-3 py-1.5 rounded-lg shadow-sm transition"
              >
                + Buat Proyek
              </button>
            </div>
          ) : (
            projects.map((p) => {
              const isSelected = selectedProject?.id === p.id;
              const lastMsg = p.messages && p.messages.length > 0 ? p.messages[0] : null;

              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectProject(p)}
                  className={`w-full text-left p-4 transition flex flex-col gap-1.5 ${
                    isSelected
                      ? "bg-indigo-50/80 border-l-4 border-indigo-600"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-sm truncate">
                      {p.name}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium shrink-0">
                      {p._count?.messages ?? 0} pesan
                    </span>
                  </div>

                  {/* Cuplikan Pesan Terakhir */}
                  <p className="text-xs text-slate-500 truncate">
                    {(() => {
                      if (!lastMsg) return "Ruang obrolan siap dipakai...";
                      if (lastMsg.content && lastMsg.content.trim()) {
                        return `${lastMsg.senderName}: ${lastMsg.content}`;
                      }
                      if (lastMsg.attachmentUrl) {
                        return `📷 ${lastMsg.senderName} mengirim gambar`;
                      }
                      return "Ruang obrolan siap dipakai...";
                    })()}
                  </p>
                </button>
              );
            })
          )}
        </div>

        {/* Embed Script & Akses Cepat */}
        {selectedProject && (
          <div className="p-3.5 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Code className="w-3.5 h-3.5 text-indigo-600" /> Kode Pasang (Embed)
              </span>
              <button
                onClick={handleCopyEmbed}
                className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Tersalin" : "Salin"}
              </button>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-600 break-all select-all leading-relaxed">
              {`<script src="http://localhost:4000/widget.js" data-token="${selectedProject.widgetToken}"></script>`}
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center gap-2">
              <a
                href={`/room/${selectedProject.widgetToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 py-1.5 rounded-lg transition font-medium"
              >
                <ExternalLink className="w-3 h-3" /> Room Publik
              </a>
              <a
                href={`/simulator-widget/${selectedProject.widgetToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 py-1.5 rounded-lg transition font-medium"
              >
                <Laptop className="w-3 h-3" /> Simulator
              </a>
            </div>
          </div>
        )}
      </div>

      {/* PANEL UTAMA: CHAT RUANG KOMUNITAS DENGAN MODERASI */}
      <div className="flex-1 flex flex-col h-full bg-slate-50">
        {selectedProject ? (
          <>
            {/* Top Bar Ruang Proyek */}
            <div className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <h3 className="font-bold text-slate-800 text-base leading-tight flex items-center gap-2">
                    {selectedProject.name}
                    <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      Grup Publik
                    </span>
                    {slowModeSeconds > 0 && (
                      <span className="text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Slow: {slowModeSeconds}s
                      </span>
                    )}
                    {filterEnabled && (
                      <span className="text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Filter: {filterMode}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Token: {selectedProject.widgetToken}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Tombol Pengaturan Moderasi */}
                <button
                  onClick={() => {
                    loadBannedUsers(selectedProject.id);
                    setShowSettingsModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs bg-white text-slate-700 hover:text-indigo-600 hover:border-indigo-300 font-medium px-3 py-1.5 rounded-lg border border-slate-200 transition shadow-sm"
                >
                  <Settings className="w-3.5 h-3.5 text-indigo-600" /> Moderasi &amp; Pengaturan
                </button>

                <a
                  href={`/room/${selectedProject.widgetToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium px-3 py-1.5 rounded-lg border border-indigo-200 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Room Publik
                </a>
              </div>
            </div>

            {/* Chat Area: Aliran Pesan Grup */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <MessageSquare className="w-12 h-12 mb-3 stroke-1 text-slate-300" />
                  <p className="text-base font-semibold text-slate-600">
                    Ruang obrolan masih sepi
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
                    Sebagai Admin, Anda bisa langsung mengetik pesan di bawah, atau gunakan perintah sakti seperti <code>/ban &lt;nama&gt;</code> atau <code>/slow &lt;detik&gt;</code>!
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  // Jika ini pesan notifikasi sistem
                  if (m.isSystem) {
                    return (
                      <div key={m.id} className="flex justify-center my-2">
                        <div className="bg-slate-200/80 text-slate-700 px-4 py-1.5 rounded-full text-xs font-medium border border-slate-300 shadow-sm flex items-center gap-1.5">
                          {m.content}
                        </div>
                      </div>
                    );
                  }

                  const isAgent = m.senderType === "AGENT";
                  const isMember = m.senderType === "MEMBER";

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${
                        isAgent ? "items-end" : "items-start"
                      }`}
                    >
                      {/* Label Pengirim, Badge & Tombol Moderasi */}
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-xs font-semibold text-slate-700">
                          {m.senderName || (isAgent ? "Admin" : "Tamu")}
                        </span>
                        {isAgent ? (
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                            <Crown className="w-2.5 h-2.5" /> Admin
                          </span>
                        ) : isMember ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                            <Shield className="w-2.5 h-2.5" /> Member
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-500 font-medium px-1.5 py-0.2 rounded">
                            Tamu
                          </span>
                        )}

                        {/* Tombol 1-Click Ban untuk Admin */}
                        {!isAgent && (
                          <button
                            onClick={() => handleQuickBan(m.senderName)}
                            title={`Blokir "${m.senderName}"`}
                            className="text-[10px] text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition flex items-center gap-0.5 ml-1"
                          >
                            <Ban className="w-3 h-3 text-red-500" /> Ban
                          </button>
                        )}

                        {/* Tombol Hapus Pesan untuk Admin */}
                        <button
                          onClick={() => handleDeleteMessage(m.id)}
                          title="Hapus pesan ini"
                          className="text-[10px] text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition flex items-center gap-0.5 ml-0.5"
                        >
                          <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-500" /> Hapus
                        </button>
                      </div>

                      {/* Bubble Chat */}
                      <div
                        className={`max-w-lg px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                          isAgent
                            ? "bg-indigo-600 text-white rounded-tr-none"
                            : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                        }`}
                      >
                        {m.attachmentUrl && (
                          <div className="mb-2">
                            <img
                              src={m.attachmentUrl}
                              alt="Lampiran"
                              onClick={() => setLightboxImg(m.attachmentUrl!)}
                              className="rounded-lg max-h-64 max-w-full object-cover border border-black/10 hover:opacity-90 transition cursor-pointer shadow-sm"
                              title="Klik untuk memperbesar"
                            />
                          </div>
                        )}
                        {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                        <span
                          className={`block text-[10px] mt-1.5 text-right ${
                            isAgent ? "text-indigo-200" : "text-slate-400"
                          }`}
                        >
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar Admin */}
            <div className="p-4 bg-white border-t border-slate-200">
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
                  className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition flex items-center justify-center shrink-0 disabled:opacity-50"
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
                      : `Ketik pesan atau command (/ban <nama>, /unban <nama>, /slow <detik>)...`
                  }
                  disabled={uploading}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800 disabled:bg-slate-50"
                />
                <button
                  type="submit"
                  disabled={(!inputMessage.trim() && !uploading) || uploading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium text-sm transition shrink-0 shadow-sm"
                >
                  <Send className="w-4 h-4" /> Kirim
                </button>
              </form>
              <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400 px-1">
                <span>💡 Tips Perintah Admin:</span>
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">/ban &lt;nama&gt;</span>
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">/unban &lt;nama&gt;</span>
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">/slow &lt;detik&gt;</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <MessageSquare className="w-12 h-12 mb-3 stroke-1 text-slate-300" />
            <h4 className="text-base font-semibold text-slate-600">
              Pilih Ruang Komunitas
            </h4>
            <p className="text-sm text-slate-400 max-w-sm mt-1">
              Pilih salah satu proyek di sebelah kiri untuk mulai mengobrol bersama seluruh audiens.
            </p>
          </div>
        )}
      </div>

      {/* MODAL PENGATURAN MODERASI & BAN (GEAR ICON) */}
      {showSettingsModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" /> Pengaturan Komunitas &amp; Moderasi
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proyek: <strong>{selectedProject.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Tab Selector */}
            <div className="flex border-b border-slate-200 px-6 pt-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setSettingsTab("moderation")}
                className={`py-2.5 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 ${
                  settingsTab === "moderation"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Shield className="w-4 h-4" /> Filter &amp; Slow Mode
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab("banned")}
                className={`py-2.5 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 ${
                  settingsTab === "banned"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Ban className="w-4 h-4" /> Pengguna Diblokir ({bannedUsers.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {settingsTab === "moderation" ? (
                <form onSubmit={handleSaveSettings} className="space-y-5">
                  {/* 1. SLOW MODE */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600" /> Mode Lambat (Slow Mode)
                    </label>
                    <p className="text-xs text-slate-500 mb-2.5">
                      Batasi jeda waktu pengiriman pesan antar-pengunjung (Tamu &amp; Member). Isi 0 untuk menonaktifkan.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="3600"
                        value={slowModeSeconds}
                        onChange={(e) => setSlowModeSeconds(Number(e.target.value))}
                        className="w-24 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <span className="text-xs text-slate-600 font-medium">detik per pesan</span>
                    </div>
                  </div>

                  {/* 2. FILTER KATA KASAR */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-500" /> Filter Sensor Kata Kasar
                        </label>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Aktifkan pencegahan kata kasar atau spam secara otomatis.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={filterEnabled}
                        onChange={(e) => setFilterEnabled(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    {filterEnabled && (
                      <>
                        {/* OPSI TINDAKAN SENSOR / TOLAK */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            Tindakan Jika Kata Terdeteksi:
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <label
                              className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition ${
                                filterMode === "CENSOR"
                                  ? "bg-indigo-50 border-indigo-400 text-indigo-800"
                                  : "bg-white border-slate-200 text-slate-600"
                              }`}
                            >
                              <input
                                type="radio"
                                name="filterMode"
                                value="CENSOR"
                                checked={filterMode === "CENSOR"}
                                onChange={() => setFilterMode("CENSOR")}
                              />
                              Sensor (Ganti ***)
                            </label>
                            <label
                              className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition ${
                                filterMode === "REJECT"
                                  ? "bg-rose-50 border-rose-400 text-rose-800"
                                  : "bg-white border-slate-200 text-slate-600"
                              }`}
                            >
                              <input
                                type="radio"
                                name="filterMode"
                                value="REJECT"
                                checked={filterMode === "REJECT"}
                                onChange={() => setFilterMode("REJECT")}
                              />
                              Tolak Pesan Mentah
                            </label>
                          </div>
                        </div>

                        {/* TEXTAREA DAFTAR KATA */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Daftar Kata Terlarang (Pisahkan dengan koma):
                          </label>
                          <textarea
                            rows={3}
                            value={bannedWords}
                            onChange={(e) => setBannedWords(e.target.value)}
                            placeholder="cth: anjing, babi, penipu, spam, bodoh"
                            className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* 3. DANGER ZONE: HAPUS PROYEK (KOTAK MANDIRI TERPISAH) */}
                  <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl space-y-2">
                    <h5 className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-600" /> Danger Zone (Zona Bahaya)
                    </h5>
                    <p className="text-[11px] text-red-600/90 leading-relaxed">
                      Menghapus ruang komunitas ini akan melenyapkan seluruh riwayat pesan, anggota yang diblokir, dan pengaturannya secara permanen. Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={handleDeleteProject}
                        className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus Ruang Komunitas
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSettingsModal(false)}
                      className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="px-4 py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition disabled:opacity-50"
                    >
                      {savingSettings ? "Menyimpan..." : "Simpan Pengaturan"}
                    </button>
                  </div>
                </form>
              ) : (
                /* TAB PENGGUNA DIBLOKIR */
                <div className="space-y-4">
                  {/* Form Tambah Ban Manual */}
                  <form onSubmit={handleManualBan} className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Masukkan nama pengguna yang ingin di-ban..."
                      value={newBanName}
                      onChange={(e) => setNewBanName(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition"
                    >
                      <Ban className="w-3.5 h-3.5" /> Blokir
                    </button>
                  </form>

                  {/* List Banned Users */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {bannedUsers.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        Tidak ada pengguna yang sedang diblokir di proyek ini.
                      </div>
                    ) : (
                      bannedUsers.map((bu) => (
                        <div key={bu.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                          <div>
                            <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                              <Ban className="w-3.5 h-3.5 text-red-500" /> {bu.username || bu.guestName}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Oleh {bu.bannedBy} • {new Date(bu.bannedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnban(bu.id)}
                            className="px-2.5 py-1 text-[11px] bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 font-semibold rounded-lg transition"
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

      {/* Modal Tambah Proyek Baru */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-bold text-slate-800 mb-4">
              Tambah Ruang Komunitas (Proyek Baru)
            </h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nama Ruang / Website
                </label>
                <input
                  type="text"
                  required
                  placeholder="cth: Komunitas Anime, Toko Sepatu, dll"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  Buat Ruang
                </button>
              </div>
            </form>
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
