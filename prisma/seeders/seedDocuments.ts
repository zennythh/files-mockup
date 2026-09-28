import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

// Seed data

const documentTypes = [
  {
    docTypeName: "Student Record",
    description: "Academic records for enrolled students.",
    namingRule: "[DocumentType]-[RecordNumber]-[Date]",
    retentionPeriod: 2555, // ~7 years
  },
  {
    docTypeName: "Employee Record",
    description: "HR records for employees.",
    namingRule: "[DocumentType]-[RecordNumber]-[Date]",
    retentionPeriod: 3650, // ~10 years
  },
];

const categories = [
  { categoryName: "Academic Records", description: "Documents related to student academics." },
  { categoryName: "Employee Records", description: "Documents related to employee HR files." },
];

const tags = [
  { tagName: "enrollment", description: "Related to student enrollment." },
  { tagName: "2026", description: "Processed in academic/fiscal year 2026." },
  { tagName: "hr", description: "Human resources related document." },
  { tagName: "verified", description: "Document has been verified by staff." },
  { tagName: "certificate", description: "Certificate-type document." },
];

// Metadata field 
const metadataFieldDefs: Record<
  string,
  { fieldName: string; fieldType: string; isRequired: boolean }[]
> = {
  "Student Record": [
    { fieldName: "Student Number", fieldType: "Short text", isRequired: true },
    { fieldName: "Full Name", fieldType: "Short text", isRequired: true },
    { fieldName: "Program", fieldType: "Short text", isRequired: true },
    { fieldName: "Year Level", fieldType: "Number", isRequired: true },
    { fieldName: "Academic Year", fieldType: "Short text", isRequired: true },
  ],
  "Employee Record": [
    { fieldName: "Employee ID", fieldType: "Short text", isRequired: true },
    { fieldName: "Employee Name", fieldType: "Short text", isRequired: true },
    { fieldName: "Department", fieldType: "Short text", isRequired: true },
    { fieldName: "Document Type", fieldType: "Short text", isRequired: true },
    { fieldName: "Date", fieldType: "Date", isRequired: true },
  ],
};

interface SeedDocumentInput {
  title: string;
  fileName: string;
  docTypeName: string;
  categoryName: string;
  tagNames: string[];
  scannedByEmail: string;
  extractedText: string;
  pageCount: number;
  metadata: Record<string, string>;
}

const documentsToSeed: SeedDocumentInput[] = [
  {
    title: "Enrollment Form - Santos, Elena",
    fileName: "STUDENTRECORD-2026-00125-20260904.pdf",
    docTypeName: "Student Record",
    categoryName: "Academic Records",
    tagNames: ["enrollment", "2026"],
    scannedByEmail: "maria@files.local",
    extractedText:
      "Enrollment Form. Name: Santos, Elena. Program: BS Information Technology. Year Level: 2. Academic Year: 2026-2027.",
    pageCount: 2,
    metadata: {
      "Student Number": "2026-00125",
      "Full Name": "Santos, Elena",
      "Program": "BS Information Technology",
      "Year Level": "2",
      "Academic Year": "2026-2027",
    },
  },
  {
    title: "201 File - Dela Cruz, Mark",
    fileName: "EMPLOYEERECORD-2026-00042-20260905.pdf",
    docTypeName: "Employee Record",
    categoryName: "Employee Records",
    tagNames: ["hr", "verified"],
    scannedByEmail: "john@files.local",
    extractedText:
      "Employee 201 File. Employee ID: EMP-00042. Employee Name: Dela Cruz, Mark. Department: Records Management. Document Type: Personnel File.",
    pageCount: 3,
    metadata: {
      "Employee ID": "EMP-00042",
      "Employee Name": "Dela Cruz, Mark",
      "Department": "Records Management",
      "Document Type": "Personnel File",
      "Date": "2026-09-05",
    },
  },
  {
    title: "Certificate of Employment - Bautista, Rosa",
    fileName: "EMPLOYEERECORD-2026-00043-20260906.pdf",
    docTypeName: "Employee Record",
    categoryName: "Employee Records",
    tagNames: ["certificate"],
    scannedByEmail: "maria@files.local",
    extractedText:
      "This is to certify that Bautista, Rosa has been employed as Records Officer since June 2023.",
    pageCount: 1,
    metadata: {
      // Not present in extractedText
      "Employee ID": "EMP-00099",
      "Employee Name": "Bautista, Rosa",
      "Department": "Records Management",
      "Document Type": "Certificate of Employment",
      "Date": "2026-09-06",
    },
  },
];

async function main() {
  console.log("Seeding scanner...");
  const scanner = await prisma.scanner.upsert({
    where: { scannerSerial: "FILES-SCN-0001" },
    update: {},
    create: {
      scannerName: "Front Desk Scanner 1",
      scannerSerial: "FILES-SCN-0001",
      scannerModel: "ESP32-CAM Prototype",
      location: "Records Office - Front Desk",
      status: "Ready",
      lastConnectedAt: new Date(),
    },
  });

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@files.local" } });

  console.log("Seeding document types...");
  for (const docType of documentTypes) {
    await prisma.documentType.upsert({
      where: { docTypeName: docType.docTypeName },
      update: {},
      create: docType,
    });
  }

  console.log("Seeding metadata fields...");
  for (const [docTypeName, fields] of Object.entries(metadataFieldDefs)) {
    const docType = await prisma.documentType.findUniqueOrThrow({ where: { docTypeName } });
    for (const field of fields) {
      await prisma.metadataField.upsert({
        where: { docTypeId_fieldName: { docTypeId: docType.docTypeId, fieldName: field.fieldName } },
        update: {},
        create: { ...field, docTypeId: docType.docTypeId },
      });
    }
  }

  console.log("Seeding categories...");
  for (const category of categories) {
    await prisma.category.upsert({
      where: { categoryName: category.categoryName },
      update: {},
      create: { ...category, createdBy: admin.userId },
    });
  }

  console.log("Seeding tags...");
  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { tagName: tag.tagName },
      update: {},
      create: { ...tag, createdBy: admin.userId },
    });
  }

  console.log("Seeding documents, scan sessions, pages, OCR results, access, metadata, and QR codes...");

  for (const doc of documentsToSeed) {
    const existing = await prisma.document.findFirst({ where: { fileName: doc.fileName } });
    if (existing) {
      console.log(`Skipping "${doc.title}" — already seeded.`);
      continue;
    }

    const scannedBy = await prisma.user.findUniqueOrThrow({ where: { email: doc.scannedByEmail } });
    const docType = await prisma.documentType.findUniqueOrThrow({ where: { docTypeName: doc.docTypeName } });
    const category = await prisma.category.findUniqueOrThrow({ where: { categoryName: doc.categoryName } });

    // 1. Scan session
    const scanSession = await prisma.scanSession.create({
      data: {
        scannerId: scanner.scannerId,
        userId: scannedBy.userId,
        startedAt: new Date(),
        completedAt: new Date(),
        status: "Completed",
        retryCount: 0,
      },
    });

    // 2. Document
    const document = await prisma.document.create({
      data: {
        title: doc.title,
        fileName: doc.fileName,
        storageUrl: `/storage/documents/${doc.fileName}`,
        docTypeId: docType.docTypeId,
        fileType: "PDF",
        mimeType: "application/pdf",
        fileSize: 102400 * doc.pageCount,
        pageCount: doc.pageCount,
        createdBy: scannedBy.userId,
        lastUpdatedBy: scannedBy.userId,
        status: "Active",
        ocrStatus: "Completed",
      },
    });

    // 3. Pages captured during the scan session
    for (let pageNumber = 1; pageNumber <= doc.pageCount; pageNumber++) {
      await prisma.documentPage.create({
        data: {
          documentId: document.documentId,
          scanSessionId: scanSession.sessionId,
          pageNumber,
          originalPath: `/storage/scans/${scanSession.sessionId}/page-${pageNumber}.jpg`,
          processedPath: `/storage/processed/${document.documentId}/page-${pageNumber}.jpg`,
          status: "Processed",
        },
      });
    }

    // 4. OCR result for the combined document
    await prisma.oCRResult.create({
      data: {
        documentId: document.documentId,
        extractedText: doc.extractedText,
        status: "Completed",
        attemptNumber: 1,
        completedAt: new Date(),
      },
    });

    // 5. Access
    await prisma.documentAccess.createMany({
      data: [
        { userId: scannedBy.userId, documentId: document.documentId, accessType: "Owner" },
        { userId: admin.userId, documentId: document.documentId, accessType: "Full" },
      ],
      skipDuplicates: true,
    });

    // 6. Category and tag associations
    await prisma.documentCategory.create({
      data: { documentId: document.documentId, categoryId: category.categoryId },
    });

    for (const tagName of doc.tagNames) {
      const tag = await prisma.tag.findUniqueOrThrow({ where: { tagName } });
      await prisma.documentTag.create({
        data: { documentId: document.documentId, tagId: tag.tagId },
      });
    }

    // 7. Metadata values
    for (const [fieldName, fieldValue] of Object.entries(doc.metadata)) {
      const field = await prisma.metadataField.findUniqueOrThrow({
        where: { docTypeId_fieldName: { docTypeId: docType.docTypeId, fieldName } },
      });
      await prisma.documentMetadata.create({
        data: { documentId: document.documentId, fieldId: field.fieldId, fieldValue },
      });
    }

    // 8. QR code generated
    await prisma.qRCode.create({
      data: {
        qrValue: `FILES-${document.documentId}-${Date.now()}`,
        documentId: document.documentId,
        status: "Active",
      },
    });

    console.log(`Seeded "${doc.title}" with ${doc.pageCount} page(s).`);
  }

  console.log("Documents seeded successfully!");
}

main()
  .catch((error) => {
    console.error("Error while seeding documents:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });