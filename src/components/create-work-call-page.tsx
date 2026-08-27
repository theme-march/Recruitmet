"use client";

import { List, Plus, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { moduleItemPath } from "@/lib/modules";

type Schedule = {
  id: string;
  title: string;
  company?: string | null;
  profession?: string | null;
  scheduledAt: string;
  venue?: string | null;
};

export function CreateWorkCallPage({ officerName }: { officerName: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [interviewOption, setInterviewOption] = useState("With Interview");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  // Controlled Interview Option Auto-fill States
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [interviewStatus, setInterviewStatus] = useState("Waiting For Interview");
  const [fileStatus, setFileStatus] = useState("Interested");

  const [phones, setPhones] = useState([""]);
  const [dob, setDob] = useState("");
  const [workerComments, setWorkerComments] = useState([""]);
  const [executiveComments, setExecutiveComments] = useState([""]);
  const [adminComments, setAdminComments] = useState([""]);

  const age = useMemo(() => {
    if (!dob) return "";
    const birth = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) years--;
    return String(Math.max(0, years));
  }, [dob]);

  const hasAutoFilledUrlRef = useState({ done: false })[0];

  const handleScheduleChange = (schId: string, showToast = true) => {
    setSelectedScheduleId(schId);
    if (!schId) return;

    const sch = schedules.find((s) => s.id === schId);
    if (sch) {
      // 1. Auto-fill Interview Date formatted for datetime-local
      if (sch.scheduledAt) {
        try {
          const d = new Date(sch.scheduledAt);
          const pad = (n: number) => String(n).padStart(2, "0");
          const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          setInterviewDate(localIso);
        } catch (e) {}
      }

      // 2. Auto-fill Company
      if (sch.company) {
        setSelectedCompany(sch.company);
      }

      // 3. Auto-fill Work Category & Sub-Category
      if (sch.profession) {
        setSelectedSubCategory(sch.profession);
        if (/driver|rider/i.test(sch.profession)) setSelectedCategory("Driver");
        else if (/electrician|plumber|technician|fitter|welder/i.test(sch.profession)) setSelectedCategory("Technician");
        else if (/construction|steel|mason|carpenter/i.test(sch.profession)) setSelectedCategory("Construction");
        else if (/clean|packaging|helper|indoor/i.test(sch.profession)) setSelectedCategory("Indoor Worker");
        else if (/hospitality|hotel|waiter|cook/i.test(sch.profession)) setSelectedCategory("Hospitality");
        else setSelectedCategory("Technician");
      }

      // 4. Auto-fill Interview Status & File Status
      setInterviewStatus("Waiting For Interview");
      setFileStatus("Pre-Confirmed");

      if (showToast) {
        toast.success(`Auto-filled details for "${sch.title}"`, {
          id: "schedule-autofill",
          icon: "✨",
        });
      }
    }
  };

  useEffect(() => {
    const urlScheduleId = new URLSearchParams(window.location.search).get("scheduleId") ?? "";
    if (urlScheduleId) setSelectedScheduleId(urlScheduleId);

    void fetch("/api/admin/master-data")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) {
          setCompanies(body.data.companies ?? []);
          setCategories(body.data.categories ?? []);
          if (body.data.interviewSchedules?.length) {
            setSchedules(body.data.interviewSchedules);
          }
        }
      });

    void fetch("/api/interviews?pageSize=100")
      .then((response) => (response.ok ? response.json() : { data: [] }))
      .then((body) => {
        if (body.data?.length) {
          setSchedules(body.data);
          if (urlScheduleId && !hasAutoFilledUrlRef.done) {
            hasAutoFilledUrlRef.done = true;
            const match = (body.data as Schedule[]).find((s) => s.id === urlScheduleId);
            if (match) {
              handleScheduleChange(urlScheduleId, false);
            }
          }
        }
      });
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries()) as Record<string, unknown>;
    payload.interviewOption = interviewOption;
    payload.additionalPhones = phones.filter(Boolean);
    payload.workerComments = workerComments;
    payload.executiveComments = executiveComments;
    payload.adminComments = adminComments;

    const response = await fetch("/api/work-calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    setSaving(false);
    if (!response.ok) {
      toast.error(body.error?.message ?? body.error ?? "Could not create work call");
      return;
    }
    toast.success(`Work call ${body.data.leadNo} created`);
    router.push(moduleItemPath("call-center", "Work Call List"));
  }

  // Dynamic Options with smart fallbacks
  const categoryOptions =
    categories.length > 0
      ? categories.map((c) => c.name)
      : ["Technician", "Driver", "Construction", "Indoor Worker", "Hospitality", "Manufacturing", "Cleaning"];

  const companyList = [
    ...new Set([
      ...companies.map((c) => c.name),
      ...schedules.map((s) => s.company).filter(Boolean),
      "Almarai",
      "Saudi Binladen Group",
      "Nesma & Partners",
      "Keeta Saudi Arabia",
      "Al Baik",
      "Nesto Supermarket",
      "Al Mabani",
      "Lulu Hypermarket",
    ]),
  ] as string[];

  const subCategoryList = [
    ...new Set([
      ...schedules.map((s) => s.profession).filter(Boolean),
      "Driver",
      "Electrician / Plumber",
      "Electrician",
      "Plumber",
      "Pipe Fitter",
      "Welder",
      "General Construction Worker",
      "Steel Fixer",
      "Mason",
      "Bike Rider",
      "Indoor Worker",
      "Packaging Worker",
      "Asst. Cashier",
      "Technician",
    ]),
  ] as string[];

  return (
    <div className="work-call-page" style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <div className="page-head compact" style={{ marginBottom: "18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="breadcrumb" style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Call Center / Create Work Call
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--ink)", margin: "4px 0" }}>Create Work Call</h1>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>Register and assign a recruitment lead with candidate preferences and interview drive.</p>
        </div>
        <Link
          prefetch={true}
          href={moduleItemPath("call-center", "Work Call List")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "9px 16px",
            borderRadius: "10px",
            background: "#f0edff",
            border: "1px solid #dcd5fb",
            color: "#7258e8",
            fontSize: "12px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          <List size={16} /> Work Call List
        </Link>
      </div>

      <form className="work-call-form" onSubmit={submit} style={{ display: "grid", gap: "18px" }}>
        {/* INTERVIEW OPTION WITH INSTANT AUTO-FILL */}
        <section className="work-form-section" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "22px 26px", boxShadow: "var(--shadow)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>
              1. Interview &amp; Drive Options
            </h2>
            {selectedScheduleId && (
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#7258e8", background: "#f0edff", border: "1px solid #dcd5fb", padding: "4px 10px", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Sparkles size={13} /> Auto-filled from Schedule
              </span>
            )}
          </div>

          <div className="interview-choice" style={{ display: "flex", gap: "20px", marginBottom: "18px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "13px", cursor: "pointer", color: "var(--ink)" }}>
              <input
                type="radio"
                checked={interviewOption === "With Interview"}
                onChange={() => setInterviewOption("With Interview")}
                style={{ width: "18px", height: "18px", accentColor: "#7258e8", cursor: "pointer" }}
              />
              With Interview Drive
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "13px", cursor: "pointer", color: "var(--ink)" }}>
              <input
                type="radio"
                checked={interviewOption === "Without Interview"}
                onChange={() => setInterviewOption("Without Interview")}
                style={{ width: "18px", height: "18px", accentColor: "#7258e8", cursor: "pointer" }}
              />
              Without Interview (Direct Candidate)
            </label>
          </div>

          <div className="work-form-grid">
            <label>
              Interview Schedule
              <select
                name="interviewScheduleId"
                value={selectedScheduleId}
                onChange={(e) => handleScheduleChange(e.target.value)}
              >
                <option value="">Select Interview Schedule</option>
                {schedules.map((schedule) => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.title} · {new Date(schedule.scheduledAt).toLocaleString()}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Interview Date
              <input
                name="interviewDate"
                type="datetime-local"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
              />
            </label>

            <label>
              Interested Work Category
              <select
                name="workCategory"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Select Interested Work Category</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Interested Work Sub Category
              <select
                name="workSubCategory"
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
              >
                <option value="">Select Interested Work Sub Category</option>
                {subCategoryList.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Interested Company
              <select
                name="company"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
              >
                <option value="">Select Interested Company</option>
                {companyList.map((comp) => (
                  <option key={comp} value={comp}>
                    {comp}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Interview Status
              <select
                name="interviewStatus"
                value={interviewStatus}
                onChange={(e) => setInterviewStatus(e.target.value)}
              >
                <option value="Waiting For Interview">Waiting For Interview</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Selected">Selected</option>
                <option value="Rejected">Rejected</option>
                <option value="Absent">Absent</option>
              </select>
            </label>

            <label>
              File Status
              <select
                name="fileStatus"
                value={fileStatus}
                onChange={(e) => setFileStatus(e.target.value)}
              >
                <option value="New">New</option>
                <option value="Interested">Interested</option>
                <option value="Pre-Confirmed">Pre-Confirmed</option>
                <option value="Active">Active</option>
                <option value="Hold">Hold</option>
                <option value="Closed">Closed</option>
              </select>
            </label>
          </div>
        </section>

        {/* BASIC QUESTION */}
        <section className="work-form-section" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "22px 26px", boxShadow: "var(--shadow)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "var(--ink)", margin: "0 0 16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
            2. Basic Candidate Information
          </h2>
          <div className="work-form-grid">
            <label>
              Full Name <sup>*</sup>
              <input name="fullName" placeholder="Enter candidate full name" required />
            </label>
            <label>
              Phone <sup>*</sup>
              <input name="phone" placeholder="e.g. 01700000000" required />
            </label>
            <div className="dynamic-field full" style={{ gridColumn: "1 / -1" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#747083", marginBottom: "6px", display: "block" }}>Additional Phone Numbers</span>
              {phones.map((phone, index) => (
                <input
                  key={index}
                  value={phone}
                  onChange={(event) =>
                    setPhones(phones.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
                  }
                  placeholder="Additional phone"
                  style={{ marginBottom: "8px" }}
                />
              ))}
              <button
                type="button"
                onClick={() => setPhones([...phones, ""])}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  background: "#f0edff",
                  border: "1px solid #dcd5fb",
                  color: "#7258e8",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  width: "fit-content",
                }}
              >
                <Plus size={15} /> Add Another Phone
              </button>
            </div>
            <label>
              Date of Birth
              <input name="dob" type="date" value={dob} onChange={(event) => setDob(event.target.value)} />
            </label>
            <label>
              Age
              <input name="age" placeholder="Auto-calculated age" readOnly value={age ? `${age} Years` : ""} />
            </label>
            <label>
              Passport Status
              <select name="passportStatus" defaultValue="Available">
                <option value="Available">Available</option>
                <option value="Applied">Applied</option>
                <option value="Not Available">Not Available</option>
                <option value="Expired">Expired</option>
                <option value="Renewal Required">Renewal Required</option>
              </select>
            </label>
            <label>
              Passport No
              <input name="passportNo" placeholder="Passport Number" />
            </label>
            <label>
              Expert In / Skill
              <input name="expertIn" placeholder="e.g. Electrician, Pipe Fitter, Driver" />
            </label>
          </div>
        </section>

        {/* PREFER COUNTRY & DESTINATION */}
        <section className="work-form-section" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "22px 26px", boxShadow: "var(--shadow)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "var(--ink)", margin: "0 0 16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
            3. Prefer Country &amp; Target Destination
          </h2>
          <div className="work-form-grid">
            <label style={{ gridColumn: "1 / -1" }}>
              Target Country <sup>*</sup>
              <select name="country" required defaultValue="Saudi Arabia" style={{ fontSize: "14px", fontWeight: 700, height: "46px" }}>
                <option value="Saudi Arabia">🇸🇦 Saudi Arabia</option>
                <option value="Dubai">🇦🇪 Dubai</option>
                <option value="Other Country">🌍 Other Country</option>
              </select>
              <small style={{ color: "var(--muted)", fontSize: "11px", marginTop: "5px", display: "block" }}>
                Target overseas destination pipeline where this candidate will be processed upon lead confirmation.
              </small>
            </label>
          </div>
        </section>

        {/* PERSONAL INFORMATION */}
        <section className="work-form-section" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "22px 26px", boxShadow: "var(--shadow)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "var(--ink)", margin: "0 0 16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
            4. Personal Information
          </h2>
          <div className="work-form-grid">
            <label>
              Country / Nationality
              <select name="nationality" defaultValue="Bangladesh">
                <option value="Bangladesh">🇧🇩 Bangladesh</option>
                <option value="India">🇮🇳 India</option>
                <option value="Nepal">🇳🇵 Nepal</option>
                <option value="Pakistan">🇵🇰 Pakistan</option>
                <option value="Sri Lanka">🇱🇰 Sri Lanka</option>
                <option value="Other">🌍 Other</option>
              </select>
            </label>
            <label>
              Present District
              <select name="district" defaultValue="Dhaka">
                <option value="Dhaka">Dhaka</option>
                <option value="Chattogram">Chattogram</option>
                <option value="Cumilla">Cumilla</option>
                <option value="Noakhali">Noakhali</option>
                <option value="Sylhet">Sylhet</option>
                <option value="Rajshahi">Rajshahi</option>
                <option value="Khulna">Khulna</option>
                <option value="Barishal">Barishal</option>
                <option value="Rangpur">Rangpur</option>
                <option value="Mymensingh">Mymensingh</option>
              </select>
            </label>
            <label>
              Marital Status
              <select name="maritalStatus" defaultValue="Single">
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </label>
            <label>
              Last Education
              <input name="education" placeholder="e.g. SSC / HSC / Diploma" />
            </label>
            <label>
              Passing Year
              <input name="passingYear" placeholder="e.g. 2020" type="number" />
            </label>
            <label>
              Bank Loan
              <select name="bankLoan" defaultValue="Not Required">
                <option value="Required">Required</option>
                <option value="Not Required">Not Required</option>
                <option value="Interested">Interested</option>
                <option value="Not Eligible">Not Eligible</option>
              </select>
            </label>
            <label>
              X-Bidesh Registration
              <select name="xBidesh" defaultValue="Not Registered">
                <option value="Registered">Registered</option>
                <option value="Not Registered">Not Registered</option>
                <option value="Interested">Interested</option>
                <option value="Not Interested">Not Interested</option>
              </select>
            </label>
            <label>
              Email Address
              <input name="email" placeholder="email@example.com" type="email" />
            </label>
          </div>
        </section>

        {/* CALL CENTER CONTROL */}
        <section className="work-form-section" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "22px 26px", boxShadow: "var(--shadow)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "var(--ink)", margin: "0 0 16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
            5. Call Center Control &amp; Priority
          </h2>
          <div className="work-form-grid">
            <label>
              Proposed Rate (BDT)
              <input name="proposedRate" placeholder="Proposed Rate" type="number" defaultValue={350000} />
            </label>
            <label>
              Priority <sup>*</sup>
              <select name="priority" required defaultValue="3">
                <option value="1">Urgent (P1)</option>
                <option value="2">High (P2)</option>
                <option value="3">Normal (P3)</option>
                <option value="4">Low (P4)</option>
                <option value="5">Lowest (P5)</option>
              </select>
            </label>
            <label>
              Office Visit
              <select name="officeVisit" defaultValue="Scheduled">
                <option value="Required">Required</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Visited">Visited</option>
                <option value="Not Required">Not Required</option>
              </select>
            </label>
            <label>
              Assigned Officer
              <select name="officer" disabled>
                <option>{officerName}</option>
              </select>
            </label>
            <label>
              Call Source
              <select name="callSource" defaultValue="Direct">
                <option value="Direct">Direct</option>
                <option value="Facebook">Facebook</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Referral">Referral</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Website">Website</option>
              </select>
            </label>
            <label>
              Call Purpose <sup>*</sup>
              <select name="callPurpose" required defaultValue="Overseas Employment">
                <option value="Overseas Employment">Overseas Employment</option>
                <option value="Interview">Interview</option>
                <option value="Document Follow-up">Document Follow-up</option>
                <option value="Payment Follow-up">Payment Follow-up</option>
                <option value="General Query">General Query</option>
              </select>
            </label>
            <label>
              Human Behavior Tag <sup>*</sup>
              <select name="behaviorTag" required defaultValue="Highly Interested">
                <option value="Highly Interested">Highly Interested</option>
                <option value="Interested">Interested</option>
                <option value="Needs Follow-up">Needs Follow-up</option>
                <option value="Price Sensitive">Price Sensitive</option>
                <option value="Not Interested">Not Interested</option>
                <option value="Do Not Call">Do Not Call</option>
              </select>
            </label>
            <label>
              Call Status <sup>*</sup>
              <select name="callStatus" required defaultValue="Interested">
                <option value="New">New</option>
                <option value="Interested">Interested</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Interview Scheduled">Interview Scheduled</option>
                <option value="Converted">Converted</option>
                <option value="Not Interested">Not Interested</option>
                <option value="Closed">Closed</option>
              </select>
            </label>
            <label>
              Follow Up Date &amp; Time
              <input name="followUpDate" type="datetime-local" />
            </label>
          </div>
        </section>

        {/* COMMENTS & NOTES */}
        <section className="work-form-section" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "22px 26px", boxShadow: "var(--shadow)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "var(--ink)", margin: "0 0 16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
            6. Comments, Notes &amp; Activity Log
          </h2>
          <div className="comment-grid">
            <div className="comment-group">
              <span>Worker Comment</span>
              {workerComments.map((value, index) => (
                <textarea
                  key={index}
                  name="workerComments"
                  value={value}
                  onChange={(event) =>
                    setWorkerComments(
                      workerComments.map((item, itemIndex) => (itemIndex === index ? event.target.value : item))
                    )
                  }
                  placeholder="Type worker comment..."
                  rows={3}
                />
              ))}
              <button type="button" onClick={() => setWorkerComments([...workerComments, ""])}>
                <Plus size={14} /> Add more
              </button>
            </div>
            <div className="comment-group">
              <span>Executive Comment</span>
              {executiveComments.map((value, index) => (
                <textarea
                  key={index}
                  name="executiveComments"
                  value={value}
                  onChange={(event) =>
                    setExecutiveComments(
                      executiveComments.map((item, itemIndex) => (itemIndex === index ? event.target.value : item))
                    )
                  }
                  placeholder="Type executive comment..."
                  rows={3}
                />
              ))}
              <button type="button" onClick={() => setExecutiveComments([...executiveComments, ""])}>
                <Plus size={14} /> Add more
              </button>
            </div>
            <div className="comment-group">
              <span>Admin Comment</span>
              {adminComments.map((value, index) => (
                <textarea
                  key={index}
                  name="adminComments"
                  value={value}
                  onChange={(event) =>
                    setAdminComments(
                      adminComments.map((item, itemIndex) => (itemIndex === index ? event.target.value : item))
                    )
                  }
                  placeholder="Type admin comment..."
                  rows={3}
                />
              ))}
              <button type="button" onClick={() => setAdminComments([...adminComments, ""])}>
                <Plus size={14} /> Add more
              </button>
            </div>
          </div>
        </section>

        {/* STICKY FOOTER ACTIONS */}
        <div
          className="work-form-actions"
          style={{
            position: "sticky",
            bottom: "16px",
            zIndex: 10,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "12px",
            padding: "14px 20px",
            background: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--line)",
            borderRadius: "14px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <Link
            prefetch={true}
            href={moduleItemPath("call-center", "Work Call List")}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              background: "#f1f5f9",
              border: "1px solid var(--line)",
              color: "var(--muted)",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 24px",
              borderRadius: "10px",
              background: "#7258e8",
              color: "#fff",
              border: "none",
              fontSize: "13px",
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(114,88,232,0.3)",
              opacity: saving ? 0.7 : 1,
            }}
          >
            <Send size={16} />
            {saving ? "Submitting..." : "Submit Work Call"}
          </button>
        </div>
      </form>
    </div>
  );
}
