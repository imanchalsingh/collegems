import Book from "../models/Book.model.js";
import BookIssue from "../models/BookIssue.model.js";
import User from "../models/User.model.js";
import LibraryFine from "../models/LibraryFine.model.js";
import Notification from "../models/Notification.model.js";

// GET ALL BOOKS
export const getAllBooks = async (req, res) => {
  try {
    const { search, category, status } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
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
    const { title, author, category, isbn, quantity } = req.body;
    const qty = Number(quantity) || 1;

    const book = new Book({
      title,
      author,
      category,
      isbn,
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
    const { title, author, category, isbn, quantity, status } = req.body;

    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    if (title) book.title = title;
    if (author) book.author = author;
    if (category) book.category = category;
    if (isbn !== undefined) book.isbn = isbn;

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

    // Update overdue statuses dynamically
    const activeIssues = await BookIssue.find({
      status: "issued",
      dueDate: { $lt: new Date() },
    });

    for (let issue of activeIssues) {
      issue.status = "overdue";
      await issue.save();
    }

    const issues = await BookIssue.find(query)
      .populate("book", "title author category")
      .populate("user", "name email role studentId teacherId")
      .sort({ createdAt: -1 });

    res.json({ success: true, issues });
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

// PAY LIBRARY FINE (MOCK PAYMENT)
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

    // Mocking successful payment
    fine.status = "Paid";
    fine.paidOn = new Date();
    await fine.save();

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
