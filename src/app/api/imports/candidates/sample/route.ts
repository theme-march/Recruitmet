import { withApiAccess } from "@/lib/api-access";
import { getSession } from "@/lib/session";
import { AppError, errorResponse } from "@/lib/errors";
import * as XLSX from "xlsx";

async function GETHandler(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    }

    const url = new URL(request.url);
    const format = (url.searchParams.get("format") || "xlsx").toLowerCase();

    const headers = [
      "Full Name",
      "Phone",
      "Passport No",
      "National ID",
      "Target Country",
      "Trade / Profession",
      "Agent Partner",
      "District",
      "Gender",
      "Date of Birth",
      "Passport Issue Date",
      "Passport Expiry Date",
      "Father's Name",
      "Mother's Name",
      "Present Address",
      "Marital Status",
      "Education",
      "Email",
      "Remarks / Note",
    ];

    const sampleRows = [
      [
        "Md. Rakib Hasan",
        "01712448821",
        "A09384721",
        "1998456201101",
        "Saudi Arabia",
        "Electrician",
        "Shahjalal Manpower Agency",
        "Dhaka",
        "Male",
        "1998-05-12",
        "2023-01-15",
        "2033-01-14",
        "Abdul Hasan",
        "Rokeya Begum",
        "House 12, Road 4, Mirpur, Dhaka",
        "Single",
        "SSC",
        "rakib@example.com",
        "Experienced industrial electrician",
      ],
      [
        "Arif Hossain",
        "01816204997",
        "B01592743",
        "1999145102231",
        "Dubai",
        "Warehouse Assistant",
        "Al-Ameen Travels & Tours",
        "Chittagong",
        "Male",
        "1999-08-20",
        "2022-06-10",
        "2032-06-09",
        "Anwar Hossain",
        "Fatema Khatun",
        "Halishahar, Chittagong",
        "Single",
        "HSC",
        "arif@example.com",
        "Warehouse logistics & packing experience",
      ],
      [
        "Jahidul Islam",
        "01922017486",
        "A08674219",
        "1997054103412",
        "Saudi Arabia",
        "Plumber",
        "Direct Office",
        "Tangail",
        "Male",
        "1997-03-15",
        "2021-11-05",
        "2031-11-04",
        "Nazrul Islam",
        "Jahanara Begum",
        "Tangail Sadar, Tangail",
        "Married",
        "SSC",
        "jahid@example.com",
        "Commercial pipe fitting & plumbing",
      ],
      [
        "Nur Alam",
        "01755123456",
        "B02481920",
        "1995401928374",
        "Oman",
        "Mason",
        "Al-Ameen Travels & Tours",
        "Comilla",
        "Male",
        "1995-11-04",
        "2020-09-18",
        "2030-09-17",
        "Sirajul Islam",
        "Amina Begum",
        "Laksam, Comilla",
        "Married",
        "Class 8",
        "nuralam@example.com",
        "Experienced block & tile mason",
      ],
    ];

    if (format === "csv") {
      const escape = (val: string) => `"${String(val ?? "").replaceAll('"', '""')}"`;
      const csv =
        [headers.map(escape).join(","), ...sampleRows.map((row) => row.map(escape).join(","))].join("\r\n") + "\r\n";
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=candidates_bulk_upload_template.csv",
        },
      });
    }

    // Default: Microsoft Excel .xlsx format
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws["!cols"] = [
      { wch: 22 }, // Full Name
      { wch: 16 }, // Phone
      { wch: 16 }, // Passport No
      { wch: 18 }, // National ID
      { wch: 16 }, // Target Country
      { wch: 24 }, // Trade / Profession
      { wch: 28 }, // Agent Partner
      { wch: 14 }, // District
      { wch: 10 }, // Gender
      { wch: 14 }, // Date of Birth
      { wch: 18 }, // Passport Issue Date
      { wch: 18 }, // Passport Expiry Date
      { wch: 18 }, // Father's Name
      { wch: 18 }, // Mother's Name
      { wch: 32 }, // Present Address
      { wch: 14 }, // Marital Status
      { wch: 14 }, // Education
      { wch: 24 }, // Email
      { wch: 36 }, // Remarks / Note
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Candidates Template");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=candidates_bulk_upload_template.xlsx",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export const GET = withApiAccess("imports/candidates/sample", GETHandler);
