import Book from "../models/Book.model.js";
import BookIssue from "../models/BookIssue.model.js";
import User from "../models/User.model.js";
import LibraryFine from "../models/LibraryFine.model.js";
import Notification from "../models/Notification.model.js";
import BookReservation from "../models/BookReservation.model.js";
import { logAction } from "../utils/auditService.js";
import { sendEmail } from "../utils/email.js";

// GET ALL BOOKS
export const getAllBooks = async (req, res) => {
  try {
    const { search, category, status } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { isbn: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
      ];
    }

    if (category && category !== "all") {
      query.category = category;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    const books = await Book.find(query).sort({ title: 1 });

    // Compute stats
    const totalAvailable = await Book.countDocuments({ status: "available" });
    const totalUnavailable = await Book.countDocuments({ status: "unavailable" });

    res.json({
      success: true,
      books,
      stats: {
        totalAvailable,
        totalUnavailable,
        totalBooks: totalAvailable + totalUnavailable,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ADD BOOK
export const addBook = async (req, res) => {
  try {
    const { title, author, category, isbn, barcode, quantity } = req.body;
    const qty = Number(quantity) || 1;
    const code = (barcode || isbn || "").trim() || undefined;

    const book = new Book({
      title,
      author,
      category,
      isbn: isbn || undefined,
      barcode: code,
      quantity: qty,
      availableQuantity: qty,
      status: qty > 0 ? "available" : "unavailable",
    });

    await book.save();
    res.status(201).json({ success: true, message: "Book added successfully", book });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE BOOK
export const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, category, isbn, barcode, quantity, status } = req.body;

    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    if (title) book.title = title;
    if (author) book.author = author;
    if (category) book.category = category;
    if (isbn !== undefined) book.isbn = isbn;
    if (barcode !== undefined) book.barcode = barcode;

    if (quantity !== undefined) {
      const oldQty = book.quantity;
      const newQty = Number(quantity);
      const diff = newQty - oldQty;
      book.quantity = newQty;
      book.availableQuantity = Math.max(0, book.availableQuantity + diff);
    }

    if (status) {
      book.status = status;
    } else {
      book.status = book.availableQuantity > 0 ? "available" : "unavailable";
    }

    await book.save();
    res.json({ success: true, message: "Book updated successfully", book });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE BOOK
export const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findByIdAndDelete(id);
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }
    res.json({ success: true, message: "Book deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ISSUE BOOK
export const issueBook = async (req, res) => {
  try {
    const { bookId, userEmail, dueDate } = req.body;

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    if (book.availableQuantity <= 0) {
      return res.status(400).json({ success: false, message: "Book is not available for issue" });
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found with this email" });
    }

    // Check if user already has an active issue of this book
    const existingIssue = await BookIssue.findOne({
      book: bookId,
      user: user._id,
      status: { $in: ["issued", "overdue"] },
    });
    if (existingIssue) {
      return res.status(400).json({ success: false, message: "User already has this book issued" });
    }

    // Issue book
    book.availableQuantity -= 1;
    if (book.availableQuantity === 0) {
      book.status = "unavailable";
    }
    await book.save();

    const issueRecord = new BookIssue({
      book: bookId,
      user: user._id,
      dueDate: new Date(dueDate),
      status: "issued",
    });

    await issueRecord.save();
    res.status(201).json({ success: true, message: "Book issued successfully", issueRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// RETURN BOOK
export const returnBook = async (req, res) => {
  try {
    const { issueId } = req.params;

    const issueRecord = await BookIssue.findById(issueId);
    if (!issueRecord) {
      return res.status(404).json({ success: false, message: "Issue record not found" });
    }

    if (issueRecord.status === "returned") {
      return res.status(400).json({ success: false, message: "Book already returned" });
    }

    // Return book
    const book = await Book.findById(issueRecord.book);
    if (book) {
      book.availableQuantity += 1;
      book.status = "available";
      await book.save();
    }

    issueRecord.returnDate = new Date();
    issueRecord.status = "returned";
    await issueRecord.save();

    // Notify next reservation in queue when a copy becomes available
    await notifyNextReservation(book).catch((err) =>
      console.warn("Reservation notify failed:", err.message)
    );

    res.json({ success: true, message: "Book returned successfully", issueRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET ISSUE RECORDS
export const getIssueRecords = async (req, res) => {
  try {
    const { role, id } = req.user;
    let query = {};

    if (role === "student") {
      query.user = id;
    } else if (role === "parent") {
      const parentUser = await User.findById(id);
      if (parentUser && parentUser.studentId) {
        const studentUser = await User.findOne({ studentId: parentUser.studentId, role: "student" });
        if (studentUser) {
          query.user = studentUser._id;
        } else {
          query.user = null;
        }
      } else {
        query.user = null;
      }
    }

    // GET must be side-effect free, so we do not persist status changes here.
    // The "issued" -> "overdue" transition (and its fines/notifications) is
    // owned by the daily processLibraryFines cron job. We only derive the
    // overdue status at read time so the response stays accurate between runs.
    const now = new Date();
    const issues = await BookIssue.find(query)
      .populate("book", "title author category")
      .populate("user", "name email role studentId teacherId")
      .sort({ createdAt: -1 })
      .lean();

    const issuesWithDerivedStatus = issues.map((issue) =>
      issue.status === "issued" && issue.dueDate < now
        ? { ...issue, status: "overdue" }
        : issue
    );

    res.json({ success: true, issues: issuesWithDerivedStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET USER FINES
export const getUserFines = async (req, res) => {
  try {
    const { role, id } = req.user;
    let query = {};

    if (role === "student") {
      query.student = id;
    }

    const fines = await LibraryFine.find(query)
      .populate({
        path: "issue",
        populate: { path: "book", select: "title" }
      })
      .populate("student", "name email studentId")
      .sort({ createdAt: -1 });

    res.json({ success: true, fines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// RECORD A LIBRARY FINE AS PAID
// Restricted to hod/teacher (see library.routes.js) - the librarian collects
// the fine in person and records it here. There's no payment gateway, so this
// must stay a staff-confirmed action rather than something the paying student
// can trigger themselves.
export const payLibraryFine = async (req, res) => {
  try {
    const { fineId } = req.params;

    const fine = await LibraryFine.findById(fineId).populate("student");
    if (!fine) {
      return res.status(404).json({ success: false, message: "Fine not found" });
    }

    if (fine.status === "Paid") {
      return res.status(400).json({ success: false, message: "Fine is already paid" });
    }

    fine.status = "Paid";
    fine.paidOn = new Date();
    await fine.save();

    await logAction(req.user.id, "PAY_LIBRARY_FINE", "LibraryFine", fine._id, {
      studentId: fine.student._id,
      amount: fine.amount,
    });

    // Create Notification for successful payment
    const notification = new Notification({
      recipient: fine.student._id,
      type: "library",
      message: `Payment of ₹${fine.amount} for your library fine was successful.`,
    });
    await notification.save();

    res.json({ success: true, message: "Fine paid successfully", fine });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Look up book by barcode or ISBN (scanner / RFID) */
export const findBookByCode = async (req, res) => {
  try {
    const code = String(req.params.code || "").trim();
    if (!code) {
      return res.status(400).json({ success: false, message: "code is required" });
    }

    const book = await Book.findOne({
      $or: [{ barcode: code }, { isbn: code }],
    });

    if (!book) {
      return res.status(404).json({ success: false, message: "No book found for that barcode/ISBN" });
    }

    res.json({ success: true, book });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

async function notifyNextReservation(book) {
  if (!book || book.availableQuantity <= 0) return;

  const next = await BookReservation.findOne({
    book: book._id,
    status: "queued",
  }).sort({ createdAt: 1 }).populate("user", "name email");

  if (!next?.user) return;

  next.status = "notified";
  next.notifiedAt = new Date();
  next.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  await next.save();

  await Notification.create({
    recipient: next.user._id,
    type: "library",
    message: `"${book.title}" is now available. Collect within 48 hours (reservation hold).`,
  }).catch(() => null);

  if (next.user.email) {
    await sendEmail(
      next.user.email,
      `Library reservation available: ${book.title}`,
      `Hello ${next.user.name},\n\nThe book "${book.title}" you reserved is now available. Please collect it within 48 hours.\n\n— SCMS Library`
    );
  }
}

/** Student joins reservation queue */
export const reserveBook = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ success: false, message: "Only students can reserve books" });
    }

    const { bookId } = req.body;
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    if (book.availableQuantity > 0) {
      return res.status(400).json({
        success: false,
        message: "Copies are available — borrow at the desk instead of joining the queue",
      });
    }

    const existing = await BookReservation.findOne({
      book: bookId,
      user: req.user.id,
      status: { $in: ["queued", "notified"] },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: "You are already in the queue" });
    }

    const ahead = await BookReservation.countDocuments({
      book: bookId,
      status: { $in: ["queued", "notified"] },
    });

    const reservation = await BookReservation.create({
      book: bookId,
      user: req.user.id,
      status: "queued",
      position: ahead + 1,
    });

    res.status(201).json({
      success: true,
      message: `Joined reservation queue (position ${ahead + 1})`,
      reservation,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyReservations = async (req, res) => {
  try {
    const filter =
      req.user.role === "student"
        ? { user: req.user.id }
        : {};
    const reservations = await BookReservation.find(filter)
      .populate("book", "title author isbn barcode availableQuantity")
      .populate("user", "name email studentId")
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, reservations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelReservation = async (req, res) => {
  try {
    const reservation = await BookReservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: "Reservation not found" });
    }
    if (
      req.user.role === "student" &&
      String(reservation.user) !== String(req.user.id)
    ) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }
    reservation.status = "cancelled";
    await reservation.save();
    res.json({ success: true, message: "Reservation cancelled", reservation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
