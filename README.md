# 🌿 AyurHerb

**AI-Powered Agricultural Intelligence, Traceability & Market Connectivity Platform**

AyurHerb is a smart agriculture platform designed to connect **farmers, buyers, markets, logistics, and agricultural intelligence** through a unified digital ecosystem.

The platform combines:

* 🤖 AI-powered agricultural recommendations
* 🌱 Crop and medicinal-plant intelligence
* 🗺️ Agricultural zone and geospatial intelligence
* 📊 Market and demand visibility
* 🤝 Farmer–buyer matching
* 🚚 Shipment and logistics management
* 🌦️ Weather-aware agricultural intelligence
* ⛓️ Blockchain-based traceability
* 💳 Digital payments
* 🧠 AI agents and AyurMate assistant

The long-term objective is to improve agricultural visibility and help farmers make better decisions about **what to grow, where to sell, when to sell, and how to move their produce**.

---

## 🏗️ System Architecture

```text
                         ┌──────────────────────┐
                         │      Frontend        │
                         │   React + Vite       │
                         │ Tailwind + Leaflet   │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │       Backend        │
                         │   Node + Express     │
                         │      TypeScript      │
                         └───────┬───────┬──────┘
                                 │       │
                    ┌────────────┘       └─────────────┐
                    ▼                                  ▼
          ┌──────────────────┐               ┌──────────────────┐
          │    MongoDB       │               │   AI Services    │
          │    Database      │               │ FastAPI + Groq   │
          └──────────────────┘               └──────────────────┘
                    │
                    │
                    ▼
          ┌──────────────────────┐
          │      Blockchain      │
          │ Solidity + Hardhat   │
          │ CropRegistry         │
          │ OrderLog             │
          └──────────────────────┘

External Services
────────────────────────────────────────────────
Weather API
Razorpay
Gmail SMTP
Base / RPC Network
Render
```

---

# 📁 Repository Structure

```text
AyurHerb/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env.local
│
├── backend/
│   ├── src/
│   ├── package.json
│   └── .env
│
├── agent-services/
│   ├── app/
│   ├── requirements.txt
│   └── .env
│
├── blockchain/
│   ├── contracts/
│   ├── scripts/
│   ├── test/
│   ├── hardhat.config.*
│   └── .env
│
├── chatbot/
│   └── ...
│
├── README.md
├── TEAM_SETUP.md
└── .gitignore
```

---

# 🧰 Technology Stack

## Frontend

* React
* Vite
* TypeScript / JavaScript
* Tailwind CSS
* React Router
* React Leaflet
* Framer Motion
* Lucide Icons

## Backend

* Node.js
* Express
* TypeScript
* MongoDB
* JWT Authentication
* REST APIs

## AI / Agent Services

* Python
* FastAPI
* Groq
* AI agents
* Report generation
* QR generation

## Blockchain

* Solidity
* Hardhat
* ethers.js
* Smart contracts
* RPC-based blockchain interaction

## Payments

* Razorpay

## Infrastructure

* Render
* MongoDB Atlas
* GitHub

---

# 🚀 Getting Started

## 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd AyurHerb
```

---

# 2. Install Dependencies

## Frontend

```bash
cd frontend
npm install
```

## Backend

```bash
cd ../backend
npm install
```

## Agent Services

```bash
cd ../agent-services
python -m venv venv
```

Activate the environment.

### macOS / Linux

```bash
source venv/bin/activate
```

### Windows

```powershell
venv\Scripts\activate
```

Then:

```bash
pip install -r requirements.txt
```

---

# 🔐 Environment Configuration

AyurHerb uses environment variables for:

* MongoDB
* JWT authentication
* Gmail SMTP
* Razorpay
* Blockchain RPC
* Private blockchain wallet
* Weather API
* AI services
* Agent services

**Never commit actual `.env` files to GitHub.**

The repository should contain only example/template environment files.

---

# 🌐 Frontend Environment

Create:

```text
frontend/.env.local
```

Use:

```env
VITE_API_URL=http://localhost:8000
VITE_AGENT_URL=http://localhost:8002
```

---

# 🖥️ Backend Environment

Create:

```text
backend/.env
```

The backend environment contains:

```env
MONGODB_URI=

JWT_SECRET=

MAIL_SERVICE=gmail
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=

PLATFORM_FEE_PERCENT=5
TRANSPORT_FEE_PER_KG=2
GST_ON_FEES_PERCENT=18

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

CROP_REGISTRY_ADDRESS=
ORDER_LOG_ADDRESS=

RPC_URL=

PRIVATE_KEY=

REACT_APP_WEATHER_API_KEY=

WALLET_ENCRYPTION_KEY=

AGENTS_URL=http://localhost:8002
PUBLIC_APP_URL=http://localhost:5173

PORT=8000
```

---

# 🤖 Agent Services Environment

Create:

```text
agent-services/.env
```

Example structure:

```env
GROQ_API_KEY=
```

Additional agent-specific environment variables should be added here if required by the current implementation.

---

# ⛓️ Blockchain Environment

Create:

```text
blockchain/.env
```

For local Hardhat development:

```env
RPC_URL=http://127.0.0.1:8545
DEPLOYER_PRIVATE_KEY=
```

---

# 🧪 Running AyurHerb Locally

The development environment consists of multiple services.

| Service        |   Port |
| -------------- | -----: |
| Frontend       | `5173` |
| Backend        | `8000` |
| Agent Services | `8002` |
| Hardhat Node   | `8545` |

---

## Terminal 1 — Frontend

```bash
cd frontend
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## Terminal 2 — Backend

```bash
cd backend
npm run dev
```

Backend:

```text
http://localhost:8000
```

---

## Terminal 3 — Agent Services

Activate the Python environment:

```bash
cd agent-services
source venv/bin/activate
```

Then start FastAPI according to the project's current entry point.

Expected service:

```text
http://localhost:8002
```

---

## Terminal 4 — Blockchain

If local blockchain development is required:

```bash
cd blockchain
npx hardhat node
```

Expected RPC:

```text
http://127.0.0.1:8545
```

---

# 🔗 Smart Contracts

AyurHerb currently uses blockchain contracts for agricultural traceability and order logging.

### Crop Registry

```text
0x279Bb8b9957Ae8bFf6f91c527f19fc20e4844326
```

### Order Log

```text
0x10dd95436164690196773Ef6dD8B9CF5991cc831
```

These addresses are configuration values, **not secrets**.

Do not redeploy contracts unnecessarily because the backend/frontend may depend on the existing deployed addresses.

---

# 🔄 Application Flow

```text
Farmer / Buyer
      │
      ▼
   Frontend
      │
      ▼
    Backend
      │
      ├──────────────► MongoDB
      │
      ├──────────────► AI / Agent Services
      │
      ├──────────────► Weather API
      │
      ├──────────────► Razorpay
      │
      └──────────────► Blockchain
                           │
                           ├── Crop Registry
                           └── Order Log
```

---

# 🌱 Core Platform Modules

## Farmer Management

* Farmer registration
* Farmer profiles
* Crop information
* Location information
* Supply information
* Crop availability

## Buyer / Company Management

* Company registration
* Crop demand
* Quantity requirements
* Quality requirements
* Procurement requirements
* Farmer matching

## Agricultural Intelligence

The planned intelligence layer includes:

* Crop recommendations
* Region-specific recommendations
* Medicinal crop recommendations
* Soil-aware recommendations
* Weather-aware recommendations
* Flood/disaster-aware recommendations
* Agricultural zone intelligence

## Market Intelligence

Future market intelligence includes:

* Mandi price visibility
* Demand trends
* Procurement information
* Market comparison
* Buyer demand
* Price intelligence

## Logistics

The logistics layer is designed to support:

* Shipment creation
* Transport assignment
* Warehouse discovery
* Mandi discovery
* Route intelligence
* Disaster-aware route assignment
* Shipment tracking

## Blockchain

Blockchain is used to provide:

* Crop traceability
* Order logging
* Verification
* Transparent transaction records

## AyurMate

AyurMate is the AI-assisted agricultural interface designed to help users interact with the AyurHerb ecosystem using natural language.

---

# 🌦️ External Services

AyurHerb integrates with external services including:

* MongoDB Atlas
* Razorpay
* Gmail SMTP
* Weather API
* Groq
* Blockchain RPC
* Render

Credentials for these services must remain outside Git.

---

# 🌍 Production Deployment

The current deployment environment uses Render.

### Frontend

```text
https://ayurherb-i3oe.onrender.com
```

### Backend

```text
https://ayurherb-backend-7yw4.onrender.com
```

### Agent Services

```text
https://ayurherb-agents.onrender.com
```

Production environment variables must be configured directly in the deployment platform.

---

# ⚠️ CORS Configuration

When running the frontend locally against a deployed backend, the backend must allow:

```text
http://localhost:5173
```

When running the production frontend, the backend must allow:

```text
https://ayurherb-i3oe.onrender.com
```

For local development, the recommended configuration is:

```text
Frontend
localhost:5173
        │
        ▼
Backend
localhost:8000
        │
        ▼
MongoDB / AI / Blockchain
```

This avoids unnecessary dependency on the production backend during development.

---

# 🌿 Development Workflow

Do **not** develop directly on the deployment branch.

Recommended workflow:

```text
main
 │
 ├── feature/crop-recommendation
 ├── feature/market-intelligence
 ├── feature/shipment
 ├── feature/ai-agents
 └── feature/frontend
```

The deployment branch is maintained separately.

### Recommended workflow

```bash
git checkout main
git pull origin main

git checkout -b feature/your-feature
```

After development:

```bash
git add .
git commit -m "feat: describe your change"
git push origin feature/your-feature
```

Then create a Pull Request.

---

# 🧹 Before Committing

Always check:

```bash
git status
```

Make sure the following are **not** being committed:

```text
.env
.env.local
.env.production
node_modules/
venv/
__pycache__/
dist/
build/
```

Check tracked files with:

```bash
git ls-files | grep ".env"
```

Only example environment files should be tracked.

---

# 🛠️ Troubleshooting

## Frontend cannot connect to backend

Check:

```env
VITE_API_URL=http://localhost:8000
```

Then restart Vite:

```bash
npm run dev
```

Vite environment variables are loaded when the development server starts, so changing `.env.local` requires a restart.

---

## CORS error

If you see:

```text
blocked by CORS policy
```

check whether the backend allows the frontend origin.

For local development:

```text
http://localhost:5173
```

For production:

```text
https://ayurherb-i3oe.onrender.com
```

---

## MongoDB connection error

Check:

* `MONGODB_URI`
* MongoDB Atlas network access
* database credentials
* database availability

---

## Authentication error

Check:

```env
JWT_SECRET=
```

The backend and currently issued authentication tokens must use a consistent JWT configuration.

---

## AI service not responding

Check:

```env
GROQ_API_KEY=
```

and verify that the agent service is running.

---

# 🧑‍💻 Team Responsibilities

AyurHerb is being developed as a modular system.

Potential development areas include:

```text
Frontend
Backend
AI / ML
AI Agents
Market Intelligence
Crop Recommendation
Medicinal Plant Intelligence
Logistics / Shipment
Blockchain
Geospatial Intelligence
Database
UI / UX
Testing
Deployment
```

Each contributor should work inside a feature branch and avoid directly modifying deployment configuration unless assigned to deployment work.

---

# 🗺️ Development Roadmap

### Phase 1 — Core Platform

* Farmer registration
* Buyer registration
* Crop management
* Authentication
* Basic marketplace
* Order management
* Blockchain integration

### Phase 2 — Agricultural Intelligence

* Agricultural zone mapping
* Region-specific crop recommendation
* Medicinal crop intelligence
* Soil and weather intelligence
* Crop suitability analysis

### Phase 3 — Market Intelligence

* Mandi price intelligence
* Demand intelligence
* Procurement visibility
* Buyer–farmer matching
* Price analysis

### Phase 4 — Logistics Intelligence

* Shipment management
* Route intelligence
* Warehouse discovery
* Mandi discovery
* Disaster-aware route assignment
* Delivery tracking

### Phase 5 — AI Ecosystem

* AyurMate
* Agricultural AI agents
* Research / knowledge retrieval
* Multi-agent workflows
* Intelligent recommendations
* Automated agricultural reports

### Phase 6 — Advanced Traceability

* Expanded blockchain verification
* Supply-chain traceability
* Product verification
* Future DID / decentralized identity exploration

---

# 🎯 Project Goal

AyurHerb aims to build an intelligent agricultural ecosystem where farmers can gain better visibility into:

```text
What should I grow?
        ↓
Can I grow it in my region?
        ↓
What is the current demand?
        ↓
Who needs my crop?
        ↓
What price can I expect?
        ↓
Where should I sell it?
        ↓
How should it be transported?
        ↓
Can the transaction and crop history be verified?
```

The platform combines **agriculture + AI + geospatial intelligence + market intelligence + logistics + blockchain** to create a connected agricultural ecosystem.

---

# 📄 Team Setup

For complete onboarding instructions, including:

* exact environment files
* shared development credentials
* service startup order
* local configuration
* troubleshooting

see:

```text
TEAM_SETUP.md
```

The actual credentials should be shared with team members through a private channel and **must not be committed to GitHub**.

---

# 🤝 Contribution Guidelines

Before contributing:

1. Pull the latest `main`.
2. Create a feature branch.
3. Make your changes.
4. Test locally.
5. Check `git status`.
6. Confirm no credentials are staged.
7. Commit with a meaningful message.
8. Push your branch.
9. Open a Pull Request.

Example:

```bash
git checkout main
git pull origin main

git checkout -b feature/market-model

git add .
git commit -m "feat: add market intelligence model"

git push origin feature/market-model
```

---

# 📌 Important

### Never commit:

```text
.env
.env.local
API keys
Passwords
Private keys
JWT secrets
Database credentials
SMTP credentials
Razorpay secrets
AI API keys
Wallet encryption keys
```

If a credential is accidentally committed, **do not simply delete the file in a later commit**. The credential should be considered exposed and rotated.

---

## AyurHerb

**AI-powered agricultural intelligence for a more connected and traceable agricultural ecosystem.**
