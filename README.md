# 🎡 Eventora — Spin. Shuffle. Select. Organize.

> A premium random selection, spinning-wheel draw, list shuffling, group formation, and event management platform.

---

## 🌟 Key Features

1. **Signature Interactive Spinning Wheel**:
   - Smooth physics-based deceleration curve.
   - Built-in Web Audio API ticker and harmonic victory fanfare chimes (zero network latency, no MP3 dependencies).
   - Unbiased cryptographic winner calculation with precise segment alignment.
   - Winner reveal modal with instant "Keep", "Remove from list", or "Spin Again".
   - Non-repeat mode and particle celebration confetti.

2. **Smart List Shuffle & Multi-Pick**:
   - Unbiased Fisher–Yates list shuffler.
   - Sequential numbered order view (`#1, #2, #3, ...`) with search highlighting.
   - Pick $N$ random winners simultaneously.

3. **Balanced Automatic Group Formation**:
   - Mode A: By Number of Groups (e.g. 24 into 4 groups).
   - Mode B: By People Per Group (e.g. groups of 5).
   - Handles uneven totals smoothly without losing any participant (e.g. 23 divided into 4 groups = 6, 6, 6, 5).
   - Inter-team member transfers and inline editable team names.
   - Fullscreen **Classroom & Projector Presentation Mode**.

4. **Spreadsheet Import & Export**:
   - Drag-and-drop `.xlsx`, `.xls`, and `.csv` files.
   - 4-step import wizard: preview raw sheet data, map columns (*Name, ID, Department*), and auto-detect duplicates.
   - One-click template download (`eventora_participants_template.xlsx`).
   - Excel export protected against spreadsheet formula injection.

5. **Reusable Saved Lists & Templates**:
   - Maintain master participant rosters and clone them into events with one click.
   - Ready-to-use pre-configured templates for *Classrooms, Agile Standups, Lucky Draws, and Tournaments*.

6. **Event Workspaces & Results History**:
   - Dedicated workspace per event with tabs (*Participants, Wheel, Shuffle, Groups, Results*).
   - Immutable historical snapshots with detailed outcome inspection.

7. **Authentication & Theme**:
   - Supabase Auth with Row Level Security (RLS) isolation.
   - Seamless **Instant Demo Sandbox Mode** for zero-friction local exploration.
   - Full Light and Dark themes with persistence.

---

## 🛠️ Technology Stack

* **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, Canvas Confetti, SheetJS (`xlsx`), React Router v7.
* **Backend**: Node.js, Express.js (REST API, CORS, centralized error handling).
* **Database & Security**: Supabase PostgreSQL with complete Row Level Security (RLS) policies.
* **Language**: Pure JavaScript (ES Modules).

---

## 📁 Modular Project Structure

```
Eventora/
├── client/                      # React Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── groups/          # GroupCard, GroupConfigToolbar, GroupPresentationModal
│   │   │   ├── lists/           # CreateListModal, CopyToListModal
│   │   │   ├── participants/    # EventParticipantsView, ImportModal, Add/Bulk modals
│   │   │   ├── results/         # ResultDetailModal
│   │   │   ├── shuffle/         # ShuffleToolbar, ShuffleOrderList, RandomPickDisplay
│   │   │   ├── wheel/           # WheelCanvas, WheelControls, WinnerDialog, WheelHistoryDrawer
│   │   │   │   └── audio/       # Web Audio API synthetic ticker and victory chimes
│   │   │   └── layout/          # AppLayout with collapsible sidebar
│   │   ├── context/             # AuthContext, ThemeContext
│   │   ├── pages/               # LandingPage, Dashboard, Workspaces, Settings
│   │   ├── services/            # participantService
│   │   └── utils/               # excelUtils, shuffleUtils, groupUtils
│   └── vite.config.js
├── server/                      # Node.js Express API
│   ├── src/
│   │   ├── config/              # supabase.js
│   │   ├── controllers/         # eventController, participantController, resultController
│   │   ├── middleware/          # auth.js, errorHandler.js
│   │   ├── routes/              # eventRoutes, participantRoutes, resultRoutes
│   │   ├── utils/               # random.js (crypto-backed Fisher-Yates and group algorithms)
│   │   ├── app.js               # Express app configuration & routing
│   │   └── index.js             # Server boot entrypoint
│   └── package.json
├── supabase/
│   └── schema.sql               # PostgreSQL tables, indexes, triggers, and RLS policies
├── .env.example
└── README.md
```

---

## 🚀 Getting Started

### 1. Database Setup (Supabase)
1. Go to your [Supabase Dashboard](https://supabase.com).
2. Open the **SQL Editor** and paste the contents of [`supabase/schema.sql`](supabase/schema.sql).
3. Run the script to create the tables, indexes, triggers, and Row Level Security policies.
4. Copy your **Supabase URL**, **Anon Public Key**, and **Service Role Secret Key** into `.env`.

### 2. Running Locally

#### Run the Frontend
```bash
cd client
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

#### Run the Backend API
In a second terminal:
```bash
cd server
npm install
npm run dev
```
API runs on **[http://localhost:5000](http://localhost:5000)** (Health check: `http://localhost:5000/api/v1/health`).

---

## 📄 License
MIT. Built for Eventora — *Spin. Shuffle. Select. Organize.*
