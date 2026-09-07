import { withApiAccess } from "@/lib/api-access";
export const POST = withApiAccess("imports/candidates/[id]/commit", POSTHandler);
import {getSession} from "@/lib/session"; import {AppError,errorResponse} from "@/lib/errors"; import {commitCandidateImport} from "@/features/imports/candidate-import";
async function POSTHandler(_:Request,{params}:{params:Promise<{id:string}>}){try{const session=await getSession();if(!session)throw new AppError("UNAUTHORIZED","Sign in is required.",401);const{id}=await params,result=await commitCandidateImport(id,session);return Response.json({data:result})}catch(error){return errorResponse(error)}}
