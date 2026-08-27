import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { can } from "@/lib/authorization";
import { z } from "zod";

const input = z.object({ resource: z.enum(["lead","candidate","interviewSchedule","file","payment","document","flight","exception","notification","master"]), data: z.record(z.string(), z.unknown()) });
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const required = (data: Record<string, unknown>, key: string) => { const value = text(data[key]); if (!value) throw new Error(`${key} is required`); return value; };

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = input.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { resource, data } = parsed.data;
  if (!(await can(session, resource, "Add"))) return NextResponse.json({ error: "You do not have permission to create this record." }, { status: 403 });
  try {
    let record: { id: string };
    if (resource === "lead") record = await prisma.workCall.create({ data: { leadNo: `LEAD-${Date.now().toString().slice(-8)}`, fullName: required(data,"fullName"), phone: required(data,"phone"), alternatePhones: text(data.alternatePhone) ? [text(data.alternatePhone)] : undefined, country: text(data.country), workCategory: text(data.profession), company: text(data.company), source: text(data.source)||"Direct", purpose: text(data.purpose)||"Overseas employment", priority: Number(data.priority)||3, status: text(data.interviewOption)||"New", followUpAt: data.date ? new Date(text(data.date)) : null, notes: { subCategory: text(data.subCategory), interviewOption: text(data.interviewOption), note: text(data.notes) }, assignedToId: session.userId } });
    else if (resource === "candidate") record = await prisma.candidate.create({ data: { candidateNo: `CAN-${Date.now().toString().slice(-8)}`, registrationNo: `REG-${Date.now().toString().slice(-8)}`, fullName: required(data,"fullName"), phone: required(data,"phone"), passportNo: text(data.passportNo)||null, nationalId: text(data.nationalId)||null, dob: data.dateOfBirth ? new Date(text(data.dateOfBirth)) : null, profession: text(data.profession), preferredCountry: text(data.country), source: text(data.source)||"Registration", address: text(data.address)||null, officeId: session.user.officeId, status: "VERIFIED", phones: { create: [{ phone: required(data,"phone"), label: "Primary", isPrimary: true }, ...(text(data.alternatePhone) ? [{ phone: text(data.alternatePhone), label: "Alternate", isPrimary: false }] : [])] } } });
    else if (resource === "interviewSchedule") record = await prisma.interviewSchedule.create({ data: { title: required(data,"title"), company: text(data.company)||null, profession: text(data.profession)||null, scheduledAt: new Date(required(data,"scheduledAt")), venue: text(data.venue)||null, meetingUrl: text(data.meetingUrl)||null, interviewer: text(data.interviewer)||null, capacity: Number(required(data,"capacity")), instructions: text(data.instructions)||null, status: "Scheduled" } });
    else if (resource === "file") {
      const candidate = await prisma.candidate.findFirst({ where: { OR: [{ candidateNo: text(data.candidate) }, { passportNo: text(data.candidate) }, { phone: text(data.candidate) }] } });
      if (!candidate) throw new Error("Candidate ID, passport or phone not found");
      const existingFile = await prisma.processingFile.findFirst({ where: { candidateId: candidate.id, status: { notIn: ["RETURNED", "CANCELLED", "ARCHIVED"] } } });
      if (existingFile) {
        record = await prisma.processingFile.update({ where: { id: existingFile.id }, data: { country: required(data, "country"), currentStage: text(data.stage) || existingFile.currentStage, company: text(data.company) || existingFile.company, profession: text(data.profession) || candidate.profession, status: "ACTIVE" } });
      } else {
        record = await prisma.processingFile.create({ data: { fileNo: `${text(data.country).slice(0, 3).toUpperCase() || "OTH"}-${Date.now().toString().slice(-8)}`, candidateId: candidate.id, country: required(data, "country"), currentStage: text(data.stage) || "Passport Entry", company: text(data.company), profession: text(data.profession) || candidate.profession, officeId: session.user.officeId, assignedToId: session.userId, status: "ACTIVE", workflowEvents: { create: { stage: text(data.stage) || "Passport Entry", status: "In Progress", completedBy: session.user.name } } } });
      }
    }
    else if (resource === "payment") { const file=await prisma.processingFile.findUnique({where:{fileNo:required(data,"fileNo")}}); if(!file) throw new Error("File number not found"); const collectedAt=text(data.collectedAt); record=await prisma.payment.create({data:{paymentNo:`PAY-${Date.now().toString().slice(-8)}`,invoiceNo:text(data.invoiceNo)||`INV-${Date.now().toString().slice(-8)}`,fileId:file.id,candidateId:file.candidateId,type:text(data.type)||"First Payment",amount:Number(data.amount),currency:text(data.currency)||"BDT",method:text(data.method)||"Cash",reference:text(data.reference),dueDate:text(data.dueDate)?new Date(text(data.dueDate)):null,collectedAt:collectedAt?new Date(collectedAt):new Date(),collector:session.user.name,note:text(data.note),status:collectedAt||!text(data.dueDate)?"PAID":"DUE"}}); }
    else if (resource === "document") { const file=await prisma.processingFile.findUnique({where:{fileNo:required(data,"fileNo")}}); if(!file) throw new Error("File number not found"); record=await prisma.document.create({data:{documentNo:`DOC-${Date.now().toString().slice(-8)}`,fileId:file.id,candidateId:file.candidateId,type:required(data,"type"),number:text(data.number),fileName:text(data.fileName),url:text(data.fileName),issueDate:text(data.issueDate)?new Date(text(data.issueDate)):null,expiryDate:data.date?new Date(text(data.date)):null,remarks:text(data.remarks),status:"UPLOADED"}}); }
    else if (resource === "flight") record=await prisma.flight.create({data:{flightNo:required(data,"flightNo"),airline:required(data,"airline"),pnr:text(data.pnr),departureAt:new Date(required(data,"date")),arrivalAt:text(data.arrivalAt)?new Date(text(data.arrivalAt)):null,departureAirport:text(data.from)||"DAC",destination:required(data,"country"),status:"Scheduled"}});
    else if (resource === "exception") { const file=await prisma.processingFile.findUnique({where:{fileNo:required(data,"fileNo")}}); if(!file) throw new Error("File number not found"); const kind=text(data.type)||"Hold"; record=await prisma.$transaction(async tx=>{const entry=await tx.holdReturn.create({data:{fileId:file.id,type:kind.toUpperCase(),previousStage:file.currentStage,reason:required(data,"reason"),expectedRelease:text(data.expectedRelease)?new Date(text(data.expectedRelease)):null,financialImpact:text(data.financialImpact)?Number(data.financialImpact):null,note:text(data.note),status:kind==="Return"?"Returned":"On Hold",owner:session.user.name}});await tx.processingFile.update({where:{id:file.id},data:{status:kind==="Return"?"RETURNED":"HOLD"}});return entry}); }
    else if (resource === "notification") record=await prisma.notification.create({data:{recipient:required(data,"recipient"),title:required(data,"title"),message:required(data,"message"),type:text(data.type)||"Internal",priority:text(data.priority)||"Normal",channel:text(data.channel)||"In-app",status:"Sent",sentAt:new Date()}});
    else record=await prisma.masterData.create({data:{type:text(data.type)||"GENERAL",code:required(data,"code").toUpperCase(),name:required(data,"name"),description:text(data.description),country:text(data.country),config:{module:text(data.module)}}});
    await prisma.auditLog.create({data:{userId:session.userId,role:session.user.role.name,module:resource,recordId:record.id,action:"CREATE",newValue:JSON.parse(JSON.stringify(data)),correlationId:crypto.randomUUID()}});
    await prisma.activityLog.create({data:{userId:session.userId,module:resource,recordId:record.id,action:"CREATE",summary:`Created ${resource} record`}});
    return NextResponse.json({ok:true,id:record.id},{status:201});
  } catch (error) { return NextResponse.json({error:error instanceof Error?error.message:"Unable to create record"},{status:400}); }
}
