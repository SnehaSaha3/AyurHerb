<div align="center">

# AyurHerb

A blockchain-integrated smart agriculture platform connecting farmers, transparency, and AI.

[![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Solidity](https://img.shields.io/badge/Solidity-Hardhat-363636?logo=solidity&logoColor=white)](https://hardhat.org/)
[![Ethers.js](https://img.shields.io/badge/ethers.js-v6-2535A0)](https://docs.ethers.org/v6/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

AyurHerb combines AI, blockchain, and geospatial intelligence to give farmers a transparent, tamper-proof way to manage crops, connect with buyers, and get context-aware farming guidance — all in one platform.

## Features

| Feature | Description |
|---|---|
| Farmer Dashboard | Personalized dashboard with crop tracking, profile, and activity history |
| Crop Management | Hybrid on-chain (blockchain) + off-chain (MongoDB) storage for reliability |
| Geo Tagging & Mapping | Real-time farm location mapping with marker clustering (react-leaflet) |
| AI Chatbot — AyurMate | Context-aware farming assistant, moving toward a full RAG agent |
| Weather Integration | Live weather data tied to farm location for planning decisions |
| Real-Time Messaging | WebSocket-based company–farmer communication |
| Authentication | JWT-based secure login for farmers and companies |
| Blockchain Registry | Smart-contract-backed crop registry for tamper-proof records |

## Tech Stack

**Frontend** — React (Vite) · TypeScript · Tailwind CSS · Framer Motion · react-leaflet

**Backend** — Node.js · Express.js · MongoDB (Mongoose) · WebSockets

**Blockchain** — Solidity · Hardhat · ethers.js v6

**AI & Data** — Retrieval-Augmented Generation (RAG) · BERT (sentiment analysis, in progress)

## Project Structure

```
AyurHerb/
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── dashboard/
│   └── services/
├── backend/
│   ├── routes/
│   ├── models/
│   ├── controllers/
│   └── middlewares/
├── blockchain/
│   ├── contracts/
│   ├── scripts/
│   └── artifacts/
├── chatbot/
└── README.md
```

## Local Setup

**Requirements:** Node.js 18+, npm, MongoDB instance

### 1. Clone the repository

```bash
git clone https://github.com/SnehaSaha3/AyurHerb.git
cd AyurHerb
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=8000
MONGO_URI=your_mongodb_url
JWT_SECRET=your_secret
```

Run the server:

```bash
npm run dev
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Blockchain setup

```bash
cd blockchain
npm install
npx hardhat node
```

Deploy the contract:

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

## API Endpoints

**Farmer**
```
POST  /api/farmers/register
GET   /api/farmers/profile
GET   /api/farmers/farmer-dashboard
```

**Crops**
```
POST  /api/crops/add
GET   /api/crops/mine
GET   /api/crops
```

## Roadmap

- [ ] Nearby farmer discovery (map clustering)
- [ ] Community messaging system
- [ ] Advanced RAG agent for AyurMate
- [ ] Data analytics dashboard
- [ ] Multi-language support
- [ ] Fully decentralized identity (DID)

## Goals

- Build a farmer-first digital ecosystem
- Enable transparent, verifiable agriculture data
- Combine AI and blockchain for real-world impact

## Contributing

Contributions, ideas, and collaborations are welcome. Fork the repo, create a feature branch, and open a PR.

## License

Licensed under the [MIT License](LICENSE).