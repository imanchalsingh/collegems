import { useEffect, useState } from "react";
import axios from "../api/axios";
import { addRecentHistory } from "../api/history";
import { Scanner } from '@yudiel/react-qr-scanner';
import {
  Calendar,
  MapPin,
  Video,
  Users,
  Clock,
  User,
  Building,
  ExternalLink,
  Filter,
  Search,
  X,
  Tag,
  ChevronRight,
  Download,
  Globe,
  CalendarDays,
  Mail,
  Phone,
  BookOpen,
  Info,
  AlertCircle,
  Loader2,
  QrCode,
  CheckCircle,
} from 'lucide-react';

interface Event {
    _id: string;
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
    venue?: string;
    meetingLink?: string;
    coverImage: string;
    registrationRequired: boolean;
    maxParticipants?: number;
    contactName: string;
    contactEmail: string;
    contactPhone?: string;
    prerequisites?: string;
    targetAudience?: string;
    tags?: string;
    createdAt: string;
}

export default function EventsStudent() {
    const [events, setEvents] = useState<Event[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [selectedMode, setSelectedMode] = useState<string>("all");
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [selectedevent, setSelectedevent] = useState<Event | null>(null);
    const [showModal, setShowModal] = useState<boolean>(false);

    // Scanner state
    const [showScanner, setShowScanner] = useState<boolean>(false);
    const [checkingIn, setCheckingIn] = useState<boolean>(false);
    const [checkInMessage, setCheckInMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    // Get unique categories
    const categories = ["all", ...new Set(events.map(w => w.category))];
    const modes = ["all", "online", "offline", "hybrid"];

    useEffect(() => {
        fetchEvents();
    }, []);

    useEffect(() => {
        filterEvents();
    }, [searchTerm, selectedCategory, selectedMode, events]);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const res = await axios.get("/events");
            setEvents(res.data.data);
            setFilteredEvents(res.data.data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError("Failed to load events. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const filterEvents = () => {
        let filtered = events;

        if (searchTerm) {
            filtered = filtered.filter(w =>
                w.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                w.speaker.toLowerCase().includes(searchTerm.toLowerCase()) ||
                w.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
                w.shortDescription.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (selectedCategory !== "all") {
            filtered = filtered.filter(w => w.category === selectedCategory);
        }

        if (selectedMode !== "all") {
            filtered = filtered.filter(w => w.mode === selectedMode);
        }

        setFilteredEvents(filtered);
    };

    const clearFilters = () => {
        setSearchTerm("");
        setSelectedCategory("all");
        setSelectedMode("all");
    };

    const handleViewDetails = (event: Event) => {
        setSelectedevent(event);
        setShowModal(true);
        addRecentHistory({
            entityType: "Event",
            entityId: event._id,
            displayName: event.title,
            url: `/events` // or a direct link if there is one
        }).catch(console.error);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedevent(null);
    };

    const handleScan = async (data: any) => {
        if (data && data.length > 0 && data[0].rawValue && !checkingIn) {
            const qrCodeValue = data[0].rawValue;
            setCheckingIn(true);
            try {
                const res = await axios.post('/events/check-in', { qrCode: qrCodeValue });
                setCheckInMessage({ type: 'success', text: res.data.message });
                setShowScanner(false);
            } catch (err: any) {
                setCheckInMessage({ type: 'error', text: err.response?.data?.message || 'Check-in failed' });
                setShowScanner(false);
            } finally {
                setCheckingIn(false);
            }
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC'
        });
    };

    const getModeColor = (mode: string) => {
        switch (mode) {
            case 'online': return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
            case 'offline': return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
            case 'hybrid': return 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
            default: return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
        }
    };

    const getModeIcon = (mode: string) => {
        switch (mode) {
            case 'online': return <Video className="w-4 h-4" />;
            case 'offline': return <MapPin className="w-4 h-4" />;
            case 'hybrid': return <Globe className="w-4 h-4" />;
            default: return null;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto" />
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading events...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Unable to load events
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
                    <button
                        onClick={fetchEvents}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Loader2 className="w-4 h-4" />
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header - FIXED */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Events & Events</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Discover and join upcoming events, seminars, and webinars</p>
            </div>

            {/* Search and Filter Bar - FIXED */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search by title, speaker, organization..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-10 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Filter Toggle Button - FIXED */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="lg:hidden px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                    </button>

                    {/* Desktop Filters - FIXED */}
                    <div className="hidden lg:flex items-center gap-3">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>
                                    {cat === 'all' ? 'All Categories' : cat}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedMode}
                            onChange={(e) => setSelectedMode(e.target.value)}
                            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                            {modes.map(mode => (
                                <option key={mode} value={mode}>
                                    {mode === 'all' ? 'All Modes' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                                </option>
                            ))}
                        </select>

                        {(searchTerm || selectedCategory !== "all" || selectedMode !== "all") && (
                            <button
                                onClick={clearFilters}
                                className="px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-sm flex items-center gap-1"
                            >
                                <X className="w-4 h-4" />
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile Filters - FIXED */}
                {showFilters && (
                    <div className="lg:hidden mt-4 space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>
                                    {cat === 'all' ? 'All Categories' : cat}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedMode}
                            onChange={(e) => setSelectedMode(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                            {modes.map(mode => (
                                <option key={mode} value={mode}>
                                    {mode === 'all' ? 'All Modes' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                                </option>
                            ))}
                        </select>

                        {(searchTerm || selectedCategory !== "all" || selectedMode !== "all") && (
                            <button
                                onClick={clearFilters}
                                className="w-full px-4 py-2 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-sm"
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Results Stats - FIXED */}
            <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Showing <span className="font-medium text-gray-700 dark:text-gray-300">{filteredEvents.length}</span> events
                </p>
                <div className="flex gap-2">
                    <button onClick={() => setShowScanner(true)} className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-sm">
                        <QrCode className="w-4 h-4" />
                        Scan Check-in QR
                    </button>
                    <button className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2 hidden md:flex">
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Check-in Message Toast - FIXED */}
            {checkInMessage && (
                <div className={`p-4 rounded-xl border flex items-center justify-between ${checkInMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'}`}>
                    <div className="flex items-center gap-3">
                        {checkInMessage.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
                        <span className="font-medium">{checkInMessage.text}</span>
                    </div>
                    <button onClick={() => setCheckInMessage(null)} className="p-1 hover:bg-white/50 dark:hover:bg-gray-800 rounded-lg">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* events Grid - FIXED */}
            {filteredEvents.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <CalendarDays className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No events found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Try adjusting your search or filters</p>
                    <button
                        onClick={clearFilters}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                        Clear Filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEvents.map((event) => (
                        <div
                            key={event._id}
                            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                        >
                            {/* Image Container - FIXED */}
                            <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-800">
                                <img
                                    src={event.coverImage || 'https://via.placeholder.com/800x400?text=event'}
                                    alt={event.title}
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x400?text=event';
                                    }}
                                />

                                {/* Category Badge - FIXED */}
                                <div className="absolute top-3 left-3">
                                    <span className="px-2 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700">
                                        {event.category}
                                    </span>
                                </div>

                                {/* Mode Badge - FIXED */}
                                <div className="absolute top-3 right-3">
                                    <span className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 border ${getModeColor(event.mode)}`}>
                                        {getModeIcon(event.mode)}
                                        {event.mode?.charAt(0).toUpperCase() + event.mode?.slice(1)}
                                    </span>
                                </div>
                            </div>

                            {/* Content - FIXED */}
                            <div className="p-5">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                                    {event.title}
                                </h3>

                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                                    {event.shortDescription}
                                </p>

                                {/* Speaker & Organization - FIXED */}
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                        <span className="text-gray-600 dark:text-gray-400">{event.speaker}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Building className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                        <span className="text-gray-600 dark:text-gray-400">{event.organization}</span>
                                    </div>
                                </div>

                                {/* Date & Time - FIXED */}
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                    <span>{formatDate(event.date)}</span>
                                    <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-2" />
                                    <span>{event.startTime}</span>
                                </div>

                                {/* Tags - FIXED */}
                                {event.tags && (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {event.tags.split(',').map((tag, index) => (
                                            <span
                                                key={index}
                                                className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-lg flex items-center gap-1"
                                            >
                                                <Tag className="w-3 h-3" />
                                                {tag.trim()}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Action Buttons - FIXED */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleViewDetails(event)}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                    >
                                        Details
                                        <ChevronRight className="w-4 h-4" />
                                    </button>

                                    {event.mode !== 'offline' && event.meetingLink && (
                                        <a
                                            href={event.meetingLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-600 dark:text-gray-400"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* event Details Modal - FIXED */}
            {showModal && selectedevent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header - FIXED */}
                        <div className="relative h-56 bg-gray-100 dark:bg-gray-800">
                            <img
                                src={selectedevent.coverImage || 'https://via.placeholder.com/1200x400?text=event'}
                                alt={selectedevent.title}
                                className="w-full h-full object-cover"
                            />
                            <button
                                onClick={closeModal}
                                className="absolute top-4 right-4 p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
                            >
                                <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>

                            {/* Badges - FIXED */}
                            <div className="absolute bottom-4 left-4 flex gap-2">
                                <span className="px-3 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700">
                                    {selectedevent.category}
                                </span>
                                <span className={`px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1 border ${getModeColor(selectedevent.mode)}`}>
                                    {getModeIcon(selectedevent.mode)}
                                    {selectedevent.mode.charAt(0).toUpperCase() + selectedevent.mode.slice(1)}
                                </span>
                            </div>
                        </div>

                        {/* Modal Content - FIXED */}
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{selectedevent.title}</h2>

                            {/* Key Info Grid - FIXED */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                    <span className="font-medium">Speaker:</span> {selectedevent.speaker}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Building className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                    <span className="font-medium">Organization:</span> {selectedevent.organization}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                    <span className="font-medium">Date:</span> {formatDate(selectedevent.date)}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                    <span className="font-medium">Time:</span> {selectedevent.startTime} - {selectedevent.endTime}
                                </div>
                            </div>

                            {/* Description - FIXED */}
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                        <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                        About this event
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{selectedevent.description}</p>
                                </div>

                                {selectedevent.prerequisites && (
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                            Prerequisites
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{selectedevent.prerequisites}</p>
                                    </div>
                                )}

                                {selectedevent.targetAudience && (
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                            <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                            Target Audience
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{selectedevent.targetAudience}</p>
                                    </div>
                                )}

                                {selectedevent.mode !== 'online' && selectedevent.venue && (
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                            Venue
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{selectedevent.venue}</p>
                                    </div>
                                )}

                                {/* Contact Information - FIXED */}
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                        Contact Information
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                            {selectedevent.contactName}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                            {selectedevent.contactEmail}
                                        </div>
                                        {selectedevent.contactPhone && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                                {selectedevent.contactPhone}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {selectedevent.registrationRequired && (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                                            <div>
                                                <p className="font-medium text-amber-800 dark:text-amber-300">Registration Required</p>
                                                {selectedevent.maxParticipants && (
                                                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                                                        Maximum participants: {selectedevent.maxParticipants}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer - FIXED */}
                            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                                <button
                                    onClick={closeModal}
                                    className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
                                >
                                    Close
                                </button>
                                {selectedevent.mode !== 'offline' && selectedevent.meetingLink && (
                                    <a
                                        href={selectedevent.meetingLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                                    >
                                        <Video className="w-4 h-4" />
                                        Join event
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Scanner Modal - FIXED */}
            {showScanner && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <QrCode className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Event Check-in
                            </h3>
                            <button onClick={() => setShowScanner(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 flex flex-col items-center">
                            {checkingIn ? (
                                <div className="py-12 flex flex-col items-center">
                                    <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
                                    <p className="text-gray-600 dark:text-gray-400 font-medium">Verifying check-in...</p>
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">Point your camera at the event QR code to check in.</p>
                                    <div className="w-full max-w-[300px] aspect-square rounded-2xl overflow-hidden border-4 border-blue-100 dark:border-blue-900 shadow-inner relative bg-gray-900 mb-4">
                                        <Scanner onScan={handleScan} />
                                    </div>
                                    <div className="w-full max-w-[300px]">
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 text-center">Or enter code manually for testing:</p>
                                        <div className="flex gap-2">
                                            <input 
                                                id="manual-qr-input"
                                                type="text" 
                                                className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                                placeholder="Paste QR secret"
                                            />
                                            <button 
                                                id="manual-qr-submit"
                                                onClick={() => {
                                                    const val = (document.getElementById('manual-qr-input') as HTMLInputElement).value;
                                                    if(val) handleScan([{rawValue: val}]);
                                                }}
                                                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                                            >
                                                Submit
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}