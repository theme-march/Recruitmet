import { withApiAccess } from "@/lib/api-access";
export const POST = withApiAccess("notifications/[id]/read", POSTHandler);
import {getSession} from "@/lib/session"; import {AppError,errorResponse} from "@/lib/errors"; import {markRead} from "@/features/notifications/service";
async function POSTHandler(_:Request,{params}:{params:Promise<{id:string}>}){try{const session=await getSession();if(!session)throw new AppError("UNAUTHORIZED","Sign in is required.",401);const{id}=await params,row=await markRead(id,session);return Response.json({data:{id:row.id,status:row.status}})}catch(error){return errorResponse(error)}}
