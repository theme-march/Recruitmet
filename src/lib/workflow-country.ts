import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

let synced = false;

export async function syncDatabaseForCallCenter() {
  if (synced) return;
  try {
    // 1. Ensure Office
    let office = await prisma.office.findFirst({ where: { code: "DHK-HO" } });
    if (!office) {
      office = await prisma.office.create({
        data: {
          code: "DHK-HO",
          name: "Dhaka Head Office",
          address: "Banani, Dhaka",
          city: "Dhaka",
          country: "Bangladesh",
          phone: "02-55001234",
          email: "dhaka@orbit.com",
        },
      });
    }

    // 2. Ensure Super Administrator and Call Center Roles
    let superAdminRole = await prisma.role.findFirst({ where: { name: "Super Administrator" } });
    if (!superAdminRole) {
      superAdminRole = await prisma.role.create({
        data: {
          name: "Super Administrator",
          description: "Full System Control and Office Oversight",
        },
      });
    }

    let callCenterRole = await prisma.role.findFirst({ where: { name: "Call Center" } });
    if (!callCenterRole) {
      callCenterRole = await prisma.role.create({
        data: {
          name: "Call Center",
          description: "Office Call Center Panel Role",
        },
      });
    }

    // 3. Password Hash for Admin@123
    const defaultPasswordHash = await bcrypt.hash("Admin@123", 12);

    // 4. Ensure Super Admin User
    const superAdminUser = await prisma.user.findFirst({ where: { OR: [{ email: "admin@orbit.com" }, { username: "admin" }] } });
    if (superAdminUser) {
      await prisma.user.update({
        where: { id: superAdminUser.id },
        data: {
          name: "Ahmed Rahman",
          email: "admin@orbit.com",
          username: "admin",
          status: "ACTIVE",
          passwordHash: defaultPasswordHash,
          roleId: superAdminRole.id,
          officeId: office.id,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          name: "Ahmed Rahman",
          email: "admin@orbit.com",
          username: "admin",
          employeeId: "EMP-ADMIN",
          status: "ACTIVE",
          passwordHash: defaultPasswordHash,
          roleId: superAdminRole.id,
          officeId: office.id,
        },
      });
    }

    // 5. Ensure Active Call Center Users
    const targetOfficers = [
      { email: "callcenter@orbit.com", username: "callcenter", name: "Call Center Officer", employeeId: "EMP-001" },
    ];

    for (const u of targetOfficers) {
      try {
        const existing = await prisma.user.findFirst({
          where: {
            OR: [
              { email: u.email },
              { username: u.username },
              { employeeId: u.employeeId },
            ],
          },
        });
        if (existing) {
          await prisma.user.update({
            where: { id: existing.id },
            data: {
              email: u.email,
              username: u.username,
              name: u.name,
              status: "ACTIVE",
              passwordHash: defaultPasswordHash,
              roleId: callCenterRole.id,
              officeId: office.id,
            },
          });
        } else {
          await prisma.user.create({
            data: {
              ...u,
              status: "ACTIVE",
              passwordHash: defaultPasswordHash,
              roleId: callCenterRole.id,
              officeId: office.id,
            },
          });
        }
      } catch (err) {
        console.warn("User sync warning for:", u.email, err);
      }
    }

    // 6. Delete unnecessary legacy users
    const legacyEmails = [
      "registration@orbit.com",
      "processing@orbit.com",
      "accounts@orbit.com",
      "documents@orbit.com",
      "flight@orbit.com",
      "office@orbit.com",
      "agent@orbit.com",
      "vendor@orbit.com",
      "auditor@orbit.com",
      "management@orbit.com",
    ];
    await prisma.user.deleteMany({
      where: { email: { in: legacyEmails } },
    }).catch(() => {});

    // 7. Delete all other legacy roles from database except Super Administrator and Call Center
    await prisma.rolePermission.deleteMany({
      where: { roleId: { notIn: [superAdminRole.id, callCenterRole.id] } },
    }).catch(() => {});
    // 8. Ensure all confirmed/interview candidates have active ProcessingFiles
    const candidates = await prisma.candidate.findMany({
      include: {
        files: true,
        interviews: { include: { schedule: true } },
        calls: true,
      },
    });

    for (const cand of candidates) {
      const interview = cand.interviews[0];
      const lead = cand.calls[0];
      let country = cand.preferredCountry || "Saudi Arabia";
      if (interview?.schedule?.company && /sobha|dubai|uae/i.test(interview.schedule.company)) {
        country = "Dubai";
      } else if (cand.preferredCountry && /dubai|uae/i.test(cand.preferredCountry)) {
        country = "Dubai";
      } else if (cand.preferredCountry && /saudi/i.test(cand.preferredCountry)) {
        country = "Saudi Arabia";
      } else if (cand.preferredCountry) {
        country = cand.preferredCountry;
      }

      const existingFile = cand.files[0];
      if (existingFile) {
        await prisma.processingFile.update({
          where: { id: existingFile.id },
          data: {
            country,
            status: "ACTIVE",
            company: interview?.schedule?.company || existingFile.company || "Saudi Binladen Group",
            profession: interview?.schedule?.profession || existingFile.profession || cand.profession || "Electrician / Plumber",
            currentStage: existingFile.currentStage || "Passport Entry",
          },
        }).catch(() => {});
      } else {
        await prisma.processingFile.create({
          data: {
            fileNo: `FILE-${Math.floor(100000 + Math.random() * 900000)}`,
            candidateId: cand.id,
            country,
            currentStage: "Passport Entry",
            status: "ACTIVE",
            company: interview?.schedule?.company || "Saudi Binladen Group",
            profession: interview?.schedule?.profession || cand.profession || "Electrician / Plumber",
          },
        }).catch(() => {});
      }
    }

    synced = true;
  } catch (err) {
    console.error("Database sync error:", err);
  }
}

export function workflowCountry(request: Request) {
  return new URL(request.url).searchParams.get("country")?.trim() || "Saudi";
}

export function workflowCountryWhere(request: Request) {
  const country = workflowCountry(request);
  if (/^other( country)?$/i.test(country)) {
    return { notIn: ["Saudi", "Saudi Arabia", "Dubai", "UAE", "United Arab Emirates"] };
  }
  return { contains: country };
}

export function workflowModule(request: Request) {
  const country = workflowCountry(request);
  if (/dubai|uae/i.test(country)) return "dubai";
  if (/^other( country)?$/i.test(country)) return "other-country";
  return "ksa";
}


