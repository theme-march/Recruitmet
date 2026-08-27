export class AppError extends Error {
  constructor(public code:string,message:string,public status=400,public fieldErrors?:Record<string,string[]>) { super(message); }
}
export const errorResponse=(error:unknown)=>{
  const correlationId=crypto.randomUUID();
  if(error instanceof AppError)return Response.json({error:{code:error.code,message:error.message,fieldErrors:error.fieldErrors??{},correlationId}},{status:error.status});
  if(error instanceof Error&&error.name==="ZodError")return Response.json({error:{code:"VALIDATION_ERROR",message:"The submitted data is invalid.",fieldErrors:{},correlationId}},{status:422});
  return Response.json({error:{code:"INTERNAL_ERROR",message:"The request could not be completed.",fieldErrors:{},correlationId}},{status:500});
};
