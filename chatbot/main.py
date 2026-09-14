import ingest
import chatbot.agent as agent


def main():

    print()
    print("=" * 60)
    print("🌿 AyurMate RAG")
    print("=" * 60)
    print()

    print("🔹 Starting knowledge-base ingestion...")

    ingest.ingest_data()

    print()
    print("✅ Knowledge base ready.")
    print()

    print("🔹 AyurMate interactive test")
    print("Type 'exit' to quit.")
    print()

    while True:

        question = input(
            "Farmer > "
        ).strip()

        if question.lower() == "exit":

            print(
                "👋 AyurMate session ended."
            )

            break

        if not question:

            continue

        answer = agent.query_rag(
            question
        )

        print()
        print(
            f"AyurMate > {answer}"
        )
        print()


if __name__ == "__main__":
    main()