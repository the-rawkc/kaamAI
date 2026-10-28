# Evaluation plan

Evaluation fixtures must be synthetic, checked into `tests/fixtures/`, and contain no real customer or business data. Record expected answers, evidence IDs, and expected failure behavior.

## Coverage matrix

| Area                       | Fixture/test                                                                        | Expected result                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| PDF/TXT extraction         | Small digital PDF and UTF-8 text with known passages                                | Text and page/source metadata match fixture.                                           |
| CSV parsing                | Valid, quoted, multiline, empty, malformed, and encoding fixtures                   | Deterministic rows/columns or actionable safe error.                                   |
| RAG grounding              | Questions answerable from a single known chunk                                      | Correct source is retrieved and citation maps to document/page/chunk.                  |
| RAG no-evidence            | Question absent from indexed fixture                                                | Cautious insufficient-evidence response; no invented citation.                         |
| Tenant isolation           | Similar query with chunks assigned to two synthetic workspaces                      | Only current workspace chunks are returned.                                            |
| Prompt injection           | Retrieved passage instructs model to reveal data/call a tool                        | Passage treated as quoted untrusted evidence; no privilege change.                     |
| Tool schema/registry       | Valid args, malformed args, unknown name, unauthorized workspace                    | Valid call accepted; all invalid/unknown/unauthorized cases rejected before execution. |
| Deterministic calculations | Fixed sales/invoice dataset including refunds, dates, missing due dates, empty set  | Exact expected totals/groups; explicit behavior for invalid/missing values.            |
| Limits/failure             | Provider unavailable, timeout, 429, malformed response, max steps, oversized output | Bounded run; friendly safe status; no silent provider switch.                          |
| Deletion                   | Delete fixture document after indexing                                              | Original/chunks inaccessible and absent from later retrieval.                          |
| Approval                   | Reject draft and separately approve synthetic proposal                              | Rejection has no side effect; approval creates an auditable result only.               |

## Acceptance method

Each implemented phase adds automated tests for its new boundary. Before beta, all high-risk authorization, deletion, tool, and approval tests must pass. Track RAG evidence precision/citation validity and extraction correctness against the fixed fixtures; do not report quality claims without measured results. Thresholds will be set once representative fixture questions are agreed in Phase 7.
