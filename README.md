# AyurHerb

### Traceable Herbs. Verified Farms.

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Groq-F55036?style=for-the-badge&logoColor=white" alt="Groq" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Solidity-363636?style=for-the-badge&logo=solidity&logoColor=white" alt="Solidity" />
  <img src="https://img.shields.io/badge/Hardhat-FFF100?style=for-the-badge&logo=hardhat&logoColor=black" alt="Hardhat" />
  <img src="https://img.shields.io/badge/ethers.js-2535A0?style=for-the-badge&logo=ethereum&logoColor=white" alt="ethers.js" />
  <img src="https://img.shields.io/badge/Render-000000?style=for-the-badge&logo=render&logoColor=white" alt="Render" />
</p>

**Agricultural intelligence and supply-chain transparency for medicinal plants, starting with Assam and Northeast India.**

AyurHerb is a geospatial agricultural intelligence platform designed to connect medicinal-plant growers with buyers through regional crop insights, market intelligence, demand matching, logistics planning, and blockchain-based traceability.

The platform aims to make medicinal-plant sourcing more transparent by bringing farm-level visibility, cultivation insights, buyer requirements, and supply-chain records into one integrated system.

---

## Overview

AyurHerb is being developed around three core objectives:

- **Cultivation intelligence** — Support region-specific medicinal-plant recommendations and agricultural decision-making.
- **Market connectivity** — Help farmers and buyers discover relevant supply and demand opportunities.
- **Supply-chain transparency** — Improve crop and order traceability through geospatial records and blockchain integration.

The initial focus is Assam and the Northeast, with scope for expansion as regional data, integrations, and workflows mature.

## Features

| Module | Description |
| --- | --- |
| Farmer & Buyer Profiles | Registration, profiles, and crop availability management. |
| Geospatial Intelligence | Map-based visibility into farms and agricultural zones. |
| Crop Recommendations | Region-specific medicinal-plant recommendation workflows. |
| Market Intelligence | Market-price insights and buyer-demand analysis. |
| Demand Matching | Match buyer requirements with farmer availability. |
| Logistics Planning | Shipment management and route-planning workflows. |
| Blockchain Traceability | Smart-contract-based crop registration and order records. |
| AyurMate | AI-assisted agricultural interaction and guidance. |

> **Development status:** Some modules are actively under development. Their availability and outputs depend on the current implementation, configured integrations, and available data sources.

## Technology Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, Vite, TypeScript/JavaScript |
| UI & Mapping | Tailwind CSS, React Leaflet, Framer Motion, Lucide |
| Backend | Node.js, Express, TypeScript, REST APIs |
| Authentication | JWT |
| Database | MongoDB, MongoDB Atlas |
| AI Services | Python, FastAPI, Groq |
| Blockchain | Solidity, Hardhat, ethers.js |
| Integrations | Razorpay, Weather API, Gmail SMTP |
| Deployment | Render |

## Architecture

AyurHerb uses a modular architecture that separates the user interface, application API, AI services, and blockchain components.

```text
AyurHerb
│
├── frontend/          # React application
├── backend/           # Express REST API
├── agent-services/    # FastAPI and AI services
├── blockchain/        # Solidity contracts and Hardhat
├── chatbot/           # Chatbot components
├── README.md
└── TEAM_SETUP.md
```

The application backend handles core API operations and database interactions. AI-related workflows are separated into Python services, while smart contracts provide blockchain-based records for supported crop and order operations.

## Getting Started

### Prerequisites

Install the following before starting development:

- [Node.js](https://nodejs.org/)
- npm
- [Python 3](https://www.python.org/)
- [Git](https://git-scm.com/)
- A MongoDB connection string
- API credentials for the services you intend to use

### Installation

Clone the repository:

```bash
git clone https://github.com/SnehaSaha3/AyurHerb.git
cd AyurHerb
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

Install backend dependencies:

```bash
cd ../backend
npm install
```

Set up the AI services:

```bash
cd ../agent-services
python -m venv venv
```

Activate the virtual environment and install dependencies.

**macOS / Linux**

```bash
source venv/bin/activate
pip install -r requirements.txt
```

**Windows PowerShell**

```powershell
venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Environment Configuration

Create the environment files required by the relevant services:

```text
frontend/.env.local
backend/.env
agent-services/.env
blockchain/.env
```

The blockchain environment file is needed when configuring blockchain development or deployment.

### Frontend

```dotenv
VITE_API_URL=http://localhost:8000
VITE_AGENT_URL=http://localhost:8002
```

### AI Services

```dotenv
GROQ_API_KEY=your_groq_api_key
```

Configure database access, JWT authentication, email, payment, weather, and blockchain variables according to the requirements of each service.

Use the variable names expected by the application's configuration. Never commit API keys, private keys, database credentials, or other secrets to source control.

## Running Locally

Start each service in a separate terminal.

### 1. Frontend

```bash
cd frontend
npm run dev
```

### 2. Backend

```bash
cd backend
npm run dev
```

### 3. AI Services

```bash
cd agent-services
source venv/bin/activate
```

Start FastAPI using the entry point and command configured in the project. The activation command above applies to macOS/Linux; on Windows, activate the environment using PowerShell.

### 4. Local Blockchain (Optional)

```bash
cd blockchain
npx hardhat node
```

A local Hardhat node is required only for workflows configured to use a local development network.

### Default Local Ports

| Service | Port |
| --- | ---: |
| Frontend | `5173` |
| Backend | `8000` |
| AI Services | `8002` |
| Hardhat Node | `8545` |

Ensure that the configured ports, environment variables, and service URLs match your local setup.

## Smart Contracts

The project includes smart contracts for crop registration and order logging.

| Contract | Configured Address |
| --- | --- |
| `CropRegistry` | `0x279Bb8b9957Ae8bFf6f91c527f19fc20e4844326` |
| `OrderLog` | `0x10dd95436164690196773Ef6dD8B9CF5991cc831` |

**Important:** Verify the target blockchain network, contract deployment, and corresponding configuration before interacting with these addresses. Contract addresses are network-specific.

## Deployment

The current deployment configuration uses Render.

| Service | Deployment |
| --- | --- |
| Frontend | [AyurHerb Web App](https://ayurherb-i3oe.onrender.com) |
| Backend | [AyurHerb API](https://ayurherb-backend-7yw4.onrender.com) |
| AI Services | [AyurHerb AI Services](https://ayurherb-agents.onrender.com) |

Hosted services may experience temporary downtime. For deployment, configure the required environment variables, frontend origin allowlists, API URLs, and external service credentials.

## Documentation

- [`TEAM_SETUP.md`](./TEAM_SETUP.md) — Team onboarding and environment setup.

## Contributing

Contributions, feedback, and technical discussions are welcome. Before making changes, review the existing project structure and setup instructions. Keep credentials out of source control and test changes against the relevant service.

## License

License information has not yet been specified in this README. Refer to the repository for the applicable licensing terms.

---

<p align="center">
  <strong>AyurHerb</strong><br />
  Traceable Herbs. Verified Farms.
</p>