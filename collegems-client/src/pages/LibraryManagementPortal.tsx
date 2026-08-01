import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import JsBarcode from "jsbarcode";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  Printer,
  RefreshCw,
  ScanLine,
  Wallet,
} from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";
import BarcodeScannerModal from "../components/library/BarcodeScannerModal";

interface Book {
  _id: string;
  title: string;
  author: string;
  category: string;
  isbn?: string;
  barcode?: string;
  quantity: number;
  availableQuantity: number;
  status: string;
}

interface Fine {
  _id: string;
  amount: number;
  daysOverdue: number;
  status: string;
  student?: { name: string; email?: string };
  issue?: { book?: { title: string } };
}

interface Reservation {
  _id: string;
  status: string;
  position?: number;
  book?: { title: string; availableQuantity?: number };
  user?: { name: string };
}

export default function LibraryManagementPortal() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "";
  const isStaff = role === "hod" || role === "teacher";

  const [books, setBooks] = useState<Book[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedBook, setScannedBook] = useState<Book | null>(null);
  const [issueEmail, setIssueEmail] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [labelBook, setLabelBook] = useState<Book | null>(null);
  const barcodeSvgRef = useRef<SVGSVGElement>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [booksRes, finesRes, resRes] = await Promise.all([
        api.get("/library/books"),
        api.get("/library/fines"),
        api.get("/library/reservations"),
      ]);
      setBooks(extractArray(booksRes.data.books ?? booksRes.data));
      setFines(extractArray(finesRes.data.fines ?? finesRes.data));
      setReservations(extractArray(resRes.data.reservations ?? resRes.data));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load library data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!labelBook || !barcodeSvgRef.current) return;
    const code = labelBook.barcode || labelBook.isbn || labelBook._id.slice(-10);
    try {
      JsBarcode(barcodeSvgRef.current, code, {
        format: "CODE128",
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 14,
        margin: 8,
      });
    } catch {
      /* invalid chars */
    }
  }, [labelBook]);

  const onScan = async (code: string) => {
    try {
      setMessage("");
      const res = await api.get(`/library/books/code/${encodeURIComponent(code)}`);
      setScannedBook(res.data.book);
      setLabelBook(res.data.book);
      setMessage(`Matched: ${res.data.book.title}`);
    } catch (err: any) {
      setScannedBook(null);
      setError(err.response?.data?.message || "Book not found for scanned code");
    }
  };

  const issueScanned = async () => {
    if (!scannedBook || !issueEmail || !dueDate) {
      setError("Provide borrower email and due date");
      return;
    }
    try {
      await api.post("/library/issue", {
        bookId: scannedBook._id,
        userEmail: issueEmail,
        dueDate,
      });
      setMessage("Book issued successfully");
      setScannedBook(null);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || "Issue failed");
    }
  };

  const recalculate = async () => {
    try {
      const res = await api.post("/library/fines/recalculate", {});
      setMessage(res.data.message || "Fines recalculated");
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || "Recalculate failed");
    }
  };

  const payFine = async (id: string) => {
    await api.post(`/library/fines/${id}/pay`);
    load();
  };

  const reserve = async (bookId: string) => {
    try {
      const res = await api.post("/library/reservations", { bookId });
      setMessage(res.data.message);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || "Reserve failed");
    }
  };

  const printLabel = () => {
    window.print();
  };

  const back = () => {
    if (role === "teacher") navigate("/teacher/dashboard");
    else if (role === "student") navigate("/student/dashboard");
    else navigate("/hod/dashboard");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading library portal…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
          <div>
            <button
              type="button"
              onClick={back}
              className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
              <BookOpen className="h-6 w-6 text-teal-600" />
              Smart Library Portal
            </h1>
            <p className="text-sm text-slate-500">
              Barcode/ISBN scan, holiday-aware fines, reservations, and spine labels.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white"
            >
              <ScanLine className="h-4 w-4" /> Scan book
            </button>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            {isStaff && (
              <button
                type="button"
                onClick={recalculate}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600"
              >
                <Wallet className="h-4 w-4" /> Recalculate fines
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 print:hidden">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 print:hidden">
            {message}
          </div>
        )}

        {scannedBook && isStaff && (
          <div className="rounded-xl border border-teal-200 bg-white p-4 print:hidden dark:border-teal-900 dark:bg-slate-900">
            <h2 className="font-semibold text-slate-900 dark:text-white">Issue scanned book</h2>
            <p className="text-sm text-slate-500">
              {scannedBook.title} · avail {scannedBook.availableQuantity}/
              {scannedBook.quantity} · code {scannedBook.barcode || scannedBook.isbn || "—"}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <input
                value={issueEmail}
                onChange={(e) => setIssueEmail(e.target.value)}
                placeholder="Borrower email"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
              />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
              />
              <button
                type="button"
                onClick={issueScanned}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
              >
                Issue book
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2 print:hidden">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-3 font-semibold">Catalog</h2>
            <ul className="max-h-96 space-y-2 overflow-y-auto text-sm">
              {books.map((b) => (
                <li
                  key={b._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800"
                >
                  <div>
                    <p className="font-medium">{b.title}</p>
                    <p className="text-xs text-slate-500">
                      {b.author} · {b.availableQuantity}/{b.quantity} ·{" "}
                      {b.barcode || b.isbn || "no barcode"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLabelBook(b)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600"
                    >
                      Label
                    </button>
                    {!isStaff && b.availableQuantity <= 0 && (
                      <button
                        type="button"
                        onClick={() => reserve(b._id)}
                        className="rounded bg-teal-700 px-2 py-1 text-xs text-white"
                      >
                        Reserve
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <h2 className="mb-3 font-semibold">Fines</h2>
              {fines.length === 0 ? (
                <p className="text-sm text-slate-400">No fines.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {fines.map((f) => (
                    <li
                      key={f._id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50"
                    >
                      <span>
                        ₹{f.amount} · {f.daysOverdue} chargeable day(s) · {f.status}
                        <span className="block text-xs text-slate-500">
                          {f.issue?.book?.title} {f.student ? `· ${f.student.name}` : ""}
                        </span>
                      </span>
                      {isStaff && f.status === "Unpaid" && (
                        <button
                          type="button"
                          onClick={() => payFine(f._id)}
                          className="rounded bg-slate-900 px-2 py-1 text-xs text-white"
                        >
                          Mark paid
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <h2 className="mb-3 font-semibold">Reservations</h2>
              {reservations.length === 0 ? (
                <p className="text-sm text-slate-400">No reservations.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {reservations.map((r) => (
                    <li key={r._id} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                      {r.book?.title} · {r.status}
                      {r.user ? ` · ${r.user.name}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {labelBook && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between print:hidden">
              <h2 className="font-semibold">Spine barcode label</h2>
              <button
                type="button"
                onClick={printLabel}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-sm text-white"
              >
                <Printer className="h-4 w-4" /> Print label
              </button>
            </div>
            <div className="mx-auto max-w-sm text-center" id="spine-label">
              <p className="text-sm font-semibold">{labelBook.title}</p>
              <p className="text-xs text-slate-500">{labelBook.author}</p>
              <svg ref={barcodeSvgRef} className="mx-auto mt-2" />
            </div>
          </div>
        )}
      </div>

      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={onScan}
      />
    </div>
  );
}
