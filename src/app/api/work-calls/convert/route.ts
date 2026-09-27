import { convertLeadToFile } from "@/features/leads/service";
import { withApiAccess } from "@/lib/api-access";
import { AppError, errorResponse } from "@/lib/errors";
import { getSession } from "@/lib/session";
import { z } from "zod";

const convertSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
});

async function POSTHandler(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    const { leadId } = convertSchema.parse(await request.json());
    const result = await convertLeadToFile(leadId, session);

    return Response.json({
      data: {
        fileId: result.file.id,
        candidateId: result.candidate.id,
        fileNo: result.file.fileNo,
        message: result.fileCreated
          ? "Successfully converted lead to Candidate Processing File!"
          : "Candidate file already exists",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export const POST = withApiAccess("work-calls/convert", POSTHandler);
