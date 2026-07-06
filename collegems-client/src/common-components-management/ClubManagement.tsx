import React, { useEffect, useState } from "react";
import {
  ArrowLeft, Users, Calendar, UserCheck, UserX, Crown, Shield,
  Trash2, X, AlertTriangle, CheckCircle, ChevronDown, Link2, Unlink,
  Megaphone, Send, Clock
} from "lucide-react";
import api from "../api/axios";

interface MemberUser { _id: string; name: string; email: string; role: string; }
interface Member { user: MemberUser; role: string; joinedAt: string; }
interface ClubEvent { _id: string; title: string; date: string; status: string; category: string; }
interface PendingRequest { user: MemberUser; message?: string; requestedAt: string; }
interface Announcement { _id: string; message: string; postedBy: MemberUser; date: string; }
interface Club {
  _id: string; name: string; description: string; category: string; createdBy: MemberUser;
  admins: MemberUser[]; members: Member[]; pendingRequests: PendingRequest[]; events: ClubEvent[];
  announcements?: Announcement[]; maxMembers: number; isActive: boolean;
}
interface AllEvent { _id: string; title: string; date: string; }
const ROLES = ["member", "coordinator", "secretary", "treasurer", "vice-president", "president"];

interface Props { club: Club; onBack: () => void; onUpdated: (club: Club) => void; showToast: (type: "success" | "error", msg: string) => void; }

const ClubManagement: React.FC<Props> = ({ club, onBack, onUpdated, showToast }) => {
  // THE FIX: Fetch fresh ID inside component
  const getSafeUserId = () => {
    try {
      const data = JSON.parse(localStorage.getItem("userData") || "{}");
      const id = data._id || data.id || data.userId || (data.user && (data.user._id || data.user.id));
      return id ? String(id) : "MISSING_ID";
    } catch { return "MISSING_ID"; }
  };
  const currentUserId = getSafeUserId();

  const [activeTab, setActiveTab] = useState<"members" | "requests" | "events" | "announcements">("members");
  const [allEvents, setAllEvents] = useState<AllEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [posting, setPosting] = useState(false);

  // ─── DYNAMIC IDENTIFICATION ───
  const isMe = (entity: any) => {
    if (!entity || currentUserId === "MISSING_ID") return false;
    const id = typeof entity === "object" ? (entity._id || entity.id) : entity;
    return String(id) === currentUserId;
  };
  
  const isFounder = isMe(club.createdBy);
  const isAdmin = isFounder || club.admins.some(isMe);
  const iAmPresident = isFounder || club.members.find(m => isMe(m.user))?.role === "president";
  const canKick = isFounder || iAmPresident;

  useEffect(() => {
    if (activeTab === "events" && isAdmin) {
      api.get("/events")
        .then((res) => {
          console.log("SERVER RESPONSE FOR EVENTS:", res.data); // <-- This will show us the truth
          
          // This aggressively hunts for the array no matter how your backend formats it
          const fetchedEvents = Array.isArray(res.data) ? res.data 
                              : res.data?.events ? res.data.events 
                              : res.data?.data ? res.data.data 
                              : [];
                              
          setAllEvents(fetchedEvents);
        })
        .catch((err) => {
          console.error("FAILED TO FETCH EVENTS:", err);
        });
    }
  }, [activeTab, isAdmin]);

  const refetch = async () => { try { const res = await api.get(`/clubs/${club._id}`); onUpdated(res.data); } catch { showToast("error", "Failed to refresh club data"); } };

  const handleApprove = async (userId: string) => { try { await api.post(`/clubs/${club._id}/requests/${userId}/approve`); showToast("success", "Member approved"); refetch(); } catch (err: any) { showToast("error", err?.response?.data?.message || "Failed to approve"); } };
  const handleReject = async (userId: string) => { try { await api.post(`/clubs/${club._id}/requests/${userId}/reject`); showToast("success", "Request rejected"); refetch(); } catch (err: any) { showToast("error", err?.response?.data?.message || "Failed to reject"); } };
  const handleRemoveMember = async (userId: string) => { try { await api.delete(`/clubs/${club._id}/members/${userId}`); showToast("success", "Member removed"); refetch(); } catch (err: any) { showToast("error", err?.response?.data?.message || "Failed to remove member"); } };
  const handleRoleChange = async (userId: string, role: string) => { try { await api.put(`/clubs/${club._id}/members/${userId}/role`, { role }); showToast("success", "Role updated"); refetch(); } catch (err: any) { showToast("error", err?.response?.data?.message || "Failed to update role"); } };
  const handleToggleAdmin = async (userId: string, makeAdmin: boolean) => { try { await api.put(`/clubs/${club._id}/members/${userId}/role`, { makeAdmin }); showToast("success", "Admin status updated"); refetch(); } catch (err: any) { showToast("error", err?.response?.data?.message || "Failed to update status"); } };
  const handleLinkEvent = async () => { if (!selectedEvent) return; try { await api.post(`/clubs/${club._id}/events`, { eventId: selectedEvent }); showToast("success", "Event linked"); setSelectedEvent(""); refetch(); } catch (err: any) { showToast("error", err?.response?.data?.message || "Failed to link event"); } };
  const handleUnlinkEvent = async (eventId: string) => { try { await api.delete(`/clubs/${club._id}/events/${eventId}`); showToast("success", "Event unlinked"); refetch(); } catch (err: any) { showToast("error", err?.response?.data?.message || "Failed to unlink"); } };
  const handlePostAnnouncement = async () => { if (!announcementText.trim()) return; setPosting(true); try { await api.post(`/clubs/${club._id}/announcements`, { message: announcementText }); showToast("success", "Posted!"); setAnnouncementText(""); refetch(); } catch (err: any) { showToast("error", "Failed to post"); } finally { setPosting(false); } };
  const handleDeleteAnnouncement = async (announcementId: string) => { try { await api.delete(`/clubs/${club._id}/announcements/${announcementId}`); showToast("success", "Deleted"); refetch(); } catch (err: any) { showToast("error", "Failed to delete"); } };
  const handleDeleteClub = async () => { try { await api.delete(`/clubs/${club._id}`); showToast("success", "Club deleted"); setConfirmDelete(false); onBack(); } catch (err: any) { showToast("error", err?.response?.data?.message || "Failed to delete"); setConfirmDelete(false); } };

  const linkableEvents = allEvents.filter((e) => !club.events.some((ce) => ce._id === e._id));

  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={onBack} className="mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">{club.name} {!club.isActive && <span className="px-2 py-0.5 bg-gray-100 text-xs rounded-full">Inactive</span>}</h1>
            <p className="text-sm text-gray-500 mt-1">{club.description}</p>
            <span className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">{club.category}</span>
          </div>
        </div>
        {isFounder && <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /> Delete Club</button>}
      </div>

      <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        {(["announcements", "members", "requests", "events"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-md text-sm capitalize ${activeTab === t ? "bg-white shadow-sm" : "text-gray-500"}`}>
            {t} {t === "requests" && club.pendingRequests.length > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{club.pendingRequests.length}</span>}
          </button>
        ))}
      </div>

      {activeTab === "announcements" && (
        <div className="space-y-4 max-w-3xl">
          {isAdmin && (
            <div className="bg-white p-4 rounded-xl border">
              <label className="block text-sm font-medium mb-2 flex items-center gap-2"><Megaphone className="w-4 h-4 text-blue-600" /> Post an Announcement</label>
              <textarea value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm min-h-[100px]" />
              <div className="flex justify-end mt-3"><button onClick={handlePostAnnouncement} disabled={posting || !announcementText.trim()} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg"><Send className="w-4 h-4 inline mr-1" /> Post Message</button></div>
            </div>
          )}
          <div className="space-y-3">
            {(!club.announcements || club.announcements.length === 0) ? (<div className="bg-white p-8 text-center text-sm text-gray-500 rounded-xl border">No announcements yet.</div>) : (
              club.announcements.map((ann) => (
                <div key={ann._id} className="bg-white p-5 rounded-xl border relative group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">{ann.postedBy.name.charAt(0).toUpperCase()}</div>
                    <div><p className="font-semibold text-sm">{ann.postedBy.name}</p><p className="text-xs text-gray-500"><Clock className="w-3 h-3 inline" /> {new Date(ann.date).toLocaleString()}</p></div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{ann.message}</p>
                  {isAdmin && <button onClick={() => handleDeleteAnnouncement(ann._id)} className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "members" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {club.members.map((m) => {
            const getSafeId = (entity: any) => typeof entity === "object" ? String(entity._id || entity.id) : String(entity);
            const mId = getSafeId(m.user);
            const memberIsAdmin = club.admins.some((a) => getSafeId(a) === mId);
            const memberIsFounder = getSafeId(club.createdBy) === mId;
            const isSelfCard = mId === currentUserId;

            return (
              <div key={m.user._id} className="bg-white p-4 rounded-xl border">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold">{m.user.name.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm flex items-center gap-1.5">{m.user.name} {memberIsFounder && <Crown className="w-4 h-4 text-amber-500" />} {!memberIsFounder && memberIsAdmin && <Shield className="w-4 h-4 text-blue-500" />}</h3>
                    <p className="text-xs text-gray-500 truncate">{m.user.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Joined {new Date(m.joinedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Role:</span>
                    {isAdmin && !memberIsFounder ? (
                      <select value={m.role} onChange={(e) => handleRoleChange(m.user._id, e.target.value)} className="text-xs border rounded px-2 py-1 capitalize">
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (<span className="text-xs font-medium capitalize bg-gray-100 px-2 py-1 rounded">{m.role}</span>)}
                  </div>
                  {isAdmin && !memberIsFounder && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Admin Access:</span>
                      <button onClick={() => handleToggleAdmin(m.user._id, !memberIsAdmin)} className={`text-xs px-2 py-1 rounded ${memberIsAdmin ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{memberIsAdmin ? "Revoke Admin" : "Make Admin"}</button>
                    </div>
                  )}
                  <div className="flex justify-end mt-1">
                    {canKick && !memberIsFounder && !isSelfCard && (<button onClick={() => handleRemoveMember(m.user._id)} className="text-xs text-red-600 hover:underline"><UserX className="w-3 h-3 inline" /> Kick Member</button>)}
                    {isSelfCard && !isFounder && (<button onClick={() => handleRemoveMember(m.user._id)} className="text-xs text-red-600 hover:underline">Leave Club</button>)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "requests" && (
        <div className="space-y-3">
          {!isAdmin ? (<div className="bg-white p-8 text-center text-sm text-gray-500 rounded-xl border">Only admins can manage requests.</div>) : club.pendingRequests.length === 0 ? (<div className="bg-white p-8 text-center text-sm text-gray-500 rounded-xl border">No pending requests.</div>) : (
            club.pendingRequests.map((r) => (
              <div key={r.user._id} className="bg-white p-4 rounded-xl border flex items-center justify-between gap-4">
                <div className="min-w-0"><p className="font-medium">{r.user.name}</p><p className="text-xs text-gray-500">{r.user.email}</p><p className="text-xs text-gray-400 mt-1">Requested {new Date(r.requestedAt).toLocaleDateString()}</p></div>
                <div className="flex gap-2"><button onClick={() => handleApprove(r.user._id)} className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg">Approve</button><button onClick={() => handleReject(r.user._id)} className="px-3 py-1.5 border text-sm rounded-lg">Reject</button></div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "events" && (
        <div className="space-y-4">
          {isAdmin && (<div className="bg-white p-4 rounded-xl border flex gap-2"><select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm"><option value="">Select an event...</option>{linkableEvents.map((e) => <option key={e._id} value={e._id}>{e.title}</option>)}</select><button onClick={handleLinkEvent} disabled={!selectedEvent} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50">Link</button></div>)}
          {club.events.length === 0 ? (<div className="bg-white p-8 text-center text-sm text-gray-500 rounded-xl border">No events linked.</div>) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {club.events.map((ev) => (
                <div key={ev._id} className="bg-white p-4 rounded-xl border flex items-center justify-between"><p className="font-medium text-sm">{ev.title}</p>{isAdmin && <button onClick={() => handleUnlinkEvent(ev._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md"><Unlink className="w-4 h-4" /></button>}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50" onClick={() => setConfirmDelete(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full"><h3 className="font-semibold mb-2">Delete Club</h3><p className="text-sm text-gray-600 mb-6">Are you sure? This cannot be undone.</p><div className="flex gap-3 justify-end"><button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button><button onClick={handleDeleteClub} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg">Delete Forever</button></div></div>
        </div>
      )}
    </div>
  );
};
export default ClubManagement;