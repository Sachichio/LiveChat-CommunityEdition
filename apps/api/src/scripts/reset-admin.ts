import { db } from "@livechat/database";

const args = process.argv.slice(2);
const email = args[0] || "sacchio@gmail.com";
const newPassword = args[1] || "rahasia123";
const name = args[2] || "Admin Lobbio";

async function resetAdmin() {
  console.log(`\n⏳ Menyiapkan akun Admin untuk: ${email}...`);

  try {
    const hashedPassword = await Bun.password.hash(newPassword);

    const user = await db.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role: "ADMIN"
      },
      create: {
        email,
        password: hashedPassword,
        name,
        role: "ADMIN"
      }
    });

    // Pastikan ada default project
    let project = await db.project.findFirst({
      where: { ownerId: user.id }
    });

    if (!project) {
      project = await db.project.create({
        data: {
          name: "Website Saya",
          domain: "*",
          ownerId: user.id
        }
      });

      await db.projectSettings.create({
        data: {
          projectId: project.id,
          slowModeSeconds: 0,
          filterEnabled: false,
          filterMode: "CENSOR",
          bannedWords: ""
        }
      });
    }

    console.log(`\n==========================================`);
    console.log(`🎉 BERHASIL! Akun Admin siap digunakan:`);
    console.log(`📧 Email   : ${user.email}`);
    console.log(`🔑 Password: ${newPassword}`);
    console.log(`👑 Role    : ${user.role}`);
    console.log(`📁 Proyek  : ${project.name} (${project.widgetToken})`);
    console.log(`==========================================\n`);
    process.exit(0);
  } catch (err: any) {
    console.error(`\n❌ Gagal mengatur akun Admin:`, err.message || err);
    process.exit(1);
  }
}

resetAdmin();
