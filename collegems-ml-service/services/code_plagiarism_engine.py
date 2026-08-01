"""
AST / structural code plagiarism engine.

Parses source into normalized structural tokens (identifiers collapsed),
builds Winnowing fingerprints, and scores pairwise Jaccard similarity.
Supports Python (stdlib ast), JavaScript, C++, and Java via token streams.
"""

from __future__ import annotations

import ast
import hashlib
import re
from collections import defaultdict
from dataclasses import dataclass
from typing import Any


SUPPORTED_LANGUAGES = {"python", "javascript", "js", "typescript", "ts", "cpp", "c++", "c", "java"}

# Language keyword sets used to keep structure while stripping identifiers
_JS_KEYWORDS = {
    "abstract", "arguments", "await", "boolean", "break", "byte", "case", "catch",
    "char", "class", "const", "continue", "debugger", "default", "delete", "do",
    "double", "else", "enum", "eval", "export", "extends", "false", "final",
    "finally", "float", "for", "function", "goto", "if", "implements", "import",
    "in", "instanceof", "int", "interface", "let", "long", "native", "new",
    "null", "package", "private", "protected", "public", "return", "short",
    "static", "super", "switch", "synchronized", "this", "throw", "throws",
    "transient", "true", "try", "typeof", "var", "void", "volatile", "while",
    "with", "yield", "async", "of", "from", "as", "type", "interface",
}

_CPP_KEYWORDS = {
    "alignas", "alignof", "and", "and_eq", "asm", "auto", "bitand", "bitor",
    "bool", "break", "case", "catch", "char", "char16_t", "char32_t", "class",
    "compl", "const", "constexpr", "const_cast", "continue", "decltype",
    "default", "delete", "do", "double", "dynamic_cast", "else", "enum",
    "explicit", "export", "extern", "false", "float", "for", "friend", "goto",
    "if", "inline", "int", "long", "mutable", "namespace", "new", "noexcept",
    "not", "not_eq", "nullptr", "operator", "or", "or_eq", "private",
    "protected", "public", "register", "reinterpret_cast", "return", "short",
    "signed", "sizeof", "static", "static_assert", "static_cast", "struct",
    "switch", "template", "this", "thread_local", "throw", "true", "try",
    "typedef", "typeid", "typename", "union", "unsigned", "using", "virtual",
    "void", "volatile", "wchar_t", "while", "xor", "xor_eq", "include",
    "define", "ifdef", "ifndef", "endif", "pragma",
}

_JAVA_KEYWORDS = {
    "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char",
    "class", "const", "continue", "default", "do", "double", "else", "enum",
    "extends", "final", "finally", "float", "for", "goto", "if", "implements",
    "import", "instanceof", "int", "interface", "long", "native", "new",
    "package", "private", "protected", "public", "return", "short", "static",
    "strictfp", "super", "switch", "synchronized", "this", "throw", "throws",
    "transient", "try", "void", "volatile", "while", "true", "false", "null",
    "var", "record", "sealed", "permits", "yield",
}


@dataclass
class SubmissionInput:
    id: str
    label: str
    code: str
    language: str = "python"


def normalize_language(language: str | None) -> str:
    lang = (language or "python").strip().lower()
    aliases = {
        "py": "python",
        "js": "javascript",
        "jsx": "javascript",
        "ts": "javascript",
        "tsx": "javascript",
        "typescript": "javascript",
        "c++": "cpp",
        "cxx": "cpp",
        "cc": "cpp",
        "c": "cpp",
        "hpp": "cpp",
        "h": "cpp",
    }
    return aliases.get(lang, lang)


def detect_language_from_filename(filename: str | None) -> str:
    if not filename:
        return "python"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    mapping = {
        "py": "python",
        "js": "javascript",
        "jsx": "javascript",
        "ts": "javascript",
        "tsx": "javascript",
        "java": "java",
        "cpp": "cpp",
        "cc": "cpp",
        "cxx": "cpp",
        "c": "cpp",
        "h": "cpp",
        "hpp": "cpp",
    }
    return mapping.get(ext, "python")


def _strip_comments_and_strings(code: str, language: str) -> str:
    """Best-effort removal of comments/strings before tokenization."""
    if language == "python":
        # Keep structure; AST path handles Python more carefully
        code = re.sub(r"#.*?$", "", code, flags=re.MULTILINE)
        code = re.sub(r'("""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\')', '""', code)
        code = re.sub(r'("([^"\\]|\\.)*"|\'([^\'\\]|\\.)*\')', '""', code)
        return code

    # C-family / JS
    code = re.sub(r"/\*[\s\S]*?\*/", " ", code)
    code = re.sub(r"//.*?$", "", code, flags=re.MULTILINE)
    code = re.sub(r'("([^"\\]|\\.)*"|\'([^\'\\]|\\.)*\'|`([^`\\]|\\.)*`)', '""', code)
    return code


class _PythonAstNormalizer(ast.NodeVisitor):
    """Walk AST and emit structural tokens with identifiers anonymized."""

    def __init__(self) -> None:
        self.tokens: list[str] = []

    def generic_visit(self, node: ast.AST) -> None:
        self.tokens.append(type(node).__name__)
        if isinstance(node, ast.Name):
            self.tokens.append("ID")
        elif isinstance(node, ast.arg):
            self.tokens.append("ID")
        elif isinstance(node, ast.Attribute):
            self.tokens.append("ATTR")
        elif isinstance(node, ast.Constant):
            self.tokens.append("LIT")
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            self.tokens.append("DECL")
        super().generic_visit(node)


def python_ast_tokens(code: str) -> list[str]:
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return generic_tokens(code, "python")
    visitor = _PythonAstNormalizer()
    visitor.visit(tree)
    return visitor.tokens or generic_tokens(code, "python")


def generic_tokens(code: str, language: str) -> list[str]:
    cleaned = _strip_comments_and_strings(code, language)
    # Keep keywords + operators; collapse identifiers/numbers
    pattern = re.compile(r"[A-Za-z_][A-Za-z0-9_]*|\d+\.?\d*|[^\s\w]")
    keywords = {
        "python": set(dir(__builtins__)) | {
            "def", "class", "return", "if", "elif", "else", "for", "while",
            "try", "except", "finally", "with", "as", "import", "from", "pass",
            "break", "continue", "yield", "lambda", "True", "False", "None",
            "and", "or", "not", "in", "is", "global", "nonlocal", "assert",
            "raise", "async", "await",
        },
        "javascript": _JS_KEYWORDS,
        "cpp": _CPP_KEYWORDS,
        "java": _JAVA_KEYWORDS,
    }.get(language, _JS_KEYWORDS)

    tokens: list[str] = []
    for match in pattern.finditer(cleaned):
        tok = match.group(0)
        if tok.isidentifier() or (tok[:1].isalpha() or tok[:1] == "_"):
            if tok in keywords:
                tokens.append(tok.upper())
            else:
                tokens.append("ID")
        elif tok[0].isdigit():
            tokens.append("NUM")
        else:
            tokens.append(tok)
    return tokens


def extract_structural_tokens(code: str, language: str) -> list[str]:
    language = normalize_language(language)
    if language == "python":
        return python_ast_tokens(code)
    if language in {"javascript", "cpp", "java"}:
        return generic_tokens(code, language)
    return generic_tokens(code, "javascript")


def _hash_kgram(kgram: tuple[str, ...]) -> int:
    digest = hashlib.sha1("\0".join(kgram).encode("utf-8")).hexdigest()
    return int(digest[:16], 16)


def winnow_fingerprints(tokens: list[str], k: int = 5, window: int = 4) -> set[int]:
    """
    Winnowing (Schleimer et al.): hash k-grams, then take the minimum hash
    in each window of size `window` (rightmost on ties).
    """
    if len(tokens) < k:
        if not tokens:
            return set()
        return {_hash_kgram(tuple(tokens))}

    hashes = [_hash_kgram(tuple(tokens[i : i + k])) for i in range(len(tokens) - k + 1)]
    if len(hashes) <= window:
        return {min(hashes)}

    fingerprints: set[int] = set()
    for i in range(len(hashes) - window + 1):
        window_hashes = hashes[i : i + window]
        # rightmost minimum
        min_val = window_hashes[0]
        min_idx = 0
        for j, h in enumerate(window_hashes):
            if h <= min_val:
                min_val = h
                min_idx = j
        fingerprints.add(window_hashes[min_idx])
    return fingerprints


def jaccard_similarity(a: set[int], b: set[int]) -> float:
    if not a and not b:
        return 0.0
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


def find_matched_blocks(
    tokens_a: list[str],
    tokens_b: list[str],
    code_a: str,
    code_b: str,
    min_run: int = 8,
) -> list[dict[str, Any]]:
    """Greedy common-token runs mapped back to approximate line ranges."""
    if not tokens_a or not tokens_b:
        return []

    # Index positions of tokens in B for quick lookup of shared structural runs
    index_b: dict[str, list[int]] = defaultdict(list)
    for i, tok in enumerate(tokens_b):
        index_b[tok].append(i)

    used_a: set[int] = set()
    used_b: set[int] = set()
    matches: list[dict[str, Any]] = []

    i = 0
    while i < len(tokens_a):
        if i in used_a:
            i += 1
            continue
        best_len = 0
        best_j = -1
        for j in index_b.get(tokens_a[i], []):
            if j in used_b:
                continue
            length = 0
            while (
                i + length < len(tokens_a)
                and j + length < len(tokens_b)
                and (i + length) not in used_a
                and (j + length) not in used_b
                and tokens_a[i + length] == tokens_b[j + length]
            ):
                length += 1
            if length > best_len:
                best_len = length
                best_j = j
        if best_len >= min_run and best_j >= 0:
            for t in range(best_len):
                used_a.add(i + t)
                used_b.add(best_j + t)
            span_a = _token_span_to_lines(code_a, tokens_a, i, best_len)
            span_b = _token_span_to_lines(code_b, tokens_b, best_j, best_len)
            matches.append(
                {
                    "length": best_len,
                    "left": span_a,
                    "right": span_b,
                }
            )
            i += best_len
        else:
            i += 1

    matches.sort(key=lambda m: m["length"], reverse=True)
    return matches[:20]


def _token_span_to_lines(code: str, tokens: list[str], start: int, length: int) -> dict[str, Any]:
    """Approximate line mapping using proportional token positions."""
    lines = code.splitlines() or [code]
    n = max(len(tokens), 1)
    start_line = int((start / n) * len(lines)) + 1
    end_line = int(((start + length) / n) * len(lines)) + 1
    start_line = max(1, min(start_line, len(lines)))
    end_line = max(start_line, min(end_line, len(lines)))
    excerpt = "\n".join(lines[start_line - 1 : end_line])
    return {
        "startLine": start_line,
        "endLine": end_line,
        "excerpt": excerpt[:800],
    }


def analyze_submissions(
    submissions: list[dict[str, Any]],
    *,
    k: int = 5,
    window: int = 4,
    threshold: float = 0.35,
) -> dict[str, Any]:
    """
    Build fingerprints for each submission and compute pairwise similarity.
    """
    prepared = []
    for raw in submissions:
        sid = str(raw.get("id") or raw.get("studentId") or "")
        label = str(raw.get("label") or raw.get("studentName") or sid or "submission")
        code = str(raw.get("code") or raw.get("source") or "")
        language = normalize_language(
            raw.get("language") or detect_language_from_filename(raw.get("filename"))
        )
        tokens = extract_structural_tokens(code, language)
        fps = winnow_fingerprints(tokens, k=k, window=window)
        prepared.append(
            {
                "id": sid,
                "label": label,
                "language": language,
                "code": code,
                "tokens": tokens,
                "fingerprints": fps,
                "tokenCount": len(tokens),
                "fingerprintCount": len(fps),
            }
        )

    ids = [p["id"] for p in prepared]
    labels = {p["id"]: p["label"] for p in prepared}
    matrix: list[list[float]] = [[0.0 for _ in prepared] for _ in prepared]
    pairs: list[dict[str, Any]] = []

    for i, a in enumerate(prepared):
        matrix[i][i] = 1.0
        for j in range(i + 1, len(prepared)):
            b = prepared[j]
            score = jaccard_similarity(a["fingerprints"], b["fingerprints"])
            matrix[i][j] = round(score, 4)
            matrix[j][i] = round(score, 4)
            matched_blocks = find_matched_blocks(
                a["tokens"], b["tokens"], a["code"], b["code"]
            )
            pairs.append(
                {
                    "leftId": a["id"],
                    "rightId": b["id"],
                    "leftLabel": a["label"],
                    "rightLabel": b["label"],
                    "similarity": round(score, 4),
                    "similarityPercent": round(score * 100, 1),
                    "flagged": score >= threshold,
                    "matchedBlocks": matched_blocks,
                    "leftCode": a["code"],
                    "rightCode": b["code"],
                    "leftLanguage": a["language"],
                    "rightLanguage": b["language"],
                }
            )

    pairs.sort(key=lambda p: p["similarity"], reverse=True)

    return {
        "engine": "ast-winnowing",
        "k": k,
        "window": window,
        "threshold": threshold,
        "submissionIds": ids,
        "labels": labels,
        "matrix": matrix,
        "pairs": pairs,
        "flaggedPairs": [p for p in pairs if p["flagged"]],
        "meta": [
            {
                "id": p["id"],
                "label": p["label"],
                "language": p["language"],
                "tokenCount": p["tokenCount"],
                "fingerprintCount": p["fingerprintCount"],
            }
            for p in prepared
        ],
    }


def compare_pair(
    left: dict[str, Any],
    right: dict[str, Any],
    *,
    k: int = 5,
    window: int = 4,
) -> dict[str, Any]:
    result = analyze_submissions([left, right], k=k, window=window, threshold=0.0)
    if not result["pairs"]:
        return {
            "similarity": 0.0,
            "similarityPercent": 0.0,
            "matchedBlocks": [],
            "leftCode": left.get("code", ""),
            "rightCode": right.get("code", ""),
        }
    pair = result["pairs"][0]
    return pair
