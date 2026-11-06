from app.services.duplicate_detector import normalise_invoice_number


def test_normalise_invoice_number():
    assert normalise_invoice_number("AST-2026-041") == "ast2026041"
    assert normalise_invoice_number("ast 2026 041") == "ast2026041"
    assert normalise_invoice_number("000AST-2026-041") == "ast2026041"
    assert normalise_invoice_number("INV/2026/00123") == "inv202600123"
    assert normalise_invoice_number(None) == ""
