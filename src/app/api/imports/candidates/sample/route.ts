import { withApiAccess } from "@/lib/api-access";
import { getSession } from "@/lib/session";
import { AppError, errorResponse } from "@/lib/errors";

async function GETHandler() {
  try {
    const session = await getSession();
    if (!session) {
      throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    }

    const csv =
      "fullName,phone,passportNo,nationalId,profession,preferredCountry,source\r\n" +
      "Example Worker,01700000000,A01234567,1999000000001,Electrician,Saudi Arabia,CSV Import\r\n";

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=candidates-v1.0.csv",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export const GET = withApiAccess("imports/candidates/sample", GETHandler);
