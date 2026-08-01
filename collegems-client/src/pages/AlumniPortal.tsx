import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Filter,
  HeartHandshake,
  Loader2,
  Search,
  Users,
} from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";
import AlumniDirectoryCard, {
  type AlumniCardData,
} from "../components/alumni/AlumniDirectoryCard";
import JobReferralBoard from "../components/alumni/JobReferralBoard";

type PortalTab = "directory" | "referrals" | "donate";

const FUNDS = [
  { value: "college_development", label: "College Development Fund" },
  { value: "scholarship", label: "Student Scholarships" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "library", label: "Library & Labs" },
  { value: "general", label: "General Fund" },
];

export default function AlumniPortal() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "";
  const isStudent = role === "student";
  const isAlumni = role === "alumni";
  const isStaff = role === "hod" || role === "teacher" || role === "admin";

  const [tab, setTab] = useState<PortalTab>("directory");
  const [alumni, setAlumni] = useState<AlumniCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [requestingId, setRequestingId] = useState("");

  const [search, setSearch] = useState("");
  const [batch, setBatch] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [company, setCompany] = useState("");

  const [donationAmount, setDonationAmount] = useState("500");
  const [donationFund, setDonationFund] = useState("college_development");
  const [donationMessage, setDonationMessage] = useState("");
  const [donating, setDonating] = useState(false);
  const [donationStats, setDonationStats] = useState({
    totalAmount: 0,
    donationCount: 0,
  });
  const [myDonations, setMyDonations] = useState<
    { _id: string; amount: number; fund: string; status: string; createdAt: string }[]
  >([]);

  const backPath = useMemo(() => {
    if (role === "hod") return "/hod/dashboard";
    if (role === "teacher") return "/teacher/dashboard";
    if (role === "alumni") return "/";
    return "/student/dashboard";
  }, [role]);

  const loadAlumni = async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (batch) params.set("batch", batch);
      if (industry) params.set("industry", industry);
      if (location) params.set("location", location);
      if (company) params.set("company", company);
      const res = await api.get(`/alumni?${params.toString()}`);
      setAlumni(extractArray(res.data));
    } catch (err) {
      console.error(err);
      setError("Failed to load alumni directory.");
    } finally {
      setLoading(false);
    }
  };

  const loadDonationData = async () => {
    try {
      const [mine, stats] = await Promise.all([
        api.get("/alumni/donations/me"),
        isAlumni || isStaff
          ? api.get("/alumni/donations/stats")
          : Promise.resolve({ data: { data: null } }),
      ]);
      setMyDonations(extractArray(mine.data));
      if (stats.data?.data) {
        setDonationStats({
          totalAmount: stats.data.data.totalAmount || 0,
          donationCount: stats.data.data.donationCount || 0,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAlumni();
  }, [search, batch, industry, location, company]);

  useEffect(() => {
    if (tab === "donate") loadDonationData();
  }, [tab]);

  const handleMentorshipRequest = async (alumniId: string) => {
    try {
      setRequestingId(alumniId);
      setError("");
      setSuccess("");
      await api.post(`/alumni/${alumniId}/mentorship-request`, {
        note: "I would love guidance on career growth and referrals.",
      });
      setSuccess("Mentorship request sent successfully.");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not send mentorship request.";
      setError(message);
    } finally {
      setRequestingId("");
    }
  };

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setDonating(true);
      setError("");
      setSuccess("");
      const checkout = await api.post("/alumni/donations/checkout", {
        amount: Number(donationAmount),
        fund: donationFund,
        message: donationMessage,
      });

      const payload = checkout.data.data;
      if (payload.provider === "razorpay" && payload.keyId && window) {
        // Live Razorpay Checkout when keys + SDK are available
        const scriptId = "razorpay-checkout-js";
        if (!document.getElementById(scriptId)) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.id = scriptId;
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Razorpay"));
            document.body.appendChild(script);
          });
        }

        const RazorpayCtor = (
          window as unknown as {
            Razorpay: new (options: Record<string, unknown>) => {
              open: () => void;
            };
          }
        ).Razorpay;

        await new Promise<void>((resolve, reject) => {
          const rzp = new RazorpayCtor({
            key: payload.keyId,
            amount: Math.round(payload.amount * 100),
            currency: payload.currency || "INR",
            name: "College Development Fund",
            description: "Alumni donation",
            order_id: payload.orderId,
            handler: async (response: {
              razorpay_payment_id: string;
              razorpay_order_id: string;
              razorpay_signature: string;
            }) => {
              try {
                await api.post("/alumni/donations/confirm", {
                  donationId: payload.donationId,
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                  signature: response.razorpay_signature,
                });
                setSuccess("Thank you! Donation completed successfully.");
                await loadDonationData();
                resolve();
              } catch (confirmErr) {
                reject(confirmErr);
              }
            },
            modal: {
              ondismiss: () => reject(new Error("Checkout cancelled")),
            },
          });
          rzp.open();
        });
      } else {
        await api.post("/alumni/donations/confirm", {
          donationId: payload.donationId,
        });
        setSuccess(
          "Demo donation completed. Configure RAZORPAY_KEY_ID/SECRET for live payments."
        );
        await loadDonationData();
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } | Error })
          ?.response &&
        typeof (err as { response?: { data?: { message?: string } } }).response
          ?.data?.message === "string"
          ? (err as { response: { data: { message: string } } }).response.data
              .message
          : (err as Error)?.message || "Donation failed.";
      if (message !== "Checkout cancelled") setError(message);
    } finally {
      setDonating(false);
    }
  };

  const batches = ["", "2019", "2020", "2021", "2022", "2023", "2024", "2025"];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-700"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="inline-flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
            <Users size={18} />
            <span className="font-medium">Alumni Portal</span>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h1 className="text-xl font-semibold">
            Alumni Directory, Referrals & Donations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Connect with verified alumni, explore internal referrals, request
            mentorship, and support college development funds.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                ["directory", "Directory"],
                ["referrals", "Job Referrals"],
                ["donate", "Donate"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-xl px-3 py-2 text-sm font-medium ${
                  tab === id
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {(error || success) && (
          <p
            className={`text-sm rounded-xl px-3 py-2 border ${
              error
                ? "text-red-700 bg-red-50 border-red-200"
                : "text-emerald-700 bg-emerald-50 border-emerald-200"
            }`}
          >
            {error || success}
          </p>
        )}

        {tab === "directory" && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 grid md:grid-cols-5 gap-3">
              <div className="md:col-span-2 relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, company, industry..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
                />
              </div>
              <select
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              >
                {batches.map((b) => (
                  <option key={b || "all"} value={b}>
                    {b ? `Batch ${b}` : "All graduation years"}
                  </option>
                ))}
              </select>
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Industry"
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location"
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
              <div className="md:col-span-5 flex items-center gap-2">
                <Filter size={14} className="text-slate-400" />
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Filter by company"
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-indigo-600" />
              </div>
            ) : alumni.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-slate-500">
                No alumni matched your filters.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {alumni.map((person) => (
                  <AlumniDirectoryCard
                    key={person._id}
                    alumni={person}
                    canRequestMentorship={isStudent}
                    requesting={requestingId === person._id}
                    onRequestMentorship={handleMentorshipRequest}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "referrals" && (
          <JobReferralBoard canPost={isAlumni || isStaff} canApply={isStudent} />
        )}

        {tab === "donate" && (
          <section className="grid lg:grid-cols-2 gap-4">
            <form
              onSubmit={handleDonate}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                <HeartHandshake size={18} />
                <h2 className="font-semibold">Alumni Donation Gateway</h2>
              </div>
              <p className="text-sm text-slate-500">
                Contribute to institutional development. Uses Razorpay when
                configured; otherwise secure demo checkout.
              </p>
              <label className="block text-sm">
                Amount (INR)
                <input
                  required
                  type="number"
                  min={1}
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                Fund
                <select
                  value={donationFund}
                  onChange={(e) => setDonationFund(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2"
                >
                  {FUNDS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Message (optional)
                <textarea
                  value={donationMessage}
                  onChange={(e) => setDonationMessage(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 min-h-[80px]"
                />
              </label>
              <button
                type="submit"
                disabled={donating}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2.5"
              >
                {donating ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <HeartHandshake size={16} />
                )}
                Donate Now
              </button>
            </form>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              {(isAlumni || isStaff) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                    <p className="text-xs text-slate-500">Total Raised</p>
                    <p className="text-xl font-semibold">
                      ₹{donationStats.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                    <p className="text-xs text-slate-500">Donations</p>
                    <p className="text-xl font-semibold">
                      {donationStats.donationCount}
                    </p>
                  </div>
                </div>
              )}
              <h3 className="font-semibold text-sm">Your recent donations</h3>
              {myDonations.length === 0 ? (
                <p className="text-sm text-slate-500">No donations yet.</p>
              ) : (
                <ul className="space-y-2">
                  {myDonations.slice(0, 6).map((d) => (
                    <li
                      key={d._id}
                      className="flex items-center justify-between text-sm rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2"
                    >
                      <span>
                        ₹{d.amount} · {d.fund.split("_").join(" ")}
                      </span>
                      <span
                        className={`text-xs uppercase ${
                          d.status === "paid"
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }`}
                      >
                        {d.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
