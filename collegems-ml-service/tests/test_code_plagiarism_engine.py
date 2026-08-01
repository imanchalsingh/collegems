from services.code_plagiarism_engine import (
    analyze_submissions,
    compare_pair,
    extract_structural_tokens,
    jaccard_similarity,
    winnow_fingerprints,
)


def test_python_ast_normalizes_identifiers():
    a = "def add(x, y):\n    return x + y\n"
    b = "def sum_values(a, b):\n    return a + b\n"
    tokens_a = extract_structural_tokens(a, "python")
    tokens_b = extract_structural_tokens(b, "python")
    assert "ID" in tokens_a
    assert tokens_a == tokens_b


def test_winnowing_jaccard_detects_renamed_copy():
    left = {
        "id": "s1",
        "label": "Alice",
        "language": "python",
        "code": """
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

def main():
    print(factorial(5))
""",
    }
    right = {
        "id": "s2",
        "label": "Bob",
        "language": "python",
        "code": """
def fact(num):
    if num <= 1:
        return 1
    return num * fact(num - 1)

def run():
    print(fact(5))
""",
    }
    pair = compare_pair(left, right)
    assert pair["similarity"] > 0.5


def test_unrelated_code_has_low_similarity():
    left = {
        "id": "s1",
        "label": "A",
        "language": "javascript",
        "code": "function hello(){ return 'hi'; }",
    }
    right = {
        "id": "s2",
        "label": "B",
        "language": "javascript",
        "code": "const nums = [1,2,3]; const sum = nums.reduce((a,b)=>a+b,0);",
    }
    pair = compare_pair(left, right)
    assert pair["similarity"] < 0.4


def test_analyze_matrix_shape():
    subs = [
        {"id": "1", "label": "A", "language": "python", "code": "print(1)\n"},
        {"id": "2", "label": "B", "language": "python", "code": "print(1)\n"},
        {"id": "3", "label": "C", "language": "python", "code": "x = 2\n"},
    ]
    result = analyze_submissions(subs, threshold=0.2)
    assert len(result["matrix"]) == 3
    assert len(result["matrix"][0]) == 3
    assert result["matrix"][0][0] == 1.0
    assert result["pairs"]
