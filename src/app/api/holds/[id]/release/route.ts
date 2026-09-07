import { withApiAccess } from "@/lib/api-access";
export const POST = withApiAccess("holds/[id]/release", POSTHandler);
import {z} from "zod"; import {getSession} from "@/lib/session"; import {AppError,errorResponse} from "@/lib/errors"; import {releaseHold} from "@/features/exceptions/service";
async function POSTHandler(request:Request,{params}:{params:Promise<{id:string}>}){try{const session=await getSession();if(!session)throw new AppError("UNAUTHORIZED","Sign in is required.",401);const{id}=await params,{reason}=z.object({reason:z.string().min(3)}).parse(await request.json()),file=await releaseHold(id,reason,session);return Response.json({data:{id:file.id,status:file.status}})}catch(error){return errorResponse(error)}}
