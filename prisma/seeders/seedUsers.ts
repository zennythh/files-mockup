import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding users...");

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { roleName: "Administrator" } });
  const staffRole = await prisma.role.findUniqueOrThrow({ where: { roleName: "Authorized Staff" } });

  const users = [
    {
      email: "admin@files.local",
      roleId: adminRole.roleId,
      firstName: "Adrian",
      lastName: "Santos",
      passwordHash: "$2b$12$exampleHashAdmin",
      status: "Active",
    },
    {
      email: "maria@files.local",
      roleId: staffRole.roleId,
      firstName: "Maria",
      lastName: "Reyes",
      passwordHash: "$2b$12$exampleHashMaria",
      status: "Active",
    },
    {
      email: "john@files.local",
      roleId: staffRole.roleId,
      firstName: "John",
      lastName: "Dela Cruz",
      passwordHash: "$2b$12$exampleHashJohn",
      status: "Active",
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
  }

  console.log("Users seeded successfully!");
}

main()
  .catch((error) => {
    console.error("Error while seeding:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });