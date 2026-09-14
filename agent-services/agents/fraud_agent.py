import os
import json
from groq import Groq
from schemas import FraudCheckRequest, FraudCheckResponse, FraudSignal

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

"""
This is a real reasoning agent, not a scoring formula. It's handed the
full case — order details, both parties' track records, upstream check
results — and it decides what matters and how much, in its own words,
every time. Nothing here is a fixed weight you set in advance; the
model's judgment IS the risk assessment. That's what makes it
autonomous rather than a lookup table dressed up as one.

What's still deterministic on purpose: the INPUT data (real Mongo
numbers, not invented) and the OUTPUT contract (strict JSON matching
FraudCheckResponse, so Node/admin dashboard can render it reliably).
The reasoning in between is genuinely the model's.

Safety net: if the model ever returns something that doesn't parse,
we do NOT silently auto-approve. Parse failure defaults to "send to
admin" — the one failure mode that's always safe.
"""

SYSTEM_PROMPT = """You are AyurHerb's autonomous fraud & risk review agent for a \
B2B agricultural marketplace connecting Indian herb farmers with buyer companies.

You are given real order, company, and farmer data. Analyze it yourself — \
decide which factors matter most for THIS specific case and why. Do not \
apply a fixed checklist; reason about the actual situation (e.g. a brand \
new company placing a very large first order is a different risk shape \
than an established company with one old, resolved dispute).

Respond with ONLY valid JSON, no markdown fences, no commentary outside \
the JSON, matching exactly this shape:

{
  "riskScore": <float 0.0-1.0, your overall judgment>,
  "requiresAdminReview": <bool, true if riskScore >= 0.35>,
  "autoHold": <bool, true if riskScore >= 0.70>,
  "signals": [
    {"name": <short signal name>, "value": <float 0.0-1.0>, "weight": <float, your own assessment of importance 0.0-1.0>, "note": <one-line reasoning for this signal>}
  ],
  "reason": <2-3 sentence overall rationale, written for a human admin to read>
}

Include every signal you actually considered — you decide how many and which. \
Never invent data not given to you. If evidence is thin, say so in "reason" \
rather than guessing."""


def _build_case_context(req: FraudCheckRequest) -> str:
    return f"""
Order ID: {req.orderId}
Order amount: INR {req.orderAmount:,.2f}
Upstream checks: company GST verification passed = {req.companyVerificationPassed}, stock check passed = {req.stockCheckPassed}

Company track record:
- Past completed orders: {req.companyPastOrderCount}
- Past disputes raised against them: {req.companyDisputeCount}

Farmer track record:
- Past completed orders: {req.farmerPastOrderCount}
- Past disputes raised against them: {req.farmerDisputeCount}
""".strip()


def _safe_fallback(reason: str) -> FraudCheckResponse:
    """The one guaranteed-safe outcome: always routes to a human."""
    return FraudCheckResponse(
        riskScore=0.5,
        requiresAdminReview=True,
        autoHold=False,
        signals=[
            FraudSignal(
                name="agent_parse_failure",
                value=0.5,
                weight=1.0,
                note="AI agent response could not be parsed — defaulting to manual review",
            )
        ],
        reason=reason,
    )


def check_fraud_risk(req: FraudCheckRequest) -> FraudCheckResponse:
    context = _build_case_context(req)

    try:
        completion = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Assess this order:\n\n{context}"},
            ],
            temperature=0.3,
            max_tokens=700,
            response_format={"type": "json_object"},
        )
        raw = completion.choices[0].message.content or ""
        parsed = json.loads(raw)
        parsed["riskScore"] = max(0.0, min(1.0, parsed["riskScore"]))
        parsed["requiresAdminReview"] = parsed["riskScore"] >= 0.35
        parsed["autoHold"] = parsed["riskScore"] >= 0.70
        return FraudCheckResponse(**parsed)

    except json.JSONDecodeError:
        return _safe_fallback("AI agent returned non-JSON output — routed to manual review as a precaution.")
    except Exception as e:  # noqa: BLE001 — deliberately broad: any agent failure must fail safe
        return _safe_fallback(f"AI agent call failed ({type(e).__name__}) — routed to manual review as a precaution.")