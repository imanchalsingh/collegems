import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

let pdfParse = null;
try {
  pdfParse = (await import('pdf-parse')).default;
} catch (error) {
  pdfParse = null;
}

const MIN_EXTRACTED_TEXT_LENGTH = 20;

const normalizeText = (text) => {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
};

const getFileExtension = (file) => {
  if (!file?.originalname && !file?.path) return '';
  const name = file.originalname || path.basename(file.path);
  return path.extname(name).toLowerCase();
};

export const extractResumeText = async (file) => {
  if (!file?.path) {
    throw new Error('Resume file is required');
  }

  if (!fs.existsSync(file.path)) {
    throw new Error('Resume file is corrupted or unreadable');
  }

  const extension = getFileExtension(file);
  const mimeType = (file.mimetype || '').toLowerCase();

  try {
    if (extension === '.pdf' || mimeType === 'application/pdf') {
      if (!pdfParse) {
        throw new Error('PDF parsing is unavailable in the current environment');
      }
      const buffer = fs.readFileSync(file.path);
      const result = await pdfParse(buffer);
      const extractedText = normalizeText(result?.text || '');
      if (!extractedText) {
        throw new Error('No text could be extracted from the PDF');
      }
      if (extractedText.length < MIN_EXTRACTED_TEXT_LENGTH) {
        throw new Error('Could not read enough text from the PDF');
      }
      return extractedText;
    }

    if (extension === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: file.path });
      const extractedText = normalizeText(result?.value || '');
      if (!extractedText) {
        throw new Error('No text could be extracted from the DOCX file');
      }
      if (extractedText.length < MIN_EXTRACTED_TEXT_LENGTH) {
        throw new Error('Could not read enough text from the DOCX file');
      }
      return extractedText;
    }

    if (extension === '.doc' || mimeType === 'application/msword') {
      throw new Error('DOC files are not supported by the current parser');
    }

    if (extension === '.txt' || mimeType === 'text/plain') {
      const extractedText = normalizeText(fs.readFileSync(file.path, 'utf8'));
      if (!extractedText) {
        throw new Error('No text could be extracted from the text file');
      }
      return extractedText;
    }

    throw new Error('Unsupported file type');
  } catch (error) {
    if (error?.message?.includes('No text could be extracted') || error?.message?.includes('Could not read enough text') || error?.message?.includes('corrupted or unreadable') || error?.message?.includes('Unsupported file type') || error?.message?.includes('current parser')) {
      throw error;
    }

    if (extension === '.pdf' || mimeType === 'application/pdf') {
      throw new Error('Could not read the PDF document');
    }

    throw new Error('Failed to parse the uploaded document');
  }
};
