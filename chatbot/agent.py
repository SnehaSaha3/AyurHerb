from typing import Any

from context import build_farmer_context
from llm import decide


class AyurMateAgent:

    name = "AyurMate"

    def run(
        self,
        farmer: dict[str, Any],
        question: str,
    ) -> dict[str, Any]:

        farmer_context = build_farmer_context(
            farmer
        )

        decision = decide(
            farmer_context=farmer_context,
            question=question,
        )

        return {
            "agent": self.name,
            "decision": decision,
        }