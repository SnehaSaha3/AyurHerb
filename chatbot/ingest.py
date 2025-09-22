import os
import uuid
import json
import pandas as pd
from PyPDF2 import PdfReader
from config import collection
from embeddings import embed_text

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50):
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

def add_farming_doc(text: str, crop: str = None, region: str = None):
    chunks = chunk_text(text)
    embeddings = [embed_text(chunk) for chunk in chunks]
    safe_crop = crop if crop else ""
    safe_region = region if region else ""

    metadatas = [{"crop": safe_crop, "region": safe_region} for _ in chunks]
    ids = [str(uuid.uuid4()) for _ in chunks]
    collection.add(documents=chunks, embeddings=embeddings, metadatas=metadatas, ids=ids)

def crop_row_to_text_safe(row):
    parts = []
    if "Crop_Year" in row and "Crop" in row and "State" in row and "Season" in row:
        parts.append(f"In {row.get('Crop_Year', 'N/A')}, the crop {row.get('Crop', 'N/A')} in {row.get('State', 'N/A')} during {row.get('Season', 'N/A')}")
    if "Area" in row and "Production" in row:
        parts.append(f"was grown on {row.get('Area', 'N/A')} hectares, producing {row.get('Production', 'N/A')} units")
    if "Annual_Rainfall" in row:
        parts.append(f"Annual rainfall: {row.get('Annual_Rainfall', 'N/A')} mm")
    if "Fertilizer" in row:
        parts.append(f"Fertilizer used: {row.get('Fertilizer', 'N/A')}")
    if "Pesticide" in row:
        parts.append(f"Pesticide used: {row.get('Pesticide', 'N/A')}")
    if "Yield" in row:
        parts.append(f"Yield: {row.get('Yield', 'N/A')}")
    
    return ". ".join(parts) + "."

def ingest_csv(path: str):
    import os
    if os.path.getsize(path) == 0:
        print(f"⚠️ Skipping empty file: {path}")
        return

    try:
        df = pd.read_csv(path)
        if df.empty:
            print(f"⚠️ Skipping CSV with no rows/columns: {path}")
            return

        for _, row in df.iterrows():
            text = crop_row_to_text_safe(row)
            add_farming_doc(text, crop=row.get("Crop"), region=row.get("State"))

        print(f"✅ Ingested CSV: {path}")

    except pd.errors.EmptyDataError:
        print(f"⚠️ Skipping invalid CSV file: {path}")
    except Exception as e:
        print(f"⚠️ Error reading CSV {path}: {e}")


def ingest_pdf(path: str, crop: str = None, region: str = None):
    reader = PdfReader(path)
    text = "".join([page.extract_text() or "" for page in reader.pages])
    add_farming_doc(text, crop, region)

def ingest_txt(path: str):
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    add_farming_doc(text)

def ingest_json(path: str):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict):
        text = " ".join([f"{k}: {v}" for k, v in data.items()])
    else:
        text = str(data)
    add_farming_doc(text)

def ingest_data(data_dir="data"):
    os.makedirs(data_dir, exist_ok=True)
    for file in os.listdir(data_dir):
        filepath = os.path.join(data_dir, file)
        ext = file.lower().split(".")[-1]

        if ext == "csv":
            ingest_csv(filepath)
        elif ext == "pdf":
            ingest_pdf(filepath)
        elif ext == "txt":
            ingest_txt(filepath)
        elif ext == "json":
            ingest_json(filepath)
        else:
            print(f"⚠️ Skipping unsupported file: {file}")

    print("✅ Ingestion complete!")
