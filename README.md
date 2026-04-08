# 🌿 Ayurherb

**Ayurherb** is a full-stack smart agriculture platform that integrates **AI, Blockchain, and Geospatial Intelligence** to empower farmers with better decision-making, transparency, and community collaboration.

---

## 🚀 Features

### 🌱 Farmer Dashboard

* Personalized dashboard for each farmer
* View crops, profile, and activity
* Clean and modern UI (React + Tailwind)

### 🌾 Crop Management

* Add and manage crops
* Store crop data both:

  * **On-chain (Blockchain)**
  * **Off-chain (MongoDB)**
* Hybrid architecture for reliability

### 📍 Geo Tagging

* Store farm locations (latitude & longitude)
* Map-based visualization of crops
* Foundation for nearby farmer discovery

### 🤖 AI Chatbot (AyurMate)

* AI-powered farming assistant
* Context-aware suggestions using:

  * Weather data
  * Farm location
* Moving towards **RAG Agent architecture**

### 🌦 Weather Integration

* Real-time weather data based on farm location
* Helps in crop planning & decision making

### 🔐 Authentication

* JWT-based authentication
* Secure farmer login system

### ⛓ Blockchain Integration

* Smart contract for crop registry
* Transparent and tamper-proof data storage
* Built using **Solidity + Hardhat**

---

## 🏗 Tech Stack

### Frontend

* React (Vite)
* TypeScript
* Tailwind CSS
* Framer Motion

### Backend

* Node.js
* Express.js
* MongoDB (Mongoose)

### Blockchain

* Solidity
* Hardhat
* Ethers.js

### AI & Data

* RAG (Retrieval-Augmented Generation)
* BERT (Sentiment Analysis - in progress)

---

## 📁 Project Structure

```
Ayurherb/
│
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── dashboard/
│   └── services/
│
├── backend/
│   ├── routes/
│   ├── models/
│   ├── controllers/
│   └── middlewares/
│
├── blockchain/
│   ├── contracts/
│   ├── scripts/
│   └── artifacts/
│
└── README.md
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository

```
git clone https://github.com/your-username/ayurherb.git
cd ayurherb
```

---

### 2️⃣ Backend Setup

```
cd backend
npm install
```

Create `.env` file:

```
PORT=8000
MONGO_URI=your_mongodb_url
JWT_SECRET=your_secret
```

Run server:

```
npm run dev
```

---

### 3️⃣ Frontend Setup

```
cd frontend
npm install
npm run dev
```

---

### 4️⃣ Blockchain Setup

```
cd blockchain
npm install
npx hardhat node
```

Deploy contract:

```
npx hardhat run scripts/deploy.ts --network localhost
```

---

## 🔄 API Endpoints

### Farmer

* `POST /api/farmers/register`
* `GET /api/farmers/profile`
* `GET /api/farmers/farmer-dashboard`

### Crops

* `POST /api/crops/add`
* `GET /api/crops/mine`
* `GET /api/crops`

---

## 🧠 Future Roadmap

* 🔍 Nearby Farmers Discovery (Map Clustering)
* 💬 Community Messaging (Discord-like system)
* 🧠 Advanced RAG Agent (context-aware AI)
* 📊 Data Analytics Dashboard
* 🌍 Multi-language Support
* 🔗 Fully decentralized identity (DID)

---

## 🎯 Goals

* Build a **farmer-first ecosystem**
* Enable **transparent agriculture data**
* Combine **AI + Blockchain for real-world impact**

---

## 👩‍💻 Author

**Sneha Saha**

---

## ⭐ Contribute

Contributions, ideas, and collaborations are welcome!
Feel free to fork the repo and raise a PR 🚀

---

## 📜 License

This project is licensed under the MIT License.
