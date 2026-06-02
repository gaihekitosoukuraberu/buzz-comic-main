import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const rawAdminPw = process.env.ADMIN_INIT_PASSWORD;
  if (!rawAdminPw) {
    throw new Error("ADMIN_INIT_PASSWORD env var is required for seeding");
  }
  const adminPassword = await bcrypt.hash(rawAdminPw, 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@buzz-comic.com" },
    update: {},
    create: {
      email: "admin@buzz-comic.com",
      name: "管理者",
      password: adminPassword,
      role: "admin",
      mustChangePassword: true,
    },
  });
  console.log(`Admin user created: ${admin.email}`);

  const configs: { key: string; value: string }[] = [
    { key: "site_name", value: "Buzz Comic" },
    { key: "site_description", value: "AI漫画投稿プラットフォーム" },
    { key: "score_cull_threshold", value: "10" },
    { key: "score_cull_days", value: "30" },
    { key: "max_panels_per_manga", value: "20" },
    { key: "auto_publish", value: "false" },
    { key: "maintenance_mode", value: "false" },
  ];

  for (const config of configs) {
    await prisma.siteConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
    console.log(`SiteConfig set: ${config.key} = ${config.value}`);
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
