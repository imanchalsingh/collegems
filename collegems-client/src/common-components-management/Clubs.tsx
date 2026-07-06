import React, { useEffect, useState } from "react";
import {
  Users, Plus, Search, X, CheckCircle, AlertTriangle,
  Crown, Shield, UserPlus, Calendar, Settings, ChevronRight,
  Building2, RefreshCw,
} from "lucide-react";
import api from "../api/axios";
import ClubManagement from "./ClubManagement";
import EmptyState from "../components/EmptyState";

interface MemberUser { _id: string; name: string; email: string; role: string; }
interface Member { user: MemberUser; role: string; joinedAt: string; }
interface ClubEvent { _id: string; title: string; date: string; status: string; category: string; }
interface Club {
  _id: string; name: string; description: string; category: string; logo?: string;
  createdBy: MemberUser; admins: MemberUser[]; members: Member[];
  pendingRequests: { user: MemberUser; message?: string; requestedAt: string }[];
  events: ClubEvent[]; maxMembers: number; isActive: boolean;
}

const CATEGORIES = ["Technical", "Cultural", "Sports", "Literary", "Social Service", "Arts", "Music", "Dance", "Photography", "Entrepreneurship", "Other"];
const inputCls = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
const selectCls = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelCls = "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1";

const Clubs: React.FC = () => {
  // THE FIX: Move ID extraction INSIDE the component so it updates on every login!
  const getSafeUserId = () => {
    try {
      const data = JSON.parse(localStorage.getItem("userData") || "{}");
      const id = data._id || data.id || data.userId || (data.user && (data.user._id || data.user.id));
      return id ? String(id) : "MISSING_ID";
    } catch {
      return "MISSING_ID";
    }
  };
  const currentUserId = getSafeUserId();

  const [tab, setTab] = useState<"all" | "mine">("all");
  const [clubs, setClubs] = useState<Club[]>([]);
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [managingClub, setManagingClub] = useState<Club | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [form, setForm] = useState({ name: "", description: "", category: "Technical", maxMembers: "100" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchClubs = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (category) params.category = category;
      if (search) params.search = search;
      const res = await api.get("/clubs", { params });
      setClubs(res.data);
    } catch {
      showToast("error", "Failed to load clubs");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyClubs = async () => {
    try {
      const res = await api.get("/clubs/my");
      setMyClubs(res.data);
    } catch {
      showToast("error", "Failed to load your clubs");
    }
  };

  useEffect(() => { fetchClubs(); fetchMyClubs(); }, []);
  useEffect(() => { const t = setTimeout(fetchClubs, 300); return () => clearTimeout(t); }, [search, category]);

  const refreshAll = () => { fetchClubs(); fetchMyClubs(); };

  // ─── DYNAMIC IDENTIFICATION ───
  const isMe = (entity: any) => {
    if (!entity || currentUserId === "MISSING_ID") return false;
    const id = typeof entity === "object" ? (entity._id || entity.id) : entity;
    return String(id) === currentUserId;
  };

  const isFounder = (club: Club) => isMe(club?.createdBy);
  const isAdmin = (club: Club) => isFounder(club) || (club?.admins || []).some(isMe);
  const isMember = (club: Club) => (club?.members || []).some(m => isMe(m?.user));
  
  const hasPendingRequest = (club: Club) => 
    !isAdmin(club) && !isMember(club) && (club?.pendingRequests || []).some(r => isMe(r?.user));
    
  const myRole = (club: Club) => {
    if (isFounder(club)) return "president"; // Overrides database glitches
    return (club?.members || []).find(m => isMe(m?.user))?.role || "member";
  };

  const handleJoin = async (clubId: string) => {
    try {
      await api.post(`/clubs/${clubId}/join`, {});
      showToast("success", "Join request submitted");
      refreshAll();
    } catch (err: any) {
      showToast("error", err?.response?.data?.message || "Failed to send join request");
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.description.trim()) { setFormError("Name and description are required."); return; }
    setSubmitting(true); setFormError("");
    try {
      await api.post("/clubs", { ...form, maxMembers: Number(form.maxMembers) || 100 });
      showToast("success", "Club created successfully");
      setShowCreate(false); setForm({ name: "", description: "", category: "Technical", maxMembers: "100" });
      refreshAll();
    } catch (err: any) { setFormError(err?.response?.data?.message || "Failed to create club"); } 
    finally { setSubmitting(false); }
  };

const roleIcon = (role: string) => {
    if (role === "president") return <Crown className="w-3.5 h-3.5 text-amber-500" />;
    if (["vice-president", "secretary", "treasurer", "coordinator"].includes(role)) return <Shield className="w-3.5 h-3.5 text-blue-500" />;
    return null;
  };

  const list = tab === "all" ? clubs : myClubs;

  if (managingClub) {
    return <ClubManagement club={managingClub} onBack={() => { setManagingClub(null); refreshAll(); }} onUpdated={(updated) => { setManagingClub(updated); refreshAll(); }} showToast={showToast} />;
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {toast && <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>{toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}{toast.msg}</div>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />Clubs & Organizations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Discover, join, and manage student clubs</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"><Plus className="w-4 h-4" /> Create Club</button>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        {(["all", "mine"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>{t === "all" ? "All Clubs" : `My Clubs (${myClubs.length})`}</button>
        ))}
      </div>

      {tab === "all" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Search clubs by name…" className={`${inputCls} pl-9`} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="w-44 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={refreshAll} className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" /><p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading clubs…</p></div>
      ) : list.length === 0 ? (
        tab === "all" && !search && !category ? (
          <EmptyState
            icon={<Building2 className="w-7 h-7 text-blue-600" />}
            title="No clubs found"
            description="Be the first to create a club and bring your community together."
            actionLabel="Create First Club"
            onAction={() => setShowCreate(true)}
            actionHint="Opens the club creation form."
          />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              {tab === "all" ? "No clubs found" : "You haven't joined any clubs yet"}
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {list.map((club) => {
            const isMem = isMember(club); const isAdm = isAdmin(club); const pending = hasPendingRequest(club);
            return (
              <div key={club._id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{club.name}</h3>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">{club.category}</span>
                  </div>
                  {isAdm && <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full"><Crown className="w-3 h-3" /> Admin</span>}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">{club.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {club.members.length} / {club.maxMembers} members</span>
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {club.events.length} events</span>
                </div>
                {isMem && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 mb-3">
                    {roleIcon(myRole(club))} Your role: <span className="font-medium capitalize">{myRole(club)}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  {isAdm || isFounder(club) ? (
                    <button onClick={() => setManagingClub(club)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"><Settings className="w-4 h-4" /> Manage</button>
                  ) : isMem ? (
                    <button onClick={() => setManagingClub(club)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">View Club <ChevronRight className="w-4 h-4" /></button>
                  ) : pending ? (
                    <button disabled className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-medium rounded-lg cursor-not-allowed">Request Pending</button>
                  ) : (
                    <button onClick={() => handleJoin(club._id)} disabled={club.members.length >= club.maxMembers} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"><UserPlus className="w-4 h-4" />{club.members.length >= club.maxMembers ? "Club Full" : "Request to Join"}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-blue-600">
              <h3 className="text-lg font-semibold text-white">Create New Club</h3>
              <button onClick={() => setShowCreate(false)} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {formError && <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />{formError}</div>}
              <div><label className={labelCls}>Club Name *</label><input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Robotics Club" /></div>
              <div><label className={labelCls}>Description *</label><textarea className={`${inputCls} min-h-[90px]`} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What does this club do?" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Category</label><select className={selectCls} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className={labelCls}>Max Members</label><input type="number" min={1} className={inputCls} value={form.maxMembers} onChange={(e) => setForm((f) => ({ ...f, maxMembers: e.target.value }))} /></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={handleCreate} disabled={submitting} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60">{submitting ? "Creating…" : "Create Club"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Clubs;