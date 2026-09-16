import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { jwt } from "@elysiajs/jwt";
import { db } from "@livechat/database";
import path from "path";

// In-memory Slow Mode Tracker (Key: `${projectId}:${senderKey}`, Value: timestamp)
const lastMessageTimes = new Map<string, number>();

const app = new Elysia()
  .use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"]
    })
  )
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "livechat-jwt-secret-key"
    })
  )
  .get("/", () => ({ status: "ok", message: "LiveChat Community Edition API & WebSocket is running 🚀" }))
  .get("/widget.js", ({ set }) => {
    set.headers["content-type"] = "application/javascript";
    const widgetPath = path.resolve(import.meta.dir, "../../widget/dist/widget.js");
    return Bun.file(widgetPath);
  })

  // --- SERVE UPLOADED FILES ---
  .get("/uploads/*", ({ params, set }) => {
    const filename = params["*"];
    const filePath = path.resolve(import.meta.dir, "../public/uploads", filename);
    const file = Bun.file(filePath);
    return file;
  })

  // --- UPLOAD GAMBAR ENDPOINT (MAX 5MB, IMAGE ONLY) ---
  .post("/api/upload", async ({ body, set }: any) => {
    try {
      const file = body?.file || body?.image;
      if (!file) {
        set.status = 400;
        return { error: "File gambar tidak ditemukan!" };
      }

      // Validasi MIME type
      if (!file.type || !file.type.startsWith("image/")) {
        set.status = 400;
        return { error: "Hanya file gambar (PNG, JPG, JPEG, GIF, WEBP) yang diizinkan!" };
      }

      // Validasi ukuran (maksimal 5 MB = 5 * 1024 * 1024 bytes)
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        set.status = 400;
        return { error: "Ukuran file terlalu besar! Maksimal 5 MB." };
      }

      const uploadDir = path.resolve(import.meta.dir, "../public/uploads");
      const ext = path.extname(file.name) || ".png";
      const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
      const destPath = path.join(uploadDir, uniqueName);

      await Bun.write(destPath, file);

      return {
        url: `http://localhost:4000/uploads/${uniqueName}`,
        fileName: file.name,
        size: file.size
      };
    } catch (err: any) {
      set.status = 500;
      return { error: "Gagal mengunggah gambar: " + (err.message || err) };
    }
  })

  // --- ADMIN & AGENT AUTH ENDPOINTS ---
  .group("/api/auth", (group) =>
    group
      .post(
        "/register",
        async ({ body, headers, set }) => {
          // LOCKDOWN KEAMANAN ADMIN: Registrasi publik dinonaktifkan
          const secret = headers["x-admin-secret"];
          const validSecret = process.env.ADMIN_REGISTER_SECRET || "SUPER_ADMIN_LIVECHAT_2026";
          if (!secret || secret !== validSecret) {
            set.status = 403;
            return { error: "Registrasi Admin publik telah dinonaktifkan demi keamanan sistem." };
          }

          const { email, password, name } = body;
          const existing = await db.user.findUnique({ where: { email } });
          if (existing) {
            set.status = 400;
            return { error: "Email sudah terdaftar" };
          }
          const hashedPassword = await Bun.password.hash(password);
          const user = await db.user.create({
            data: {
              email,
              password: hashedPassword,
              name,
              role: "ADMIN"
            }
          });

          // Default project untuk admin baru
          const defaultProject = await db.project.create({
            data: {
              name: "Website Saya",
              domain: "*",
              ownerId: user.id
            }
          });

          // Default settings
          await db.projectSettings.create({
            data: {
              projectId: defaultProject.id,
              slowModeSeconds: 0,
              filterEnabled: false,
              filterMode: "CENSOR",
              bannedWords: ""
            }
          });

          return {
            message: "Registrasi admin berhasil",
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
            defaultProject
          };
        },
        {
          body: t.Object({
            email: t.String(),
            password: t.String(),
            name: t.String()
          })
        }
      )
      .post(
        "/login",
        async ({ body, jwt, set }) => {
          const { email, password } = body;
          const user = await db.user.findUnique({ where: { email } });
          if (!user) {
            set.status = 401;
            return { error: "Email atau password salah" };
          }

          // ROLE GUARD: Hanya ADMIN dan AGENT yang boleh login
          if (user.role !== "ADMIN" && user.role !== "AGENT") {
            set.status = 403;
            return { error: "Akses ditolak: Akun ini bukan akun Admin/Agent" };
          }

          const isMatch = await Bun.password.verify(password, user.password);
          if (!isMatch) {
            set.status = 401;
            return { error: "Email atau password salah" };
          }

          const token = await jwt.sign({
            id: user.id,
            email: user.email,
            role: user.role
          });

          return {
            message: "Login berhasil",
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role }
          };
        },
        {
          body: t.Object({
            email: t.String(),
            password: t.String()
          })
        }
      )
      .get("/me", async ({ headers, jwt, set }) => {
        const auth = headers["authorization"];
        if (!auth || !auth.startsWith("Bearer ")) {
          set.status = 401;
          return { error: "Token tidak ditemukan" };
        }
        const token = auth.replace("Bearer ", "");
        const payload = await jwt.verify(token);
        if (!payload) {
          set.status = 401;
          return { error: "Token tidak valid" };
        }
        const user = await db.user.findUnique({
          where: { id: (payload as any).id },
          select: { id: true, email: true, name: true, role: true }
        });
        return { user };
      })
  )

  // --- MEMBER AUTH ENDPOINTS ---
  .group("/api/member", (group) =>
    group
      .post(
        "/register",
        async ({ body, jwt, set }) => {
          const { username, password } = body;
          const trimmedUsername = username.trim().toLowerCase();

          const existing = await db.user.findUnique({
            where: { username: trimmedUsername }
          });
          if (existing) {
            set.status = 400;
            return { error: "Username sudah digunakan, silakan pilih yang lain." };
          }

          const hashedPassword = await Bun.password.hash(password);
          const member = await db.user.create({
            data: {
              username: trimmedUsername,
              name: username.trim(),
              password: hashedPassword,
              role: "MEMBER"
            }
          });

          const token = await jwt.sign({
            id: member.id,
            username: member.username,
            role: member.role
          });

          return {
            message: "Pendaftaran member sukses!",
            token,
            member: {
              id: member.id,
              username: member.username,
              name: member.name,
              role: member.role
            }
          };
        },
        {
          body: t.Object({
            username: t.String(),
            password: t.String()
          })
        }
      )
      .post(
        "/login",
        async ({ body, jwt, set }) => {
          const { username, password } = body;
          const trimmedUsername = username.trim().toLowerCase();

          const member = await db.user.findUnique({
            where: { username: trimmedUsername }
          });
          if (!member || member.role !== "MEMBER") {
            set.status = 401;
            return { error: "Username atau password salah" };
          }

          const isMatch = await Bun.password.verify(password, member.password);
          if (!isMatch) {
            set.status = 401;
            return { error: "Username atau password salah" };
          }

          const token = await jwt.sign({
            id: member.id,
            username: member.username,
            role: member.role
          });

          return {
            message: "Login member sukses!",
            token,
            member: {
              id: member.id,
              username: member.username,
              name: member.name,
              role: member.role
            }
          };
        },
        {
          body: t.Object({
            username: t.String(),
            password: t.String()
          })
        }
      )
  )

  // --- PROJECT MANAGEMENT & MODERATION (ADMIN ONLY) ---
  .group("/api/projects", (group) =>
    group
      .get("/", async ({ headers, jwt, set }) => {
        const auth = headers["authorization"];
        if (!auth?.startsWith("Bearer ")) {
          set.status = 401;
          return { error: "Unauthorized" };
        }
        const payload = (await jwt.verify(auth.replace("Bearer ", ""))) as any;
        if (!payload || (payload.role !== "ADMIN" && payload.role !== "AGENT")) {
          set.status = 403;
          return { error: "Akses ditolak: Hanya Admin yang diizinkan" };
        }
        const projects = await db.project.findMany({
          where: { ownerId: payload.id },
          include: {
            _count: {
              select: { messages: true }
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1
            },
            settings: true
          },
          orderBy: { createdAt: "desc" }
        });
        return { projects };
      })
      .post(
        "/",
        async ({ body, headers, jwt, set }) => {
          const auth = headers["authorization"];
          if (!auth?.startsWith("Bearer ")) {
            set.status = 401;
            return { error: "Unauthorized" };
          }
          const payload = (await jwt.verify(auth.replace("Bearer ", ""))) as any;
          if (!payload || (payload.role !== "ADMIN" && payload.role !== "AGENT")) {
            set.status = 403;
            return { error: "Akses ditolak: Hanya Admin yang diizinkan" };
          }
          const project = await db.project.create({
            data: {
              name: body.name,
              domain: body.domain || "*",
              ownerId: payload.id
            },
            include: {
              _count: { select: { messages: true } },
              messages: { take: 1 },
              settings: true
            }
          });

          // Inisialisasi default settings
          await db.projectSettings.create({
            data: {
              projectId: project.id,
              slowModeSeconds: 0,
              filterEnabled: false,
              filterMode: "CENSOR",
              bannedWords: ""
            }
          });

          return { project };
        },
        {
          body: t.Object({
            name: t.String(),
            domain: t.Optional(t.String())
          })
        }
      )
      .get("/:projectId/messages", async ({ params, headers, jwt, set }) => {
        const auth = headers["authorization"];
        if (!auth?.startsWith("Bearer ")) {
          set.status = 401;
          return { error: "Unauthorized" };
        }
        const payload = (await jwt.verify(auth.replace("Bearer ", ""))) as any;
        if (!payload) {
          set.status = 403;
          return { error: "Akses ditolak" };
        }
        const messages = await db.message.findMany({
          where: { projectId: params.projectId },
          orderBy: { createdAt: "asc" },
          take: 100
        });
        return { messages };
      })
      // GET SETTINGS PROYEK
      .get("/:projectId/settings", async ({ params }) => {
        let settings = await db.projectSettings.findUnique({
          where: { projectId: params.projectId }
        });
        if (!settings) {
          settings = await db.projectSettings.create({
            data: {
              projectId: params.projectId,
              slowModeSeconds: 0,
              filterEnabled: false,
              filterMode: "CENSOR",
              bannedWords: ""
            }
          });
        }
        return { settings };
      })
      // UPDATE SETTINGS PROYEK (ADMIN ONLY)
      .put(
        "/:projectId/settings",
        async ({ params, body, headers, jwt, set }) => {
          const auth = headers["authorization"];
          if (!auth?.startsWith("Bearer ")) {
            set.status = 401;
            return { error: "Unauthorized" };
          }
          const payload = (await jwt.verify(auth.replace("Bearer ", ""))) as any;
          if (!payload || (payload.role !== "ADMIN" && payload.role !== "AGENT")) {
            set.status = 403;
            return { error: "Akses ditolak: Hanya Admin yang diizinkan" };
          }

          const { slowModeSeconds, filterEnabled, filterMode, bannedWords } = body;
          const settings = await db.projectSettings.upsert({
            where: { projectId: params.projectId },
            create: {
              projectId: params.projectId,
              slowModeSeconds: Number(slowModeSeconds) || 0,
              filterEnabled: Boolean(filterEnabled),
              filterMode: filterMode === "REJECT" ? "REJECT" : "CENSOR",
              bannedWords: bannedWords || ""
            },
            update: {
              slowModeSeconds: Number(slowModeSeconds) || 0,
              filterEnabled: Boolean(filterEnabled),
              filterMode: filterMode === "REJECT" ? "REJECT" : "CENSOR",
              bannedWords: bannedWords || ""
            }
          });

          // Notifikasi update slow mode ke room socket
          app.server?.publish(`project-id-${params.projectId}`, JSON.stringify({
            type: "slow_mode_update",
            seconds: settings.slowModeSeconds
          }));

          return { settings };
        },
        {
          body: t.Object({
            slowModeSeconds: t.Numeric(),
            filterEnabled: t.Boolean(),
            filterMode: t.String(),
            bannedWords: t.Optional(t.String())
          })
        }
      )
      // GET DAFTAR PENGGUNA DIBLOKIR
      .get("/:projectId/banned", async ({ params, headers, jwt, set }) => {
        const auth = headers["authorization"];
        if (!auth?.startsWith("Bearer ")) {
          set.status = 401;
          return { error: "Unauthorized" };
        }
        const payload = (await jwt.verify(auth.replace("Bearer ", ""))) as any;
        if (!payload || (payload.role !== "ADMIN" && payload.role !== "AGENT")) {
          set.status = 403;
          return { error: "Akses ditolak" };
        }

        const bannedUsers = await db.bannedUser.findMany({
          where: { projectId: params.projectId },
          orderBy: { bannedAt: "desc" }
        });
        return { bannedUsers };
      })
      // BAN SEORANG USER (ADMIN ONLY)
      .post(
        "/:projectId/banned",
        async ({ params, body, headers, jwt, set }) => {
          const auth = headers["authorization"];
          if (!auth?.startsWith("Bearer ")) {
            set.status = 401;
            return { error: "Unauthorized" };
          }
          const payload = (await jwt.verify(auth.replace("Bearer ", ""))) as any;
          if (!payload || (payload.role !== "ADMIN" && payload.role !== "AGENT")) {
            set.status = 403;
            return { error: "Akses ditolak" };
          }

          const { name, reason } = body;
          if (!name || !name.trim()) {
            set.status = 400;
            return { error: "Nama user wajib diisi" };
          }

          const targetName = name.trim();
          const banned = await db.bannedUser.create({
            data: {
              projectId: params.projectId,
              username: targetName,
              guestName: targetName,
              bannedBy: payload.name || "Admin",
              reason: reason || "Melanggar aturan komunitas"
            }
          });

          // Broadcast notifikasi sistem bahwa user dibanned
          app.server?.publish(`project-id-${params.projectId}`, JSON.stringify({
            type: "system",
            message: `🚫 Pengguna "${targetName}" telah diblokir oleh Admin.`
          }));

          return { banned };
        },
        {
          body: t.Object({
            name: t.String(),
            reason: t.Optional(t.String())
          })
        }
      )
      // UNBAN SEORANG USER (ADMIN ONLY)
      .delete("/:projectId/banned/:bannedId", async ({ params, headers, jwt, set }) => {
        const auth = headers["authorization"];
        if (!auth?.startsWith("Bearer ")) {
          set.status = 401;
          return { error: "Unauthorized" };
        }
        const payload = (await jwt.verify(auth.replace("Bearer ", ""))) as any;
        if (!payload || (payload.role !== "ADMIN" && payload.role !== "AGENT")) {
          set.status = 403;
          return { error: "Akses ditolak" };
        }

        const banned = await db.bannedUser.findUnique({
          where: { id: params.bannedId }
        });

        if (banned) {
          await db.bannedUser.delete({
            where: { id: params.bannedId }
          });

          const targetName = banned.username || banned.guestName || "Pengguna";
          app.server?.publish(`project-id-${params.projectId}`, JSON.stringify({
            type: "system",
            message: `✅ Blokir untuk "${targetName}" telah dicabut oleh Admin.`
          }));
        }

        return { message: "Blokir berhasil dicabut" };
      })
      // HAPUS PROYEK (ADMIN ONLY)
      .delete("/:projectId", async ({ params, headers, jwt, set }) => {
        const auth = headers["authorization"];
        if (!auth?.startsWith("Bearer ")) {
          set.status = 401;
          return { error: "Unauthorized" };
        }
        const payload = (await jwt.verify(auth.replace("Bearer ", ""))) as any;
        if (!payload || (payload.role !== "ADMIN" && payload.role !== "AGENT")) {
          set.status = 403;
          return { error: "Akses ditolak" };
        }

        const project = await db.project.findUnique({
          where: { id: params.projectId }
        });

        if (!project) {
          set.status = 404;
          return { error: "Proyek tidak ditemukan" };
        }

        if (project.ownerId !== payload.id) {
          set.status = 403;
          return { error: "Anda tidak berhak menghapus proyek milik akun lain" };
        }

        await db.project.delete({
          where: { id: params.projectId }
        });

        return { message: "Proyek berhasil dihapus beserta seluruh datanya" };
      })
  )

  // --- WIDGET & PUBLIC ROOM API (SHARED COMMUNITY CHAT) ---
  .group("/api/widget", (group) =>
    group
      .get("/init", async ({ query, set }) => {
        const token = query.token;
        if (!token) {
          set.status = 400;
          return { error: "Widget token wajib disertakan" };
        }
        const project = await db.project.findUnique({
          where: { widgetToken: token },
          select: {
            id: true,
            name: true,
            domain: true,
            widgetToken: true,
            settings: true
          }
        });
        if (!project) {
          set.status = 404;
          return { error: "Project / Room tidak ditemukan" };
        }
        return { project };
      })
      .get("/messages", async ({ query, set }) => {
        const token = query.token;
        if (!token) {
          set.status = 400;
          return { error: "Widget token wajib disertakan" };
        }
        const project = await db.project.findUnique({
          where: { widgetToken: token },
          select: { id: true }
        });
        if (!project) {
          set.status = 404;
          return { error: "Project tidak ditemukan" };
        }
        const messages = await db.message.findMany({
          where: { projectId: project.id },
          orderBy: { createdAt: "asc" },
          take: 100
        });
        return { messages };
      })
      .get("/settings", async ({ query, set }) => {
        const token = query.token;
        if (!token) {
          set.status = 400;
          return { error: "Widget token wajib disertakan" };
        }
        const project = await db.project.findUnique({
          where: { widgetToken: token },
          select: { id: true, settings: true }
        });
        if (!project) {
          set.status = 404;
          return { error: "Project tidak ditemukan" };
        }
        return { settings: project.settings };
      })
  )

  // --- WEBSOCKET FOR REALTIME COMMUNITY CHAT & MODERATION ---
  .ws("/ws", {
    body: t.Object({
      type: t.String(),
      token: t.Optional(t.String()),      // widgetToken
      projectId: t.Optional(t.String()),  // projectId (from admin dashboard)
      senderType: t.Optional(t.String()), // "VISITOR" | "AGENT" | "MEMBER"
      senderName: t.Optional(t.String()),
      senderId: t.Optional(t.String()),
      content: t.Optional(t.String()),
      attachmentUrl: t.Optional(t.String()),
      messageId: t.Optional(t.String())
    }),
    open(ws) {
      // client connected
    },
    async message(ws, message) {
      const { type, token, projectId: incomingProjectId, senderType, senderName, senderId, content, attachmentUrl, messageId } = message;

      // Selesaikan room identifier (bisa token atau projectId)
      let roomKey = "";
      let actualProjectId = incomingProjectId || "";

      if (token) {
        roomKey = `project-token-${token}`;
        if (!actualProjectId) {
          const proj = await db.project.findUnique({ where: { widgetToken: token }, select: { id: true } });
          if (proj) actualProjectId = proj.id;
        }
      } else if (incomingProjectId) {
        roomKey = `project-id-${incomingProjectId}`;
        actualProjectId = incomingProjectId;
      }

      if (type === "join") {
        if (roomKey) {
          ws.subscribe(roomKey);
          if (token && actualProjectId) {
            ws.subscribe(`project-id-${actualProjectId}`);
          } else if (incomingProjectId) {
            const proj = await db.project.findUnique({ where: { id: incomingProjectId }, select: { widgetToken: true } });
            if (proj) {
              ws.subscribe(`project-token-${proj.widgetToken}`);
            }
          }
          ws.send({
            type: "joined",
            room: roomKey,
            message: "Terhubung ke ruang obrolan komunitas"
          });
        }
        return;
      }

      // --- PENANGANAN HAPUS PESAN (ADMIN ONLY) ---
      if (type === "delete_message" && messageId) {
        const finalSenderType = senderType === "AGENT" ? "AGENT" : "VISITOR";
        if (finalSenderType !== "AGENT") {
          ws.send({ type: "error", message: "Hanya Admin yang berhak menghapus pesan obrolan!" });
          return;
        }

        try {
          const targetMessage = await db.message.findUnique({
            where: { id: messageId }
          });

          if (targetMessage) {
            await db.message.delete({
              where: { id: messageId }
            });

            const delPayload = {
              type: "message_deleted",
              messageId
            };

            if (roomKey) ws.publish(roomKey, delPayload);
            if (actualProjectId) ws.publish(`project-id-${actualProjectId}`, delPayload);
            if (token) ws.publish(`project-token-${token}`, delPayload);
            ws.send(delPayload);
          }
        } catch (err: any) {
          console.error("Gagal menghapus pesan:", err);
          ws.send({ type: "error", message: "Gagal menghapus pesan dari server" });
        }
        return;
      }

      if (type === "message" && (content || attachmentUrl)) {
        if (!actualProjectId) {
          if (token) {
            const proj = await db.project.findUnique({ where: { widgetToken: token }, select: { id: true } });
            if (proj) actualProjectId = proj.id;
          }
        }

        if (!actualProjectId) {
          ws.send({ type: "error", message: "Proyek tidak ditemukan" });
          return;
        }

        const finalSenderType =
          senderType === "AGENT"
            ? "AGENT"
            : senderType === "MEMBER"
            ? "MEMBER"
            : "VISITOR";

        const finalSenderName = (senderName && senderName.trim()) ? senderName.trim() : (finalSenderType === "AGENT" ? "Admin" : "Tamu");

        // --- 1. PENANGANAN SLASH COMMAND KHUSUS ADMIN ---
        if (content && content.startsWith("/") && finalSenderType === "AGENT") {
          const parts = content.trim().split(" ");
          const cmd = parts[0].toLowerCase();
          const targetArg = parts.slice(1).join(" ").trim();

          // Command: /ban [nama]
          if (cmd === "/ban") {
            if (!targetArg) {
              ws.send({ type: "error", message: "Format: /ban <nama_user>" });
              return;
            }
            await db.bannedUser.create({
              data: {
                projectId: actualProjectId,
                username: targetArg,
                guestName: targetArg,
                bannedBy: finalSenderName,
                reason: "Diblokir melalui perintah /ban"
              }
            });

            const sysMsg = {
              type: "system",
              message: `🚫 Pengguna "${targetArg}" telah diblokir oleh Admin ${finalSenderName}.`
            };
            ws.publish(`project-id-${actualProjectId}`, sysMsg);
            if (token) ws.publish(`project-token-${token}`, sysMsg);
            ws.send(sysMsg);
            return;
          }

          // Command: /unban [nama]
          if (cmd === "/unban") {
            if (!targetArg) {
              ws.send({ type: "error", message: "Format: /unban <nama_user>" });
              return;
            }
            await db.bannedUser.deleteMany({
              where: {
                projectId: actualProjectId,
                OR: [{ username: targetArg }, { guestName: targetArg }]
              }
            });

            const sysMsg = {
              type: "system",
              message: `✅ Blokir untuk "${targetArg}" telah dicabut oleh Admin ${finalSenderName}.`
            };
            ws.publish(`project-id-${actualProjectId}`, sysMsg);
            if (token) ws.publish(`project-token-${token}`, sysMsg);
            ws.send(sysMsg);
            return;
          }

          // Command: /slow [detik]
          if (cmd === "/slow") {
            const seconds = Math.max(0, parseInt(targetArg) || 0);
            await db.projectSettings.upsert({
              where: { projectId: actualProjectId },
              create: {
                projectId: actualProjectId,
                slowModeSeconds: seconds
              },
              update: {
                slowModeSeconds: seconds
              }
            });

            const sysMsg = {
              type: "system",
              message: seconds > 0
                ? `🐢 Slow Mode diatur ke ${seconds} detik oleh Admin ${finalSenderName}.`
                : `⚡ Slow Mode telah dinonaktifkan oleh Admin ${finalSenderName}.`
            };
            ws.publish(`project-id-${actualProjectId}`, sysMsg);
            if (token) ws.publish(`project-token-${token}`, sysMsg);
            ws.send(sysMsg);

            // Broadcast update slow mode
            const updateMsg = { type: "slow_mode_update", seconds };
            ws.publish(`project-id-${actualProjectId}`, updateMsg);
            if (token) ws.publish(`project-token-${token}`, updateMsg);
            ws.send(updateMsg);
            return;
          }
        }

        // --- 2. CEK APAKAH PENGIRIM DIBLOKIR (BANNED CHECK) ---
        if (finalSenderType !== "AGENT") {
          const isBanned = await db.bannedUser.findFirst({
            where: {
              projectId: actualProjectId,
              OR: [
                { username: { equals: finalSenderName } },
                { guestName: { equals: finalSenderName } }
              ]
            }
          });

          if (isBanned) {
            ws.send({
              type: "error",
              message: "🚫 Anda telah diblokir dari ruang obrolan ini oleh Admin!"
            });
            return;
          }
        }

        // Ambil pengaturan proyek
        let settings = await db.projectSettings.findUnique({
          where: { projectId: actualProjectId }
        });

        // --- 3. CEK SLOW MODE (HANYA UNTUK TAMU & MEMBER) ---
        if (finalSenderType !== "AGENT" && settings && settings.slowModeSeconds > 0) {
          const senderKey = `${actualProjectId}:${senderId || finalSenderName}`;
          const lastTime = lastMessageTimes.get(senderKey) || 0;
          const now = Date.now();
          const elapsedSec = Math.floor((now - lastTime) / 1000);

          if (elapsedSec < settings.slowModeSeconds) {
            const remaining = settings.slowModeSeconds - elapsedSec;
            ws.send({
              type: "error",
              message: `🐢 Slow Mode aktif! Harap tunggu ${remaining} detik lagi sebelum mengirim pesan.`
            });
            return;
          }
          lastMessageTimes.set(senderKey, now);
        }

        // --- 4. CEK FILTER KATA KASAR ---
        let contentToSave = content || "";
        if (finalSenderType !== "AGENT" && settings && settings.filterEnabled && settings.bannedWords && content) {
          const badWords = settings.bannedWords
            .split(",")
            .map((w) => w.trim().toLowerCase())
            .filter(Boolean);

          if (badWords.length > 0) {
            const lowerContent = content.toLowerCase();
            const foundBadWord = badWords.find((bw) => lowerContent.includes(bw));

            if (foundBadWord) {
              if (settings.filterMode === "REJECT") {
                ws.send({
                  type: "error",
                  message: "⚠️ Pesan Anda ditolak karena mengandung kata terlarang!"
                });
                return;
              } else {
                // Mode CENSOR: ganti dengan asterisks
                let censored = content;
                for (const bw of badWords) {
                  const reg = new RegExp(bw, "gi");
                  censored = censored.replace(reg, "*".repeat(bw.length));
                }
                contentToSave = censored;
              }
            }
          }
        }

        // --- 5. SIMPAN PESAN KE MYSQL ---
        const savedMessage = await db.message.create({
          data: {
            projectId: actualProjectId,
            senderType: finalSenderType as any,
            senderName: finalSenderName,
            senderId: senderId || null,
            content: contentToSave,
            attachmentUrl: attachmentUrl || null
          }
        });

        const outPayload = {
          type: "new_message",
          message: savedMessage
        };

        // Broadcast pesan ke seluruh subscriber room proyek ini
        if (roomKey) {
          ws.publish(roomKey, outPayload);
        }
        ws.publish(`project-id-${actualProjectId}`, outPayload);
        if (token) {
          ws.publish(`project-token-${token}`, outPayload);
        }

        // Kirim konfirmasi ke pengirim
        ws.send(outPayload);
      }
    },
    close(ws) {
      // client disconnected
    }
  })
  .listen(process.env.PORT || 4000);

console.log(`🦊 Elysia LiveChat Community Edition v2.0 berjalan di http://localhost:${app.server?.port}`);
