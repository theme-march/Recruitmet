import { PrismaClient, RecordStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const modules = ["dashboard", "call-center", "registration", "common", "notifications"];
const actions = ["View", "Add", "Edit", "Delete", "Export", "Assign", "Print", "Import"];

const seedUsers = [
  ["admin@orbit.com", "admin", "EMP-000", "Ahmed Rahman", "Admin@123", "Super Administrator"],
  ["callcenter@orbit.com", "callcenter", "EMP-001", "Call Center Officer", "Admin@123", "Call Center"],
];

const candidates = [
  { candidateNo: "CAN-260001", registrationNo: "REG-260001", fullName: "Md. Rakib Hasan", phone: "01712448821", passportNo: "A09384721", nationalId: "1998456201101", profession: "Electrician", preferredCountry: "Saudi Arabia", source: "Facebook Campaign" },
  { candidateNo: "CAN-260002", registrationNo: "REG-260002", fullName: "Arif Hossain", phone: "01816204997", passportNo: "B01592743", nationalId: "1999145102231", profession: "Warehouse Assistant", preferredCountry: "Dubai", source: "Agent Referral" },
  { candidateNo: "CAN-260003", registrationNo: "REG-260003", fullName: "Jahidul Islam", phone: "01922017486", passportNo: "A08674219", nationalId: "1997054103412", profession: "Plumber", preferredCountry: "Saudi Arabia", source: "Walk-in" },
  { candidateNo: "CAN-260004", registrationNo: "REG-260004", fullName: "Nur Alam", phone: "01768342190", passportNo: "B02917465", nationalId: "1996047202312", profession: "Heavy Driver", preferredCountry: "Oman", source: "Call Center" },
  { candidateNo: "CAN-260005", registrationNo: "REG-260005", fullName: "Imran Hossain", phone: "01618834312", passportNo: "A07183465", nationalId: "1998135109023", profession: "Welder", preferredCountry: "Saudi Arabia", source: "Website" },
  { candidateNo: "CAN-260006", registrationNo: "REG-260006", fullName: "Kamal Uddin", phone: "01831622085", passportNo: "B01346820", nationalId: "1995054706321", profession: "Cleaner", preferredCountry: "Dubai", source: "Agent Referral" },
];

async function main() {
  const office = await db.office.upsert({
    where: { code: "DHK-HO" },
    update: {},
    create: { code: "DHK-HO", name: "Dhaka Head Office", address: "Banani, Dhaka", city: "Dhaka", country: "Bangladesh", phone: "02-55001234", email: "dhaka@orbit.com" },
  });

  // Create single role: Call Center
  // Create exactly 2 roles: Super Administrator and Call Center
  const superAdminRole = await db.role.upsert({
    where: { name: "Super Administrator" },
    update: { description: "Full system, role and permission access" },
    create: { name: "Super Administrator", description: "Full system, role and permission access" },
  });

  const callCenterRole = await db.role.upsert({
    where: { name: "Call Center" },
    update: { description: "Office Call Center Panel Access" },
    create: { name: "Call Center", description: "Office Call Center Panel Access" },
  });

  // Delete any other roles from database
  await db.rolePermission.deleteMany({
    where: { roleId: { notIn: [superAdminRole.id, callCenterRole.id] } },
  });
  await db.role.deleteMany({
    where: { id: { notIn: [superAdminRole.id, callCenterRole.id] } },
  });

  // Set permissions for Call Center role
  await db.rolePermission.deleteMany({ where: { roleId: callCenterRole.id } });
  for (const module of modules) {
    for (const action of actions) {
      const permission = await db.permission.upsert({
        where: { module_page_action: { module, page: "*", action } },
        update: {},
        create: { module, page: "*", action },
      });
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: callCenterRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: callCenterRole.id, permissionId: permission.id },
      });
    }
  }

  // Seed default 2 users
  for (const [email, username, employeeId, name, plainPassword, roleName] of seedUsers) {
    const passwordHash = await bcrypt.hash(plainPassword, 12);
    const assignedRoleId = roleName === "Super Administrator" ? superAdminRole.id : callCenterRole.id;
    await db.user.upsert({
      where: { email },
      update: { roleId: assignedRoleId, officeId: office.id, name, username },
      create: { name, email, username, employeeId, passwordHash, roleId: assignedRoleId, officeId: office.id },
    });
  }

  // Delete any user not in seedUsers
  await db.user.deleteMany({
    where: { email: { notIn: ["admin@orbit.com", "callcenter@orbit.com"] } },
  });

  // Seed candidates, interviews, and work calls
  const defaultOfficer = await db.user.findFirst({ where: { roleId: callCenterRole.id } });

  const schedule1 = await db.interviewSchedule.upsert({
    where: { id: "sched-demo-1" },
    update: {},
    create: {
      id: "sched-demo-1",
      title: "Saudi Technical Skilled Assessment",
      company: "Al Noor Contracting",
      profession: "Electrician / Plumber",
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      venue: "Dhaka Head Office (Banani)",
      interviewer: "Recruitment Panel",
      capacity: 50,
      instructions: "Bring original passport and educational certificates.",
      status: "Scheduled",
    },
  });

  const schedule2 = await db.interviewSchedule.upsert({
    where: { id: "sched-demo-2" },
    update: {},
    create: {
      id: "sched-demo-2",
      title: "Dubai Logistics & Warehouse Drive",
      company: "Emirates Logistics LLC",
      profession: "Warehouse Assistant",
      scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      venue: "Dhaka Head Office (Banani)",
      interviewer: "HR Delegation",
      capacity: 30,
      instructions: "Physical assessment and document verification.",
      status: "Scheduled",
    },
  });

  const companies = ["Al Noor Contracting", "Emirates Logistics LLC", "Riyadh Technical Services", "Muscat Transport Co.", "Al Faisal Industries", "Bright Facility Management"];

  for (let i = 0; i < candidates.length; i++) {
    const data = candidates[i];
    const candidate = await db.candidate.upsert({
      where: { candidateNo: data.candidateNo },
      update: { ...data, officeId: office.id },
      create: { ...data, officeId: office.id, status: RecordStatus.VERIFIED },
    });

    const workCall = await db.workCall.upsert({
      where: { leadNo: `LEAD-2600${i + 1}` },
      update: { followUpAt: new Date(Date.now() + (i % 3 === 0 ? 0 : (i + 1) * 24 * 60 * 60 * 1000)) },
      create: {
        leadNo: `LEAD-2600${i + 1}`,
        candidateId: candidate.id,
        fullName: data.fullName,
        phone: data.phone,
        country: data.preferredCountry,
        workCategory: data.profession,
        company: companies[i],
        source: data.source,
        purpose: "Overseas employment",
        priority: i === 0 ? 1 : i === 1 ? 2 : 3,
        status: i === 0 ? "New" : i === 1 ? "Follow-up" : i === 2 ? "Interview Scheduled" : "Converted",
        followUpAt: new Date(Date.now() + (i % 2 === 0 ? 0 : (i + 1) * 24 * 60 * 60 * 1000)),
        assignedToId: defaultOfficer?.id,
        notes: [{ by: "Call Center", text: "Contacted candidate, verified interest in overseas employment" }],
      },
    });

    await db.callRecord.upsert({
      where: { id: `callrec-demo-${i + 1}` },
      update: {},
      create: {
        id: `callrec-demo-${i + 1}`,
        leadId: workCall.id,
        officerId: defaultOfficer?.id,
        startedAt: new Date(),
        durationSec: 120 + i * 30,
        outcome: i === 0 ? "Connected" : "Interested",
        note: "Initial assessment completed",
      },
    });

    const targetSchedule = i % 2 === 0 ? schedule1 : schedule2;
    const existingInterview = await db.interview.findFirst({ where: { candidateId: candidate.id } });
    if (!existingInterview) {
      await db.interview.create({
        data: {
          candidateId: candidate.id,
          scheduleId: targetSchedule.id,
          title: `${data.profession} assessment`,
          company: targetSchedule.company,
          profession: data.profession,
          type: "In-person",
          scheduledAt: targetSchedule.scheduledAt,
          venue: targetSchedule.venue,
          interviewer: targetSchedule.interviewer,
          rating: 4,
          result: i < 3 ? "Scheduled" : "Selected",
        },
      });
    }
  }
}

main()
  .then(() => console.log("Database seeded with single role: Call Center"))
  .finally(() => db.$disconnect());

