import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hashToken, SESSION_COOKIE } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const store = await cookies(); const token = store.get(SESSION_COOKIE)?.value;
  if (token) { const session=await prisma.session.findUnique({where:{tokenHash:hashToken(token)},include:{user:{include:{role:true}}}}); await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } }); if(session)await prisma.auditLog.create({data:{userId:session.userId,role:session.user.role.name,module:"Authentication",recordId:session.userId,action:"LOGOUT",correlationId:crypto.randomUUID()}}); }
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
