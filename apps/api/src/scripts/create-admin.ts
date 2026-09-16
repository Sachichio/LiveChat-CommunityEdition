import { db } from "@livechat/database";

// Ambil argumen dari terminal: bun run seed:admin <email> <password> <nama>
const args = process.argv.slice(2);
const email = args[0];
const password = args[1];
const name = args.slice(2).join(" "); // Gabungkan argumen ketiga dan seterusnya menjadi satu nama

if (!email || !password || !name) {
  console.log(`
❌ Argumen tidak lengkap!

Format Penggunaan:
  bun run seed:admin <email> <password> "<nama_lengkap>"

Contoh:
  bun run seed:admin admin2@email.com rahasia123 "Admin Kedua"
  `);
  process.exit(1);
}

async function createAdmin() {
  console.log(`\n⏳ Sedang memproses pembuatan akun Admin untuk: ${email}...`);

  try {
    const existing = await db.user.findUnique({
      where: { email }
    });

    if (existing) {
      console.log(`❌ Error: Email "${email}" sudah terdaftar di database!\n`);
      process.exit(1);
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

    // Buat default project untuk admin ini
    const project = await db.project.create({
      data: {
        name: "Website Saya",
        domain: "*",
        ownerId: user.id
      }
    });

    console.log(`
✅ AKUN ADMIN BERHASIL DIBUAT!
------------------------------------------------
ID User       : ${user.id}
Nama Lengkap  : ${user.name}
Email         : ${user.email}
Role          : ${user.role}
Project Bawaan: ${project.name} (Token: ${project.widgetToken})
------------------------------------------------
💡 Silakan login di http://localhost:3000/login menggunakan email & password di atas.
    `);

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Gagal membuat akun admin:", error.message || error);
    process.exit(1);
  }
}

createAdmin();
