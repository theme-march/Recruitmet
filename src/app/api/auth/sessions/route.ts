import { withApiAccess } from "@/lib/api-access";
export const GET = withApiAccess("auth/sessions", GETHandler);
export const DELETE = withApiAccess("auth/sessions", DELETEHandler);
import { getSession } from "@/lib/session"; import { prisma } from "@/lib/prisma"; import { AppError,errorResponse } from "@/lib/errors";
async function GETHandler(){try{const session=await getSession();if(!session)throw new AppError("UNAUTHORIZED","Sign in is required.",401);const sessions=await prisma.session.findMany({where:{userId:session.userId},orderBy:{createdAt:"desc"},select:{id:true,device:true,ip:true,expiresAt:true,createdAt:true}});return Response.json({data:sessions.map(x=>({...x,current:x.id===session.id}))})}catch(error){return errorResponse(error)}}
async function DELETEHandler(request:Request){try{const session=await getSession();if(!session)throw new AppError("UNAUTHORIZED","Sign in is required.",401);const id=new URL(request.url).searchParams.get("id");if(!id)throw new AppError("VALIDATION_ERROR","Session id is required.",422);await prisma.session.deleteMany({where:{id,userId:session.userId}});return Response.json({ok:true})}catch(error){return errorResponse(error)}}
