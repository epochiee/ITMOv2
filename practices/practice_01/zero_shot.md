PR Review Findings

Findings (ordered by severity)

Critical
- app/api.py:create_review - No input validation. The endpoint accepts a plain dict and accesses payload["diff"] directly. Missing or wrong JSON keys cause a KeyError and 500 instead of a 422 validation error. Define a request model with required fields so FastAPI validates input.
- app/api.py:create_review - No authentication or authorization. If this service should not be public, this exposes the LLM to arbitrary use and abuse.
- app/api.py and app/review_service.py - No limits or guards on input size. A very large diff could cause DoS or overwhelm the LLM.

High
- app/api.py:create_review - No declared response or request models. Returning and accepting bare dicts weakens the OpenAPI schema and client compatibility. Use Pydantic models so docs and types are explicit.
- app/api.py:create_review - No error handling around review_service.review. LLM or network errors will surface as 500s with no structured error body. Map expected failures to appropriate HTTP errors with clear messages.
- app/review_service.py:ReviewService.review - Unbounded prompt construction. Large diffs may exceed model context limits, causing failures or truncation without any retry or chunking strategy.

Medium
- app/api.py:create_review - Synchronous endpoint likely performs a blocking LLM call. Consider an async interface or explicit background execution to avoid saturating the worker pool.
- app/api.py - Global import of review_service from app.dependencies instead of FastAPI dependency injection (Depends). This makes testing harder and reduces configurability.
- app/review_service.py - The contract returns a raw dict. Use a small dataclass or Pydantic model to make the service boundary clearer and easier to evolve.
- app/review_service.py:LLM Protocol - If runtime checks are needed, add @runtime_checkable; otherwise note the limitation.

Low
- app/review_service.py - Prompt could benefit from delimiters or structure (for example, triple backticks around the diff) to reduce prompt injection and formatting issues.
- app/api.py and typing - Using built-in generics like dict[str, str] requires Python 3.9+. Ensure the runtime matches.
- Styling-only change in LLM Protocol method formatting - non-functional.

Missing tests
- Request validation for missing or empty diff should return 422.
- Success path should return {"comment": "..."} with a mocked LLM.
- Error path should map LLM failure to a controlled HTTP error with a clear message.
- Large input handling behavior should either reject with 413 or perform chunking.

Open questions
- Is this endpoint intended to be public or should it require authentication.
- What are acceptable maximum diff sizes and timeouts for review.
- What Python version and runtime constraints are targeted.
- Is the LLM client thread-safe and what are its latency and throughput characteristics.

Change summary (suggested)
1. Define Pydantic models for request and response.
2. Use FastAPI dependency injection for ReviewService and its LLM instead of a global import.
3. Add validation and limits for non-empty diff and maximum length with appropriate status codes.
4. Wrap the LLM call with error handling and map failures to HTTP errors with structured responses.
5. Consider making the endpoint async or running blocking work in a background task with capacity controls.
6. Add tests covering validation, happy path, error paths, and large input behavior.
7. Add basic auth or token-based protection if required.
