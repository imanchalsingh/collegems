import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { handleAnalyzeResume } from '../controllers/resume.controller.js';

const createMockResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const createTempFile = (name, content) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-test-'));
  const filePath = path.join(tempDir, name);
  fs.writeFileSync(filePath, content);
  return { tempDir, filePath };
};

test('handleAnalyzeResume extracts text from a supported resume file', async () => {
  const { tempDir, filePath } = createTempFile('resume.txt', 'John Doe\nSenior Software Engineer');
  const req = {
    file: {
      path: filePath,
      originalname: 'resume.txt',
      mimetype: 'text/plain',
      size: fs.statSync(filePath).size,
    },
  };
  const res = createMockResponse();

  await handleAnalyzeResume(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);
  assert.match(res.body.data.text, /John Doe/);

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('handleAnalyzeResume rejects missing files with a useful error', async () => {
  const req = {};
  const res = createMockResponse();

  await handleAnalyzeResume(req, res);

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.code, 'FILE_REQUIRED');
  assert.match(res.body.error, /required/i);
});

test('handleAnalyzeResume rejects unsupported file types', async () => {
  const { tempDir, filePath } = createTempFile('resume.exe', 'not a real resume');
  const req = {
    file: {
      path: filePath,
      originalname: 'resume.exe',
      mimetype: 'application/x-msdownload',
      size: fs.statSync(filePath).size,
    },
  };
  const res = createMockResponse();

  await handleAnalyzeResume(req, res);

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.code, 'INVALID_FILE');
  assert.match(res.body.error, /Invalid file type|unsupported/i);

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('handleAnalyzeResume rejects unreadable or invalid documents', async () => {
  const { tempDir, filePath } = createTempFile('resume.pdf', 'not a real pdf');
  const req = {
    file: {
      path: filePath,
      originalname: 'resume.pdf',
      mimetype: 'application/pdf',
      size: fs.statSync(filePath).size,
    },
  };
  const res = createMockResponse();

  await handleAnalyzeResume(req, res);

  assert.strictEqual(res.statusCode, 422);
  assert.strictEqual(res.body.code, 'PARSE_ERROR');
  assert.match(res.body.error, /Could not read|No text could be extracted|read/i);

  fs.rmSync(tempDir, { recursive: true, force: true });
});
