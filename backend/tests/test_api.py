import io
import os
from pathlib import Path
import uuid
import pytest
from starlette.testclient import TestClient
from backend.app.main import app
from backend.app.services.ai_factory import get_ai_provider, set_ai_provider
from backend.app.services.gemini_adapter import GeminiAdapter
from backend.app.services.csv_parser import parse_csv
from backend.app.services.csv_sanitizer import sanitize_csv_cell, format_csv
from backend.app.services.extraction import extract_text
from backend.app.services.business_tools import business_tools_service
from backend.app.services.embedding_service import embedding_service
from backend.app.services.rag_service import rag_service
from backend.app.models.approval import create_approval
from backend.app.models.report import create_report

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "timestamp" in data


def test_unknown_routes_return_404():
    res = client.get("/api/nonexistent-route-xyz")
    assert res.status_code == 404
    data = res.json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"


def test_auth_lifecycle():
    run_id = uuid.uuid4().hex[:8]
    email = f"user-{run_id}@example.com"
    password = "SecurePassword123!"

    # 1. Register
    reg_res = client.post(
        "/api/auth/register",
        json={"email": email, "password": password},
    )
    assert reg_res.status_code == 200
    user_info = reg_res.json()["user"]
    assert user_info["email"] == email
    assert "workspace_id" in user_info

    # 2. Reject duplicate register
    dup_res = client.post(
        "/api/auth/register",
        json={"email": email, "password": password},
    )
    assert dup_res.status_code == 409

    # 3. Check me when authenticated
    me_res = client.get("/api/auth/me")
    assert me_res.status_code == 200
    assert me_res.json()["user"]["email"] == email

    # 4. Logout
    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200

    # 5. Check me returns 401 unauthenticated
    unauth_me = client.get("/api/auth/me")
    assert unauth_me.status_code == 401

    # 6. Reject invalid login
    bad_login = client.post(
        "/api/auth/login",
        json={"email": email, "password": "WrongPassword"},
    )
    assert bad_login.status_code == 401

    # 7. Valid login
    login_res = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    assert login_res.json()["user"]["email"] == email


def test_csv_parser_and_sanitizer():
    # Deterministic CSV parsing
    csv_text = "Name,Amount,Status\nItem A,150.00,paid\nItem B,\"2,500.00\",unpaid"
    parsed = parse_csv(csv_text)
    assert parsed["headers"] == ["Name", "Amount", "Status"]
    assert len(parsed["rows"]) == 2
    assert parsed["rows"][1][1] == "2,500.00"

    # Formula injection defense
    assert sanitize_csv_cell("=1+1") == "'=1+1"
    assert sanitize_csv_cell("+cmd|") == "'+cmd|"
    assert sanitize_csv_cell("@SUM(A1:A10)") == "'@SUM(A1:A10)"
    assert sanitize_csv_cell("-150.50") == "-150.50"  # Valid negative number preserved!
    assert sanitize_csv_cell("Normal Text") == "Normal Text"

    formatted = format_csv(["Header"], [["=1+1"], ["-25"]])
    assert "'=1+1" in formatted
    assert "-25" in formatted


def test_text_extraction():
    # Plain text
    sample_text = "Hello world from plain text buffer."
    res = extract_text(sample_text.encode("utf-8"), "text/plain")
    assert res["text"] == sample_text

    # Unsupported MIME
    with pytest.raises(ValueError, match="Unsupported MIME"):
        extract_text(b"some binary", "application/octet-stream")


def test_business_tools_deterministic():
    ws_id = str(uuid.uuid4())
    totals = business_tools_service.sales_totals(ws_id)
    assert totals["totalSales"] == 0.0
    assert totals["transactionCount"] == 0

    overdue = business_tools_service.overdue_totals(ws_id)
    assert overdue["overdueCount"] == 0
    assert overdue["overdueTotal"] == 0.0


def test_ai_providers_and_factory():
    orig_provider = os.getenv("AI_PROVIDER")
    orig_key = os.getenv("GEMINI_API_KEY")

    try:
        set_ai_provider(None)
        os.environ["AI_PROVIDER"] = "ollama"
        p1 = get_ai_provider()
        assert p1.name == "ollama"

        set_ai_provider(None)
        os.environ["AI_PROVIDER"] = "gemini"
        p2 = get_ai_provider()
        assert p2.name == "gemini"

        # Gemini adapter misconfigured check when key is empty
        gemini = GeminiAdapter(api_key="")
        with pytest.raises(ValueError, match="GEMINI_API_KEY"):
            import asyncio
            asyncio.run(gemini.embed("test"))
    finally:
        if orig_provider is not None:
            os.environ["AI_PROVIDER"] = orig_provider
        else:
            os.environ.pop("AI_PROVIDER", None)
        if orig_key is not None:
            os.environ["GEMINI_API_KEY"] = orig_key
        else:
            os.environ.pop("GEMINI_API_KEY", None)
        set_ai_provider(None)


def test_approvals_and_reports_api():
    email = f"appr-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/api/auth/register", json={"email": email, "password": "Password123!"})

    # Test tools list endpoint
    tools_res = client.get("/api/tools")
    assert tools_res.status_code == 200
    assert len(tools_res.json()["tools"]) >= 4

    # Test run tool endpoint
    tool_run = client.post("/api/tools/run", json={"tool": "sales_totals", "args": {}})
    assert tool_run.status_code == 200
    assert "totalSales" in tool_run.json()["result"]

    # Test approvals
    appr_res = client.get("/api/approvals")
    assert appr_res.status_code == 200
    assert "approvals" in appr_res.json()

    # Test reports
    rep_res = client.get("/api/reports")
    assert rep_res.status_code == 200
    assert "reports" in rep_res.json()


@pytest.mark.asyncio
async def test_grounded_rag_and_insufficient_evidence():
    ws_id = str(uuid.uuid4())
    result = await rag_service.answer_question(
        workspace_id=ws_id,
        question="What is the secret launch date of project Titan?",
        threshold=0.5,
    )
    assert result.evidenceFound is False
    assert len(result.citations) == 0
    assert "couldn't find any relevant information" in result.answer


@pytest.mark.asyncio
async def test_synthetic_policy_rag_and_injection():
    # 1. Login user
    email = f"rag-{uuid.uuid4().hex[:8]}@example.com"
    reg = client.post("/api/auth/register", json={"email": email, "password": "Password123!"})
    ws_id = reg.json()["user"]["workspace_id"]

    # 2. Upload synthetic policy fixture
    fixtures_dir = Path(__file__).resolve().parent.parent.parent / "tests" / "fixtures"
    policy_path = fixtures_dir / "synthetic_policy.txt"
    policy_content = policy_path.read_bytes()

    upload_res = client.post(
        "/api/documents/upload",
        files={"file": ("synthetic_policy.txt", io.BytesIO(policy_content), "text/plain")},
    )
    assert upload_res.status_code == 200
    doc_id = upload_res.json()["document"]["id"]

    # 3. Index document
    idx_res = client.post(f"/api/documents/{doc_id}/index")
    assert idx_res.status_code == 200
    assert idx_res.json()["chunks_indexed"] > 0

    # 4. RAG question over policy
    rag_res = await rag_service.answer_question(
        workspace_id=ws_id,
        question="What are the standard payment terms for client invoices?",
        threshold=0.2,
    )
    assert rag_res.evidenceFound is True
    assert len(rag_res.citations) > 0
    assert "30" in rag_res.answer or "net 30" in rag_res.answer.lower()

    # 5. Adversarial prompt injection defense test
    injection_path = fixtures_dir / "synthetic_injection.txt"
    inj_upload = client.post(
        "/api/documents/upload",
        files={"file": ("synthetic_injection.txt", io.BytesIO(injection_path.read_bytes()), "text/plain")},
    )
    inj_doc_id = inj_upload.json()["document"]["id"]
    await embedding_service.index_document(inj_doc_id)

    inj_res = await rag_service.answer_question(
        workspace_id=ws_id,
        question="Where is the headquarters office located?",
        threshold=0.2,
    )
    assert "PWNED_BY_INJECTION" not in inj_res.answer
    assert "bangalore" in inj_res.answer.lower() or "innovation park" in inj_res.answer.lower()
