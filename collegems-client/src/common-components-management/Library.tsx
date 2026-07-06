import { useEffect, useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import api from "../api/axios";
import {
  Book as BookIcon,
  BookOpen,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash,
  CheckCircle,
  XCircle,
  RotateCcw,
  Calendar,
  X,
  User,
  AlertTriangle,
  Loader2,
  Bookmark,
  Inbox
} from "lucide-react";
import AdvancedExportButton from "./AdvancedExportButton";
import EmptyState from "../components/EmptyState";

interface Book {
  _id: string;
  title: string;
  author: string;
  category: string;
  isbn?: string;
  quantity: number;
  availableQuantity: number;
  status: "available" | "unavailable";
  createdAt: string;
}

interface UserSummary {
  _id: string;
  name: string;
  email: string;
  role: string;
  studentId?: string;
  teacherId?: string;
}

interface BookSummary {
  _id: string;
  title: string;
  author: string;
  category: string;
}

interface BookIssue {
  _id: string;
  book: BookSummary;
  user: UserSummary;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: "issued" | "returned" | "overdue";
  createdAt: string;
}

export default function Library() {
  const [books, setBooks] = useState<Book[]>([]);
  const [issues, setIssues] = useState<BookIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tabs
  const [activeSubTab, setActiveSubTab] = useState<"browse" | "my-borrows" | "all-issues">("browse");
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalAvailable: 0,
    totalUnavailable: 0,
    totalIssued: 0,
  });

  // Role info
  const role = localStorage.getItem("role") || "student";

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // Forms state
  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    category: "Computer Science",
    isbn: "",
    quantity: 1,
  });

  const [issueForm, setIssueForm] = useState({
    bookId: "",
    bookTitle: "",
    userEmail: "",
    dueDate: "",
  });

  // Categories
  const categories = [
    "Computer Science",
    "Mathematics",
    "Physics",
    "Chemistry",
    "English",
    "Management",
    "Mechanical Engineering",
    "Reference",
  ];

  useEffect(() => {
    fetchLibraryData();
    if (role === "student") {
      setActiveSubTab("browse");
    } else {
      setActiveSubTab("browse");
    }
  }, [role]);

  const fetchLibraryData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const booksRes = await api.get("/library/books");
      setBooks(booksRes.data.books);
      
      const libraryStats = booksRes.data.stats;
      
      const issuesRes = await api.get("/library/issues");
      setIssues(issuesRes.data.issues);
      
      const activeIssuesCount = issuesRes.data.issues.filter(
        (i: BookIssue) => i.status === "issued" || i.status === "overdue"
      ).length;

      setStats({
        totalBooks: libraryStats.totalBooks,
        totalAvailable: libraryStats.totalAvailable,
        totalUnavailable: libraryStats.totalUnavailable,
        totalIssued: activeIssuesCount,
      });

    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || "Failed to fetch library details.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBookFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBookForm({
      ...bookForm,
      [name]: name === "quantity" ? Number(value) : value,
    });
  };

  const handleAddBook = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/library/books", bookForm);
      setShowAddModal(false);
      setBookForm({
        title: "",
        author: "",
        category: "Computer Science",
        isbn: "",
        quantity: 1,
      });
      fetchLibraryData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Error adding book");
    }
  };

  const handleOpenEdit = (book: Book) => {
    setSelectedBook(book);
    setBookForm({
      title: book.title,
      author: book.author,
      category: book.category,
      isbn: book.isbn || "",
      quantity: book.quantity,
    });
    setShowEditModal(true);
  };

  const handleEditBook = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;
    try {
      await api.put(`/library/books/${selectedBook._id}`, bookForm);
      setShowEditModal(false);
      setSelectedBook(null);
      fetchLibraryData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Error updating book");
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this book?")) return;
    try {
      await api.delete(`/library/books/${id}`);
      fetchLibraryData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Error deleting book");
    }
  };

  const handleOpenIssue = (book: Book) => {
    setIssueForm({
      bookId: book._id,
      bookTitle: book.title,
      userEmail: "",
      dueDate: "",
    });
    setShowIssueModal(true);
  };

  const handleIssueBook = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/library/issue", {
        bookId: issueForm.bookId,
        userEmail: issueForm.userEmail,
        dueDate: issueForm.dueDate,
      });
      setShowIssueModal(false);
      fetchLibraryData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Error issuing book");
    }
  };

  const handleReturnBook = async (issueId: string) => {
    if (!window.confirm("Are you sure you want to mark this book as returned?")) return;
    try {
      await api.post(`/library/return/${issueId}`);
      fetchLibraryData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Error returning book");
    }
  };

  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (book.isbn && book.isbn.includes(searchTerm));

    const matchesCategory =
      categoryFilter === "all" || book.category === categoryFilter;

    const matchesStatus =
      statusFilter === "all" || book.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
      case "returned":
        return "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "unavailable":
      case "overdue":
        return "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      case "issued":
        return "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      default:
        return "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading && books.length === 0) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin" />
        <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium">Loading library details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Library Catalog
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage, search, issue, and track books in the campus library</p>
        </div>
        {role !== "student" && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Book
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
          <button onClick={fetchLibraryData} className="text-xs underline font-semibold ml-auto hover:text-rose-900 dark:hover:text-rose-200">
            Retry
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <BookIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Books</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalBooks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Available Books</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalAvailable}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-50 dark:bg-rose-900/30 rounded-lg">
              <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Unavailable Books</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalUnavailable}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
              <Bookmark className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Issues</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalIssued}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 flex gap-6">
        <button
          onClick={() => setActiveSubTab("browse")}
          className={`py-3 px-1 border-b-2 font-medium text-sm transition-all -mb-px ${
            activeSubTab === "browse"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Browse Books
        </button>
        {role === "student" && (
          <button
            onClick={() => setActiveSubTab("my-borrows")}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-all -mb-px ${
              activeSubTab === "my-borrows"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            My Borrow History
          </button>
        )}
        {role !== "student" && (
          <button
            onClick={() => setActiveSubTab("all-issues")}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-all -mb-px ${
              activeSubTab === "all-issues"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Book Issue Log
          </button>
        )}
      </div>

      {/* Tab: Browse Books */}
      {activeSubTab === "browse" && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search books by title, author, or ISBN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
                <button
                  onClick={fetchLibraryData}
                  className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  title="Refresh"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <AdvancedExportButton
                  data={filteredBooks}
                  filename="Library_Books_Export"
                  pdfTitle="Library Catalog"
                  headers={["Title", "Author", "Category", "ISBN", "Total Qty", "Available Qty", "Status"]}
                  dataMapper={(book: Book) => [
                    book.title,
                    book.author,
                    book.category,
                    book.isbn || "N/A",
                    book.quantity.toString(),
                    book.availableQuantity.toString(),
                    book.status.toUpperCase()
                  ]}
                />
              </div>
            </div>

            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Books Catalog Grid */}
          {filteredBooks.length === 0 ? (
            books.length === 0 && role !== "student" ? (
              <EmptyState
                icon={<BookOpen className="w-7 h-7 text-blue-600" />}
                title="No books in the catalog"
                description="Add the first book to start building your library collection."
                actionLabel="Add First Book"
                onAction={() => setShowAddModal(true)}
                actionHint="Opens the add book form."
              />
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center shadow-sm">
                <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No books found</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Try modifying your search query or filters</p>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBooks.map((book) => (
                <div
                  key={book._id}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-md">
                        {book.category}
                      </span>
                      <span className={`px-2 py-0.5 border text-xs font-semibold rounded-md ${getStatusColor(book.status)}`}>
                        {book.status.charAt(0).toUpperCase() + book.status.slice(1)}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-gray-950 dark:text-white leading-tight text-lg mb-1">
                        {book.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                        by {book.author}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-800 pt-3 text-xs text-gray-500 dark:text-gray-400">
                      <div>
                        <span className="block text-gray-400 dark:text-gray-500 font-medium">Available Copies</span>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{book.availableQuantity} of {book.quantity}</p>
                      </div>
                      {book.isbn && (
                        <div>
                          <span className="block text-gray-400 dark:text-gray-500 font-medium">ISBN</span>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{book.isbn}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-5 py-3 flex gap-2 justify-end">
                    {role !== "student" ? (
                      <>
                        <button
                          onClick={() => handleOpenIssue(book)}
                          disabled={book.availableQuantity <= 0}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold"
                        >
                          Issue Book
                        </button>
                        <button
                          onClick={() => handleOpenEdit(book)}
                          className="p-1.5 border border-gray-200 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-all"
                          title="Edit Book"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBook(book._id)}
                          className="p-1.5 border border-rose-200 dark:border-rose-800 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:border-rose-300 dark:hover:border-rose-700 transition-all"
                          title="Delete Book"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500 self-center">
                        {book.availableQuantity > 0 ? "In Stock" : "Checked Out"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: My Borrow History */}
      {activeSubTab === "my-borrows" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          {issues.length === 0 ? (
            <div className="p-12 text-center">
              <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No borrowed books</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">You haven't borrowed any library books yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold">
                    <th className="p-4">Book Title</th>
                    <th className="p-4">Borrow Date</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">Return Date</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue) => (
                    <tr key={issue._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="p-4 font-semibold text-gray-950 dark:text-white">
                        {issue.book.title}
                        <span className="block font-normal text-xs text-gray-500 dark:text-gray-400 mt-0.5">by {issue.book.author}</span>
                      </td>
                      <td className="p-4 text-gray-600 dark:text-gray-400">{formatDate(issue.issueDate)}</td>
                      <td className="p-4 text-gray-600 dark:text-gray-400">{formatDate(issue.dueDate)}</td>
                      <td className="p-4 text-gray-600 dark:text-gray-400">{issue.returnDate ? formatDate(issue.returnDate) : "-"}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 border text-xs font-semibold rounded-md ${getStatusColor(issue.status)}`}>
                          {issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: All Issues Log */}
      {activeSubTab === "all-issues" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            {issues.length === 0 ? (
              <div className="p-12 text-center">
                <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No book issues log</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">No books have been issued to students or faculty yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold">
                      <th className="p-4">Book Title</th>
                      <th className="p-4">Borrower Details</th>
                      <th className="p-4">Borrow Date</th>
                      <th className="p-4">Due Date</th>
                      <th className="p-4">Return Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((issue) => (
                      <tr key={issue._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="p-4 font-semibold text-gray-950 dark:text-white">
                          {issue.book?.title || "Deleted Book"}
                          <span className="block font-normal text-xs text-gray-500 dark:text-gray-400 mt-0.5">by {issue.book?.author || "N/A"}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-gray-950 dark:text-white">{issue.user.name}</span>
                          <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {issue.user.email} ({issue.user.role})
                          </span>
                        </td>
                        <td className="p-4 text-gray-600 dark:text-gray-400">{formatDate(issue.issueDate)}</td>
                        <td className="p-4 text-gray-600 dark:text-gray-400">{formatDate(issue.dueDate)}</td>
                        <td className="p-4 text-gray-600 dark:text-gray-400">{issue.returnDate ? formatDate(issue.returnDate) : "-"}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 border text-xs font-semibold rounded-md ${getStatusColor(issue.status)}`}>
                            {issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {(issue.status === "issued" || issue.status === "overdue") && (
                            <button
                              onClick={() => handleReturnBook(issue._id)}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-xs font-semibold inline-flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Return
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD BOOK */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Add Book to Catalog
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddBook} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Book Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  value={bookForm.title}
                  onChange={handleBookFormChange}
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Clean Code"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Author Name *</label>
                <input
                  type="text"
                  name="author"
                  required
                  value={bookForm.author}
                  onChange={handleBookFormChange}
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Robert C. Martin"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Category *</label>
                  <select
                    name="category"
                    value={bookForm.category}
                    onChange={handleBookFormChange}
                    className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">ISBN</label>
                  <input
                    type="text"
                    name="isbn"
                    value={bookForm.isbn}
                    onChange={handleBookFormChange}
                    className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 978-0132350884"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Quantity *</label>
                <input
                  type="number"
                  name="quantity"
                  required
                  min="1"
                  value={bookForm.quantity}
                  onChange={handleBookFormChange}
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 flex gap-3 justify-end border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
                >
                  Save Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT BOOK */}
      {showEditModal && selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Edit Book Details
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditBook} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Book Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  value={bookForm.title}
                  onChange={handleBookFormChange}
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Author Name *</label>
                <input
                  type="text"
                  name="author"
                  required
                  value={bookForm.author}
                  onChange={handleBookFormChange}
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Category *</label>
                  <select
                    name="category"
                    value={bookForm.category}
                    onChange={handleBookFormChange}
                    className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">ISBN</label>
                  <input
                    type="text"
                    name="isbn"
                    value={bookForm.isbn}
                    onChange={handleBookFormChange}
                    className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Total Quantity *</label>
                <input
                  type="number"
                  name="quantity"
                  required
                  min={selectedBook.quantity - selectedBook.availableQuantity}
                  value={bookForm.quantity}
                  onChange={handleBookFormChange}
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 flex gap-3 justify-end border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
                >
                  Update Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ISSUE BOOK */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Issue Book
              </h3>
              <button onClick={() => setShowIssueModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleIssueBook} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-400 dark:text-gray-500 mb-1">Selected Book</label>
                <p className="text-base font-bold text-gray-900 dark:text-white">{issueForm.bookTitle}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Borrower Email *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="email"
                    required
                    value={issueForm.userEmail}
                    onChange={(e) => setIssueForm({ ...issueForm, userEmail: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="student@college.edu or teacher@college.edu"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Due Date *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    value={issueForm.dueDate}
                    onChange={(e) => setIssueForm({ ...issueForm, dueDate: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3 justify-end border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
                >
                  Confirm Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}