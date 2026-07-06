import { useState, useEffect } from "react";
import type { ChangeEvent, FormEvent } from "react";
import axios from "../api/axios";
import { QRCodeSVG } from 'qrcode.react';
import EmptyState from "../components/EmptyState";
import {
  Calendar, Clock, MapPin, Video, Users, Mail, Phone, User,
  Image, CheckCircle, XCircle, FileText, Tag,
  ChevronRight, ChevronLeft, Loader2, Sparkles, Target, BookOpen,
  List, Plus, QrCode, Play, Square, Download, Trash2
} from 'lucide-react';

interface EventForm {
    title: string;
    shortDescription: string;
    description: string;
    category: string;
    mode: 'online' | 'offline' | 'hybrid';
    organization: string;
    speaker: string;
    date: string;
    startTime: string;
    endTime: string;
    venue: string;
    meetingLink: string;
    coverImage: string;
    registrationRequired: boolean;
    maxParticipants: string;
    contactName: string;
    contactEmail: string;
    contactPhone?: string;
    prerequisites?: string;
    targetAudience?: string;
    tags?: string;
}

export default function EventsManage() {
    const [viewMode, setViewMode] = useState<'create' | 'list' | 'attendance'>('list');
    const [events, setEvents] = useState<any[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [attendanceList, setAttendanceList] = useState<any[]>([]);
    
    // Create form state
    const [form, setForm] = useState<EventForm>({
        title: "", shortDescription: "", description: "", category: "Workshop", mode: "online",
        organization: "", speaker: "", date: "", startTime: "", endTime: "", venue: "",
        meetingLink: "", coverImage: "", registrationRequired: false, maxParticipants: "",
        contactName: "", contactEmail: "", contactPhone: "", prerequisites: "", targetAudience: "", tags: "",
    });
    const [loading, setLoading] = useState<boolean>(false);
    const [success, setSuccess] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState<number>(1);

    useEffect(() => {
        if (viewMode === 'list') {
            fetchEvents();
        }
    }, [viewMode]);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const res = await axios.get("/events");
            setEvents(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendance = async (eventId: string) => {
        try {
            setLoading(true);
            const res = await axios.get(`/events/${eventId}/attendance`);
            setAttendanceList(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const generateQRCode = async (eventId: string) => {
        try {
            await axios.post(`/events/${eventId}/generate-qr`);
            fetchEvents();
        } catch (err) {
            console.error(err);
        }
    };

    const toggleQRCodeStatus = async (eventId: string, isActive: boolean) => {
        try {
            await axios.post(`/events/${eventId}/toggle-qr`, { isActive });
            fetchEvents();
        } catch (err) {
            console.error(err);
        }
    };

    const deleteEvent = async (eventId: string) => {
        if (window.confirm("Are you sure you want to delete this event?")) {
            try {
                await axios.delete(`/events/${eventId}`);
                fetchEvents();
            } catch (err) {
                console.error(err);
            }
        }
    };

    const exportCSV = () => {
        if (attendanceList.length === 0) return;
        const csvContent = "data:text/csv;charset=utf-8," 
            + "Name,Roll No,Check-in Time\n"
            + attendanceList.map(record => `${record.participant?.name || 'Unknown'},${record.participant?.rollNo || 'N/A'},${new Date(record.checkInTime).toLocaleString()}`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `attendance_${selectedEventId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setForm({ ...form, [name]: type === "checkbox" ? checked : value });
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        const payload = { ...form, maxParticipants: (!form.registrationRequired || form.maxParticipants === "") ? null : Number(form.maxParticipants) };

        try {
            await axios.post("/events/create", payload);
            setSuccess(true);
            setTimeout(() => {
                setForm({
                    title: "", shortDescription: "", description: "", category: "Workshop", mode: "online",
                    organization: "", speaker: "", date: "", startTime: "", endTime: "", venue: "", meetingLink: "",
                    coverImage: "", registrationRequired: false, maxParticipants: "", contactName: "", contactEmail: "",
                    contactPhone: "", prerequisites: "", targetAudience: "", tags: "",
                });
                setCurrentStep(1);
                setSuccess(false);
                setViewMode('list');
            }, 2000);
        } catch (err: any) {
            console.error(err);
            setError(err?.response?.data?.message || "Error creating event. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => { if (currentStep < 3) setCurrentStep(currentStep + 1); };
    const prevStep = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

    const inputClassName = "w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900";
    const labelClassName = "block text-sm font-medium text-gray-700 mb-1.5";
    const categories = ["Workshop", "Seminar", "Webinar", "Alumni Talk", "Training", "Conference", "Hackathon", "Guest Lecture"];

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header with Navigation */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Event Management</h1>
                            <p className="text-gray-500 mt-1">Manage events, track attendance, and more</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${viewMode === 'list' || viewMode === 'attendance' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                            <List className="w-4 h-4" /> All Events
                        </button>
                        <button
                            onClick={() => setViewMode('create')}
                            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${viewMode === 'create' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                            <Plus className="w-4 h-4" /> Create Event
                        </button>
                    </div>
                </div>

                {viewMode === 'create' && (
                    <div className="max-w-5xl mx-auto">
                        {/* Status Messages */}
                        {success && (
                            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                                <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center"><CheckCircle className="w-4 h-4 text-emerald-600" /></div>
                                <span className="text-emerald-700">Event created successfully! 🎉</span>
                            </div>
                        )}
                        {error && (
                            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3">
                                <div className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center"><XCircle className="w-4 h-4 text-rose-600" /></div>
                                <span className="text-rose-700">{error}</span>
                            </div>
                        )}

                        {/* Progress Steps */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between">
                                {[
                                    { step: 1, label: "Basic Info", icon: FileText },
                                    { step: 2, label: "Schedule & Venue", icon: Calendar },
                                    { step: 3, label: "Contact Details", icon: Users },
                                ].map((item, index) => {
                                    const Icon = item.icon;
                                    const isActive = currentStep === item.step;
                                    const isCompleted = currentStep > item.step;
                                    return (
                                        <div key={item.step} className="flex items-center flex-1">
                                            <div className="relative">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold transition-all ${isCompleted ? 'bg-blue-600 text-white' : ''} ${isActive ? 'bg-blue-600 text-white ring-4 ring-blue-100' : ''} ${!isActive && !isCompleted ? 'bg-gray-100 text-gray-500' : ''}`}>
                                                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                                </div>
                                            </div>
                                            <div className={`ml-3 flex-1 ${index < 2 ? 'mr-4' : ''}`}>
                                                <p className={`text-sm font-medium ${isActive || isCompleted ? 'text-gray-900' : 'text-gray-500'}`}>{item.label}</p>
                                            </div>
                                            {index < 2 && <div className={`flex-1 h-0.5 ${currentStep > item.step ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Main Form */}
                        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
                                <h2 className="font-semibold text-gray-900">Step {currentStep}: {currentStep === 1 ? "Basic Information" : currentStep === 2 ? "Schedule & Venue" : "Contact Information"}</h2>
                            </div>
                            <div className="p-6">
                                {currentStep === 1 && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 gap-6">
                                            <div>
                                                <label className={labelClassName}>Event Title *</label>
                                                <input name="title" value={form.title} placeholder="e.g., Advanced Machine Learning Workshop" onChange={handleChange} className={inputClassName} required />
                                            </div>
                                            <div>
                                                <label className={labelClassName}>Short Description *</label>
                                                <input name="shortDescription" value={form.shortDescription} placeholder="Brief overview (max 200 characters)" onChange={handleChange} className={inputClassName} maxLength={200} required />
                                            </div>
                                            <div>
                                                <label className={labelClassName}>Detailed Description *</label>
                                                <textarea name="description" value={form.description} placeholder="Full description of the event..." onChange={handleChange} rows={5} className={`${inputClassName} resize-none`} required />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className={labelClassName}>Category *</label>
                                                    <select name="category" value={form.category} onChange={handleChange} className={inputClassName}>
                                                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className={labelClassName}>Mode *</label>
                                                    <select name="mode" value={form.mode} onChange={handleChange} className={inputClassName}>
                                                        <option value="online">Online</option>
                                                        <option value="offline">Offline</option>
                                                        <option value="hybrid">Hybrid</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className={labelClassName}>Organization *</label>
                                                    <input name="organization" value={form.organization} placeholder="e.g., Google, Microsoft" onChange={handleChange} className={inputClassName} required />
                                                </div>
                                                <div>
                                                    <label className={labelClassName}>Speaker *</label>
                                                    <input name="speaker" value={form.speaker} placeholder="Full name of speaker" onChange={handleChange} className={inputClassName} required />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {currentStep === 2 && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className={labelClassName}>Date *</label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                                    <input type="date" name="date" value={form.date} onChange={handleChange} className={`${inputClassName} pl-10`} required />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelClassName}>Start Time *</label>
                                                <div className="relative">
                                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                                    <input type="text" name="startTime" value={form.startTime} placeholder="e.g., 10:00 AM" onChange={handleChange} className={`${inputClassName} pl-10`} required />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelClassName}>End Time *</label>
                                                <div className="relative">
                                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                                    <input type="text" name="endTime" value={form.endTime} placeholder="e.g., 4:00 PM" onChange={handleChange} className={`${inputClassName} pl-10`} required />
                                                </div>
                                            </div>
                                            {(form.mode === "offline" || form.mode === "hybrid") && (
                                                <div>
                                                    <label className={labelClassName}>Venue *</label>
                                                    <div className="relative">
                                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                                        <input name="venue" value={form.venue} placeholder="Full address" onChange={handleChange} className={`${inputClassName} pl-10`} required />
                                                    </div>
                                                </div>
                                            )}
                                            {(form.mode === "online" || form.mode === "hybrid") && (
                                                <div>
                                                    <label className={labelClassName}>Meeting Link *</label>
                                                    <div className="relative">
                                                        <Video className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                                        <input name="meetingLink" value={form.meetingLink} placeholder="https://meet.google.com/..." onChange={handleChange} className={`${inputClassName} pl-10`} required />
                                                    </div>
                                                </div>
                                            )}
                                            <div className="md:col-span-2">
                                                <label className={labelClassName}>Cover Image URL *</label>
                                                <div className="relative">
                                                    <Image className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                                    <input name="coverImage" value={form.coverImage} placeholder="https://example.com/image.jpg" onChange={handleChange} className={`${inputClassName} pl-10`} required />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelClassName}>Target Audience</label>
                                                <div className="relative"><Target className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" /><input name="targetAudience" value={form.targetAudience} placeholder="e.g., Students, Professionals" onChange={handleChange} className={`${inputClassName} pl-10`} /></div>
                                            </div>
                                            <div>
                                                <label className={labelClassName}>Prerequisites</label>
                                                <div className="relative"><BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" /><input name="prerequisites" value={form.prerequisites} placeholder="e.g., Basic Python knowledge" onChange={handleChange} className={`${inputClassName} pl-10`} /></div>
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className={labelClassName}>Tags (comma separated)</label>
                                                <div className="relative"><Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" /><input name="tags" value={form.tags} placeholder="e.g., AI, Machine Learning, Python" onChange={handleChange} className={`${inputClassName} pl-10`} /></div>
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input type="checkbox" name="registrationRequired" checked={form.registrationRequired} onChange={handleChange} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                                    <span className="text-sm text-gray-700">Registration Required</span>
                                                </label>
                                            </div>
                                            {form.registrationRequired && (
                                                <div>
                                                    <label className={labelClassName}>Max Participants</label>
                                                    <div className="relative"><Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" /><input type="number" name="maxParticipants" value={form.maxParticipants} placeholder="e.g., 100" onChange={handleChange} className={`${inputClassName} pl-10`} /></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {currentStep === 3 && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className={labelClassName}>Contact Person *</label>
                                                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" /><input name="contactName" value={form.contactName} placeholder="Full name" onChange={handleChange} className={`${inputClassName} pl-10`} required /></div>
                                            </div>
                                            <div>
                                                <label className={labelClassName}>Contact Email *</label>
                                                <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" /><input type="email" name="contactEmail" value={form.contactEmail} placeholder="email@example.com" onChange={handleChange} className={`${inputClassName} pl-10`} required /></div>
                                            </div>
                                            <div>
                                                <label className={labelClassName}>Contact Phone</label>
                                                <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" /><input type="tel" name="contactPhone" value={form.contactPhone} placeholder="+91 98765 43210" onChange={handleChange} className={`${inputClassName} pl-10`} /></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 flex justify-between">
                                <button type="button" onClick={prevStep} disabled={currentStep === 1} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"><ChevronLeft className="w-4 h-4" /> Previous</button>
                                {currentStep < 3 ? (
                                    <button type="button" onClick={nextStep} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2">Next <ChevronRight className="w-4 h-4" /></button>
                                ) : (
                                    <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><CheckCircle className="w-4 h-4" /> Create Event</>}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                )}

                {viewMode === 'list' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {loading && events.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" /> Loading events...
                            </div>
                        ) : events.length === 0 ? (
                            <EmptyState
                              icon={<Calendar className="w-7 h-7 text-blue-600" />}
                              title="No events found"
                              description="Create your first event to get started."
                              actionLabel="Create Event"
                              onAction={() => setViewMode('create')}
                              actionHint="Opens the event creation form."
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-gray-600">
                                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Event Name</th>
                                            <th className="px-6 py-3 font-medium">Date & Time</th>
                                            <th className="px-6 py-3 font-medium">Status</th>
                                            <th className="px-6 py-3 font-medium">QR Check-in</th>
                                            <th className="px-6 py-3 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {events.map((event) => (
                                            <tr key={event._id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4">
                                                    <p className="font-medium text-gray-900">{event.title}</p>
                                                    <p className="text-xs text-gray-500">{event.category} • {event.mode}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p>{new Date(event.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</p>
                                                    <p className="text-xs text-gray-500">{event.startTime} - {event.endTime}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">{event.status}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {event.qrCode ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${event.qrCodeActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                                                {event.qrCodeActive ? 'Active' : 'Inactive'}
                                                            </span>
                                                            <button 
                                                                onClick={() => toggleQRCodeStatus(event._id, !event.qrCodeActive)}
                                                                className={`p-1.5 rounded-lg ${event.qrCodeActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                                                title={event.qrCodeActive ? 'Stop check-in' : 'Start check-in'}
                                                            >
                                                                {event.qrCodeActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => generateQRCode(event._id)}
                                                            className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium"
                                                        >
                                                            Generate QR
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={() => { setSelectedEventId(event._id); setViewMode('attendance'); fetchAttendance(event._id); }}
                                                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="View Attendance"
                                                        >
                                                            <Users className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => deleteEvent(event._id)}
                                                            className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Delete Event"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {viewMode === 'attendance' && selectedEventId && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Attendance Dashboard</h2>
                                <p className="text-sm text-gray-500">Live check-in updates and QR code</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => fetchAttendance(selectedEventId)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Refresh</button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                            {/* QR Code Section */}
                            <div className="p-6 flex flex-col items-center justify-center bg-gray-50/50">
                                {events.find(e => e._id === selectedEventId)?.qrCode ? (
                                    <>
                                        <div className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-200">
                                            <QRCodeSVG 
                                                value={events.find(e => e._id === selectedEventId)?.qrCode || ''} 
                                                size={200}
                                                level={"H"}
                                            />
                                        </div>
                                        <p className="text-sm font-medium text-gray-900 mb-1">Scan to Check-in</p>
                                        <p className="text-xs text-gray-500 mb-2 text-center">Participants can scan this QR code using their student portal</p>
                                        <p className="text-xs text-blue-600 mb-4 bg-blue-50 p-1 rounded font-mono break-all max-w-[200px] text-center" id="raw-qr-code">{events.find(e => e._id === selectedEventId)?.qrCode}</p>
                                        
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => toggleQRCodeStatus(selectedEventId, !events.find(e => e._id === selectedEventId)?.qrCodeActive)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${events.find(e => e._id === selectedEventId)?.qrCodeActive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                            >
                                                {events.find(e => e._id === selectedEventId)?.qrCodeActive ? 'Close Check-in' : 'Open Check-in'}
                                            </button>
                                            <button 
                                                onClick={() => generateQRCode(selectedEventId)}
                                                className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                                                title="Regenerate QR Code"
                                            >
                                                <QrCode className="w-4 h-4 text-gray-600" />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center">
                                        <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm text-gray-500 mb-4">No QR Code generated yet</p>
                                        <button 
                                            onClick={() => generateQRCode(selectedEventId)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                                        >
                                            Generate QR Code
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Participant List Section */}
                            <div className="col-span-2">
                                <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                                    <h3 className="font-medium text-gray-900">Checked-in Participants ({attendanceList.length})</h3>
                                    <button onClick={exportCSV} className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-700">
                                        <Download className="w-4 h-4" /> Export CSV
                                    </button>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto">
                                    {loading ? (
                                        <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin" /> Loading attendance...
                                        </div>
                                    ) : attendanceList.length === 0 ? (
                                        <div className="p-8 text-center text-gray-500">No one has checked in yet.</div>
                                    ) : (
                                        <table className="w-full text-left text-sm text-gray-600">
                                            <thead className="bg-gray-50 text-gray-700 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium">Name</th>
                                                    <th className="px-4 py-3 font-medium">Roll No</th>
                                                    <th className="px-4 py-3 font-medium">Check-in Time</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {attendanceList.map((record: any) => (
                                                    <tr key={record._id}>
                                                        <td className="px-4 py-3 font-medium text-gray-900">{record.participant?.name || 'Unknown'}</td>
                                                        <td className="px-4 py-3">{record.participant?.rollNo || 'N/A'}</td>
                                                        <td className="px-4 py-3">{new Date(record.checkInTime).toLocaleTimeString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
