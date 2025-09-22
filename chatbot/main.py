import ingest
import rag

if __name__ == "__main__":
    print("🔹 Starting ingestion...")
    ingest.ingest_data()
    print("✅ Ingestion complete!\n")

    print("🔹 You can now query the RAG system!")

    while True:
        question = input("Enter your question (or type 'exit' to quit): ").strip()

        if question.lower() == "exit":
            print("👋 Goodbye!")
            break

        if not question:
            continue  # skip empty input

        answer = rag.query_rag(question)   # ✅ since query_rag is inside rag.py
        print(f"\n💡 Answer:\n{answer}\n")
