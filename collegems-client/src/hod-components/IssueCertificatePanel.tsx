import { useEffect, useState } from "react";
import { Shield, Plus, ExternalLink, RefreshCw } from "lucide-react";
import api from "../api/axios";
import { useToast } from "../hooks/useToast";

type IssuedCert = {
  certId: string;
  type: string;
  studentName: string;
  studentId: string;
  course?: string;
  merkleRoot: string;
  issuedAt: string;
  verificationUrl: string;
  revoked?: boolean;
};

export default function IssueCertificatePanel() {
  const { toast } = useToast();
  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState<"transcript" | "degree" | "marksheet">("transcript");
  const [cgpa, setCgpa] = useState("");
  const [degreeTitle, setDegreeTitle] = useState("");
  const [gradesJson, setGradesJson] = useState(
    '[{"subject":"Data Structures","code":"CS201","grade":"A","credits":4}]',
  );
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<IssuedCert[]>([]);
  const [lastQr, setLastQr] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  const loadList = async () => {
    try {
      const res = await api.get("/verification/certificates");
      setList(res.data.certificates || []);
    } catch {
      /* HOD-only */
    }
  };

  useEffect(() => {
    void loadList();
  }, []);

  const issue = async () => {
    if (!studentId.trim()) {
      toast.warning("Enter a student ID (roll number or Mongo id)");
      return;
    }
    let grades = [];
    try {
      grades = JSON.parse(gradesJson || "[]");
    } catch {
      toast.error("Grades must be valid JSON");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post("/verification/issue", {
        studentId: studentId.trim(),
        type,
        cgpa: cgpa || undefined,
        degreeTitle: degreeTitle || undefined,
        grades,
      });
      toast.success(`Issued ${res.data.certificate.certId}`);
      setLastQr(res.data.certificate.qrCodeDataUrl);
      setLastUrl(res.data.certificate.verificationUrl);
      await loadList();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to issue certificate");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Issue sealed transcript / degree</h2>
            <p className="text-sm text-gray-500">
              SHA-256 Merkle root + RSA-PSS signature with a QR verification seal.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm text-gray-600">
            Student ID
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
              placeholder="Roll number or user id"
            />
          </label>
          <label className="space-y-1 text-sm text-gray-600">
            Document type
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            >
              <option value="transcript">Transcript</option>
              <option value="degree">Degree</option>
              <option value="marksheet">Marksheet</option>
            </select>
          </label>
          <label className="space-y-1 text-sm text-gray-600">
            CGPA
            <input
              value={cgpa}
              onChange={(e) => setCgpa(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm text-gray-600">
            Degree title (optional)
            <input
              value={degreeTitle}
              onChange={(e) => setDegreeTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
        </div>

        <label className="mt-3 block space-y-1 text-sm text-gray-600">
          Grades JSON
          <textarea
            value={gradesJson}
            onChange={(e) => setGradesJson(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs"
          />
        </label>

        <button
          type="button"
          disabled={busy}
          onClick={() => void issue()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {busy ? "Issuing…" : "Issue & seal"}
        </button>

        {lastQr && (
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-indigo-100 bg-indigo-50 p-4">
            <img src={lastQr} alt="Verification QR" className="h-28 w-28 rounded bg-white p-1" />
            <div className="text-sm">
              <p className="font-medium text-indigo-900">QR verification seal</p>
              {lastUrl && (
                <a
                  href={lastUrl.replace(/^https?:\/\/[^/]+/, "")}
                  className="inline-flex items-center gap-1 text-indigo-700 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open public portal <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Recently issued</h3>
          <button
            type="button"
            onClick={() => void loadList()}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
        <ul className="divide-y divide-gray-100 text-sm">
          {list.length === 0 && (
            <li className="py-3 text-gray-500">No sealed certificates yet.</li>
          )}
          {list.map((c) => (
            <li key={c.certId} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-medium text-gray-900">
                  {c.certId} · {c.studentName}
                </p>
                <p className="text-xs text-gray-500">
                  {c.type} · {new Date(c.issuedAt).toLocaleString()}
                </p>
              </div>
              <a
                href={`/verify-certificate/${c.certId}`}
                className="text-indigo-600 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Verify
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
