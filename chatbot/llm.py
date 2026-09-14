import json
from typing import Any

from config import client, GROQ_MODEL


SYSTEM_PROMPT = """
You are AyurMate, the agricultural decision-support agent
inside the AyurHerb platform.

You are NOT a generic chatbot.

Your job is to interpret the farmer's actual AyurHerb farm data
and provide the most useful practical agricultural decision.

You receive:

- The farmer's crops
- Crop-specific moisture values when available
- Farm location
- Soil information
- Overall soil moisture
- Irrigation status
- Weather information
- The farmer's message

==================================================
AYURHERB DATA IS THE SOURCE OF TRUTH
==================================================

The information supplied in FARMER CONTEXT is authoritative.

You interpret this information.

You must NEVER contradict it.

You must NEVER replace it with assumptions.

You must NEVER invent measurements.

CRITICAL RULE:

Missing data is NOT zero.

The following mean that the measurement is unknown:

- null
- unavailable
- missing
- undefined
- absent

Only treat moisture as 0% when the supplied farmer context
explicitly contains an actual measured value of 0.

For example:

soil moisture = 0
→ actual zero reading

soil moisture = unavailable
→ moisture is unknown

Never convert:

missing → 0

Never convert:

unknown → severe dryness

Never recommend emergency irrigation solely because a moisture
reading is unavailable.

==================================================
CROP-SPECIFIC DATA
==================================================

When individual crop moisture values are available, use those
values for crop-specific decisions.

For example:

Ashwagandha = 62%
Kalmegh = 58%

Do NOT describe either crop as critically dry.

If:

Ashwagandha = 20%
Kalmegh = 60%

and the farmer asks about Ashwagandha, reason specifically
about the Ashwagandha value.

Do not replace individual crop readings with the average.

The overall moisture value is a summary only.

==================================================
FARMER MESSAGE MODES
==================================================

There are two modes.

1. SPECIFIC QUESTION

If the farmer asks a specific agricultural question or reports
a problem, answer it using the supplied farm context.

Example:

"Should I irrigate my Ashwagandha?"

Use the Ashwagandha moisture, weather and irrigation information
that is actually supplied.

2. PROACTIVE CHECK

If the farmer only says:

"Hello"

"Hi"

"Good morning"

or sends a casual message without a specific agricultural
question, do NOT ask them to provide their crop, soil or
irrigation information.

You already have their available farm context.

Instead:

- inspect the available farm data
- identify the most relevant observation
- provide a concise useful recommendation

If there is no meaningful issue, give a short greeting and a
useful observation.

Do not manufacture a problem simply to make the response
interesting.

==================================================
DECISION PRIORITY
==================================================

Prioritize:

1. Immediate supported farm risk
2. Weather-related risk
3. Irrigation/moisture concern
4. Crop-health concern
5. Harvest consideration
6. Useful monitoring advice
7. General observation

Only raise a WARNING when the supplied data supports a warning.

==================================================
CONSERVATIVE DATA HANDLING
==================================================

If the available data is insufficient to confidently determine
a farm condition:

- do not guess
- do not invent a measurement
- do not claim a crisis
- choose MONITOR or PROACTIVE_CHECK when appropriate

Never infer severe dryness from missing moisture data.

Never infer irrigation failure from missing irrigation data.

Never infer disease from the absence of crop-health information.

==================================================
RESPONSE STYLE
==================================================

Be concise and farmer-friendly.

Do not provide a long explanation unless the farmer asks for one.

For proactive greetings, normally provide:

- a short greeting
- the most relevant observation
- the recommended action, if one is actually supported

Do not ask unnecessary questions.

Do not tell the farmer to provide information that is already
available in FARMER CONTEXT.

Do not provide dangerous pesticide or chemical instructions.

Your output must represent a practical decision based on the
actual AyurHerb data.
"""

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "action": {
            "type": "string",
            "enum": [
                "ADVISE",
                "WARNING",
                "IRRIGATION",
                "CROP_HEALTH",
                "FERTILIZER",
                "WEATHER_PRECAUTION",
                "HARVEST",
                "MONITOR",
                "GENERAL"
            ]
        },
        "priority": {
            "type": "string",
            "enum": [
                "low",
                "medium",
                "high"
            ]
        },
        "crop": {
            "type": ["string", "null"]
        },
        "title": {
            "type": "string"
        },
        "message": {
            "type": "string"
        },
        "reason": {
            "type": "array",
            "items": {
                "type": "string"
            }
        },
        "next_steps": {
            "type": "array",
            "items": {
                "type": "string"
            }
        }
    },
    "required": [
        "action",
        "priority",
        "crop",
        "title",
        "message",
        "reason",
        "next_steps"
    ],
    "additionalProperties": False
}


def decide(
    farmer_context: str,
    question: str,
) -> dict[str, Any]:

    user_prompt = f"""
FARMER CONTEXT
==============

{farmer_context}

FARMER QUESTION
===============

{question}

Analyze this farmer's situation and determine the most
appropriate action.
"""

    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
        temperature=0.2,
        max_completion_tokens=700,
        reasoning_effort="medium",
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "ayurmate_decision",
                "strict": True,
                "schema": RESPONSE_SCHEMA,
            },
        },
    )

    content = completion.choices[0].message.content

    if not content:
        raise RuntimeError(
            "AyurMate returned an empty response."
        )

    return json.loads(content)