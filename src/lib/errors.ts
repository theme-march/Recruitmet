export class AppError extends Error {
  name = "AppError";
  constructor(public code:string,message:string,public status=400,public fieldErrors?:Record<string,string[]>) {
    super(message);
    this.name = "AppError";
  }
}

function isAppError(err: unknown): err is AppError {
  if (err instanceof AppError) return true;
  if (err && typeof err === "object" && "code" in err && "status" in err && typeof (err as any).status === "number") {
    return true;
  }
  return false;
}

export const errorResponse=(error:unknown)=>{
  const correlationId=crypto.randomUUID();
  if(isAppError(error)) {
    return Response.json({error:{code:error.code,message:error.message,fieldErrors:error.fieldErrors??{},correlationId}},{status:error.status});
  }
  if(error instanceof Error&&error.name==="ZodError") {
    return Response.json({error:{code:"VALIDATION_ERROR",message:"The submitted data is invalid.",fieldErrors:{},correlationId}},{status:422});
  }
  
  console.error(`[INTERNAL_ERROR ${correlationId}]:`, error);

  return Response.json({error:{code:"INTERNAL_ERROR",message:"The request could not be completed.",fieldErrors:{},correlationId}},{status:500});
};
