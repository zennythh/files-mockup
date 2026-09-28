import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const permissions = [
  { permissionName: "manage_users", description: "Create, update, deactivate, and manage user accounts." },
  { permissionName: "assign_roles", description: "Assign user roles and permissions." },
  { permissionName: "manage_document_types", description: "Create and manage document types/templates." },
  { permissionName: "manage_metadata_fields", description: "Create customizable metadata fields." },
  { permissionName: "manage_naming_rules", description: "Configure document naming and filing rules." },
  { permissionName: "manage_categories_tags", description: "Manage document categories and tags." },
  { permissionName: "view_records", description: "View authorized document records." },
  { permissionName: "edit_records", description: "Edit document metadata and details." },
  { permissionName: "archive_records", description: "Archive or restore document records." },
  { permissionName: "delete_records", description: "Delete document records." },
  { permissionName: "monitor_scanners", description: "Monitor scanner devices and status." },
  { permissionName: "view_activity_logs", description: "Review system activity logs." },
  { permissionName: "manage_qr_settings", description: "Configure QR-code settings and retention rules." },
  { permissionName: "manage_system_settings", description: "Manage general system settings." },
  { permissionName: "scan_upload_documents", description: "Scan or upload documents." },
  { permissionName: "convert_documents", description: "Convert uploaded/scanned documents into supported formats." },
  { permissionName: "view_ocr_text", description: "View OCR-extracted text." },
  { permissionName: "edit_ocr_results", description: "Edit OCR results when necessary." },
  { permissionName: "search_documents", description: "Search, sort, and filter documents." },
  { permissionName: "download_records", description: "View and download authorized records." },
  { permissionName: "scan_qr_code", description: "Scan QR codes using the Android application." },
  { permissionName: "view_own_activity", description: "View own permitted activity history." },
];

const roleDescriptions: Record<string, string> = {
  Administrator: "Has full access to all resources and can manage users and settings.",
  "Authorized Staff": "Can scan, upload, and manage documents within their permitted access.",
};

const rolePermissionMap: Record<string, string[]> = {
  Administrator: permissions.map((p) => p.permissionName), // full access
  "Authorized Staff": [
    "scan_upload_documents",
    "convert_documents",
    "view_ocr_text",
    "edit_ocr_results",
    "search_documents",
    "view_records",
    "download_records",
    "scan_qr_code",
    "view_own_activity",
  ],
};

async function main() {
  console.log("Seeding roles...");
  for (const roleName of Object.keys(rolePermissionMap)) {
    await prisma.role.upsert({
      where: { roleName },
      update: {},
      create: { roleName, description: roleDescriptions[roleName] },
    });
  }

  console.log("Seeding permissions...");
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { permissionName: permission.permissionName },
      update: {},
      create: permission,
    });
  }

  console.log("Linking roles to permissions...");
  for (const [roleName, permNames] of Object.entries(rolePermissionMap)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { roleName } });
    for (const permName of permNames) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { permissionName: permName },
      });
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.roleId, permissionId: permission.permissionId },
        },
        update: {},
        create: { roleId: role.roleId, permissionId: permission.permissionId },
      });
    }
  }

  console.log("Roles and permissions seeded successfully!");
}

main()
  .catch((error) => {
    console.error("Error while seeding roles:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
