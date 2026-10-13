**AyurHerb**
Traceable Herbs. Verified Farms.
AyurHerb is an agricultural intelligence and supply-chain platform focused on connecting medicinal-plant growers with buyers through region-specific crop information, geospatial visibility, market intelligence, logistics, and blockchain-based traceability. The platform is being developed with an initial focus on Assam and the Northeast.
Stack
- Frontend: React, Vite, TypeScript/JavaScript, Tailwind CSS, React Router
- Maps and UI: React Leaflet, Framer Motion, Lucide
- Backend: Node.js, Express, TypeScript, REST APIs, JWT authentication
- Database: MongoDB, MongoDB Atlas
- AI services: Python, FastAPI, Groq
- Blockchain: Solidity, Hardhat, ethers.js
- Payments and integrations: Razorpay, weather API, Gmail SMTP
- Deployment: Render
Platform Modules
- Farmer and buyer registration, profiles, and crop availability
- Geospatial visibility for farms and agricultural zones
- Region-specific crop and medicinal-plant recommendation workflows
- Market-price and buyer-demand intelligence
- Farmer–buyer matching based on crop requirements and availability
- Shipment management and route-planning workflows
- Blockchain-based crop registration and order records
- AyurMate, an AI-assisted agricultural interface
Some modules are under active development. Availability and behavior depend on the current implementation, data sources, and configured external services.
Repository Structure
AyurHerb/
├── frontend/          # React web application
├── backend/           # Express and TypeScript API
├── agent-services/    # FastAPI and AI services
├── blockchain/        # Solidity contracts and Hardhat tooling
├── chatbot/           # Chatbot-related components
├── README.md
└── TEAM_SETUP.md
Local Setup
Requirements
- Node.js and npm
- Python 3
- Git
- MongoDB connection string
- API credentials for the services you intend to use
Install
git clone https://github.com/SnehaSaha3/AyurHerb.git
cd AyurHerb

cd frontend
npm install

cd ../backend
npm install

cd ../agent-services
python -m venv venv
Activate the Python environment and install dependencies.
macOS / Linux
source venv/bin/activate
pip install -r requirements.txt
Windows PowerShell
venv\Scripts\Activate.ps1
pip install -r requirements.txt
Environment
Create the environment files required by each service:
- frontend/.env.local
- backend/.env
- agent-services/.env
- blockchain/.env (for blockchain development)
Frontend example:
VITE_API_URL=http://localhost:8000
VITE_AGENT_URL=http://localhost:8002
Agent services example:
GROQ_API_KEY=
Configure database, authentication, email, payment, weather, and blockchain settings using the variable names expected by the relevant service. Keep credentials in local or deployment environment settings, not in source control.
Run Locally
Start each service in a separate terminal.
Frontend
cd frontend
npm run dev
Backend
cd backend
npm run dev
AI services
Activate the virtual environment in agent-services and start FastAPI using the entry point configured in the project.
Local blockchain (optional)
cd blockchain
npx hardhat node
Default local ports:
Service	Port
Frontend	5173
Backend	8000
AI services	8002
Hardhat node	8545


Smart Contracts
The project includes contracts for crop registration and order logging.
Contract	Configured address
CropRegistry	0x279Bb8b9957Ae8bFf6f91c527f19fc20e4844326
OrderLog	0x10dd95436164690196773Ef6dD8B9CF5991cc831


Confirm the target network and deployment configuration before interacting with these contracts.
Deployment
The current deployment configuration uses Render.
- Frontend: https://ayurherb-i3oe.onrender.com
- Backend: https://ayurherb-backend-7yw4.onrender.com
- AI services: https://ayurherb-agents.onrender.com
Hosted service availability may vary. Configure production environment variables and allowed frontend origins in the deployment settings.
Documentation
See [`TEAM_SETUP.md`](./TEAM_SETUP.md) for team onboarding and environment setup details.
License
Check the repository for licensing information.