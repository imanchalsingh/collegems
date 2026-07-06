import fs from "fs";
import path from "path";
import { createRequire } from "module";
import mammoth from "mammoth";

const require = createRequire(import.meta.url);

if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix { constructor() {} };
}

let pdfParse = null;
try {
  pdfParse = require("pdf-parse");
} catch (err) {
  console.error("[Plagiarism Checker] pdf-parse failed to load:", err.message);
}

// ─── VARIABLES PREVIOUSLY CAUSING REFERENCE ERRORS ───
const ASSIGNMENTS_DIR = path.join(process.cwd(), "uploads", "assignments");
const MIN_USABLE_CHARS = 20;

const LIGATURE_MAP = {
  "ﬁ": "fi", "ﬂ": "fl", "ﬀ": "ff", "ﬃ": "ffi", "ﬄ": "ffl",
  "–": "-", "—": "-", "’": "'", "‘": "'", "“": '"', "”": '"',
};

// ─── HELPER FUNCTIONS ───
export const cleanExtractedText = (text) => {
  if (!text) return "";
  let cleaned = text;
  
  for (const [from, to] of Object.entries(LIGATURE_MAP)) {
    cleaned = cleaned.split(from).join(to);
  }
  
  cleaned = cleaned.replace(/(\w)-\s*\n\s*(\w)/g, "$1$2");
  
  // Flatten all newlines to spaces to prevent PDF structure from ruining word matches
  cleaned = cleaned.replace(/\n+/g, " "); 
  
  return cleaned.replace(/\s+/g, " ").trim();
};

export const extractTextFromFile = async (filePath, mimeType = "", originalName = "") => {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`[Plagiarism Checker] File not found on disk: ${filePath}`);
      return "";
    }

    // Check both the hashed file path and the original upload name for extensions
    const ext = path.extname(filePath).toLowerCase() || path.extname(originalName).toLowerCase();
    const mime = mimeType.toLowerCase();
    
    const isPdf = mime === "application/pdf" || ext === ".pdf";
    const isDocx = mime.includes("wordprocessingml") || ext === ".docx";
    const isText = mime.startsWith("text/") || [".txt", ".md", ".csv"].includes(ext);

    console.log(`[Plagiarism Checker] Reading file: ${path.basename(filePath)} | PDF: ${isPdf}, DOCX: ${isDocx}, TXT: ${isText}`);

    if (isPdf) {
      if (!pdfParse) return "";
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      console.log(`[Plagiarism Checker] -> PDF extracted ${data.text?.length || 0} characters.`);
      return cleanExtractedText(data.text || "");
    }

    if (isDocx) {
      const result = await mammoth.extractRawText({ path: filePath });
      console.log(`[Plagiarism Checker] -> DOCX extracted ${result.value?.length || 0} characters.`);
      return cleanExtractedText(result.value || "");
    }

    if (isText) {
      const content = fs.readFileSync(filePath, "utf-8");
      console.log(`[Plagiarism Checker] -> TXT extracted ${content.length} characters.`);
      return cleanExtractedText(content);
    }

    // Best-effort binary strip for older .doc or unrecognized formats
    const raw = fs.readFileSync(filePath, "latin1");
    const cleanedRaw = cleanExtractedText(raw.replace(/[^\x20-\x7E]/g, " "));
    console.log(`[Plagiarism Checker] -> Fallback extraction yielded ${cleanedRaw.length} characters.`);
    return cleanedRaw;

  } catch (err) {
    console.error(`[Plagiarism Checker] Extraction failed for ${filePath}:`, err.message);
    return "";
  }
};

// ─── MAIN EXPORT FUNCTION ───
export const getSubmissionText = async (submission) => {
  let combinedText = "";
  let extractionNotes = [];
  let primarySource = "none";

  // 1. Check for File Uploads FIRST (Priority)
  if (submission.file) {
    let filePath = null;
    let mimeType = "";
    let originalName = "";

    if (typeof submission.file === "string") {
      const possiblePaths = [
        path.join(ASSIGNMENTS_DIR, path.basename(submission.file)),
        path.resolve(submission.file),
        path.join(process.cwd(), submission.file)
      ];
      filePath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
    } else if (typeof submission.file === "object") {
      mimeType = submission.file.mimetype || submission.file.mimeType || "";
      originalName = submission.file.originalname || submission.file.originalName || submission.file.filename || "";
      
      if (submission.file.path) filePath = path.resolve(submission.file.path);
      else if (submission.file.filename) filePath = path.join(ASSIGNMENTS_DIR, submission.file.filename);
    }

    if (filePath) {
      const text = await extractTextFromFile(filePath, mimeType, originalName);
      
      if (!fs.existsSync(filePath)) {
        extractionNotes.push(`File not found: ${path.basename(filePath)}`);
      } else if (text.length < MIN_USABLE_CHARS) {
        extractionNotes.push("File yielded very little text. If this is a PDF, it is likely an image/scanned document without an OCR text layer.");
      } else {
        combinedText += text + " ";
        primarySource = "file";
      }
    }
  }

  // 2. Check for Text Responses (Append them to the file content)
  const submittedText = submission.textResponse || submission.content || submission.text || submission.answer;
  if (submittedText && typeof submittedText === "string" && submittedText.trim()) {
    const cleanedText = cleanExtractedText(submittedText);
    console.log(`[Plagiarism Checker] Text response found. Added ${cleanedText.length} characters.`);
    combinedText += cleanedText + " ";
    if (primarySource === "none") primarySource = "text";
  }

  // 3. Links
  if (!combinedText.trim() && (submission.link || submission.url)) {
    return { text: "", sourceType: "link", extractionNote: "External links are not fetched automatically." };
  }

  if (!combinedText.trim()) {
    return { text: "", sourceType: "none", extractionNote: extractionNotes.join(" ") || "No readable content found." };
  }

  return { 
    text: combinedText.trim(), 
    sourceType: primarySource, 
    extractionNote: extractionNotes.join(" ") 
  };
};