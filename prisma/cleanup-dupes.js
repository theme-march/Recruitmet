const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function clean() {
  const cands = await prisma.candidate.findMany({
    include: {
      files: {
        include: {
          payments: true,
          visas: true,
          mofa: true,
          medical: true,
          passport: true,
        },
      },
    },
  });

  for (const c of cands) {
    if (c.files.length > 1) {
      console.log("Candidate with multiple files:", c.fullName, c.candidateNo, "Total files:", c.files.length);
      const sorted = [...c.files].sort((a, b) => {
        const scoreA =
          a.visas.length * 5 +
          a.mofa.length * 3 +
          a.payments.length * 4 +
          a.medical.length * 2 +
          (a.passport ? 1 : 0);
        const scoreB =
          b.visas.length * 5 +
          b.mofa.length * 3 +
          b.payments.length * 4 +
          b.medical.length * 2 +
          (b.passport ? 1 : 0);
        return scoreB - scoreA;
      });

      const duplicates = sorted.slice(1);
      for (const dup of duplicates) {
        console.log("Removing duplicate empty file:", dup.id, dup.fileNo, dup.country, "for candidate", c.fullName);
        await prisma.passportProcess.deleteMany({ where: { fileId: dup.id } });
        await prisma.workflowEvent.deleteMany({ where: { fileId: dup.id } });
        await prisma.fileStatusHistory.deleteMany({ where: { fileId: dup.id } });
        await prisma.fileAssignment.deleteMany({ where: { fileId: dup.id } });
        await prisma.processingFile.delete({ where: { id: dup.id } });
      }
    }
  }

  console.log("Cleanup completed successfully!");
  await prisma.$disconnect();
}

clean().catch(console.error);
