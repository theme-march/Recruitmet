import { withApiAccess } from "@/lib/api-access";
export const POST = withApiAccess("leads/[id]/convert", POSTHandler);
import {getSession} from "@/lib/session"; import {AppError,errorResponse} from "@/lib/errors"; import {convertLead} from "@/features/leads/service";
async function POSTHandler(_:Request,{params}:{params:Promise<{id:string}>}){try{const session=await getSession();if(!session)throw new AppError("UNAUTHORIZED","Sign in is required.",401);const{id}=await params;const candidate=await convertLead(id,session);return Response.json({data:{id:candidate.id,candidateNo:candidate.candidateNo}},{status:201})}catch(error){return errorResponse(error)}}
