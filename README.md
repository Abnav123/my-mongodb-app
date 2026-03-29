# Carsd Fleet Studio

A modern, full-stack web application for managing vehicle fleet collections with real-time search, filtering, and analytics. Built with React, Node.js, MongoDB, and deployed on Render.

**Live Demo (Frontend):** Add your frontend Render URL here

**Live API (Backend):** [https://my-mongodb-app-wv5h.onrender.com](https://my-mongodb-app-wv5h.onrender.com)

---

## Features

✨ **Core Capabilities**
- 🚗 **Add/Remove Vehicles** – Manage fleet inventory with rich metadata (owner, make, model, year, color, status)
- 🔍 **Advanced Search** – Real-time search across owner names, vehicle makes, models, colors, and member IDs
- 🎯 **Multi-Filter System** – Filter by status (ACTIVE/INACTIVE/SERVICE), year range, and sort by newest, oldest, make, or owner
- 📊 **Fleet Analytics** – Dashboard stats: total fleet size, unique makes, newest model year, top make, active vehicle percentage
- 📥 **CSV Export** – Export filtered results as CSV for external analysis
- 🎨 **Dark Theme** – Sleek black monochrome interface with smooth animations and gradients
- 📱 **Responsive Design** – Works seamlessly on desktop, tablet, and mobile devices
- ⚡ **Real-Time Updates** – Changes reflect instantly across the UI

---

## Tech Stack

### Frontend
- **React 19** – Component-based UI with hooks (useState, useEffect, useMemo)
- **Vite** – Ultra-fast build tool for modern web development
- **CSS3** – Custom animations, gradients, and responsive grid layouts
- **Axios** – HTTP client for API communication

### Backend
- **Node.js + Express** – RESTful API server with middleware support
- **MongoDB** – NoSQL database for scalable data storage
- **CORS** – Cross-origin resource sharing for secure frontend-backend communication
- **dotenv** – Environment variable management

### DevOps & Deployment
- **Render** – Cloud deployment for both frontend and backend
- **Git + GitHub** – Version control and collaboration

---

## Project Structure

```
my-mongodb-app/
├── index.js                 # Express server & MongoDB API endpoints
├── package.json             # Backend dependencies
├── .env                     # Environment variables (MONGODB_URL, DB_NAME)
├── Trigger_data.txt         # Audit log of database operations
│
└── frontend/
    ├── package.json         # Frontend dependencies
    ├── vite.config.js       # Vite configuration
    ├── index.html           # Entry HTML file
    │
    └── src/
        ├── App.jsx          # Main React component with state & logic
        ├── main.jsx         # React app initialization
        └── styles.css       # Dark theme, animations, responsive design
```

---

## Getting Started

### Prerequisites
- Node.js 16+ and npm or yarn
- MongoDB Atlas account (free tier available)
- Git

### Local Development

**1. Clone & Setup Backend**
```bash
git clone https://github.com/yourusername/my-mongodb-app.git
cd my-mongodb-app
npm install
```

**2. Configure Environment Variables**
Create a `.env` file in the root:
```
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=your_database_name
PORT=3000
VITE_API_URL=http://localhost:3000
```

**3. Start Backend Server**
```bash
npm start
# Server runs on http://localhost:3000
```

**4. Setup Frontend (in another terminal)**
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

**5. Open in Browser**
Navigate to `http://localhost:5173`

### API Endpoints

#### GET /api/cars
Fetch all vehicles (max 200 results)
```bash
curl http://localhost:3000/api/cars
```
**Response:**
```json
[
  {
    "_id": "65f8d4a2c1b8e9f2a3d4e5f6",
    "member_id": "MEMBER-001",
    "owner_name": "John Doe",
    "make": "Tesla",
    "model": "Model S",
    "year": 2024,
    "color": "Midnight Black",
    "status": "ACTIVE",
    "created_at": "2024-03-15T10:30:00Z"
  }
]
```

#### POST /api/cars
Add a new vehicle
```bash
curl -X POST http://localhost:3000/api/cars \
  -H "Content-Type: application/json" \
  -d '{
    "owner_name": "Jane Doe",
    "make": "BMW",
    "model": "M440i",
    "year": 2025,
    "color": "Alpine White",
    "status": "ACTIVE"
  }'
```
**Response:** `201 Created` with the new vehicle object

#### DELETE /api/cars/:id
Remove a vehicle by ID
```bash
curl -X DELETE http://localhost:3000/api/cars/65f8d4a2c1b8e9f2a3d4e5f6
```
**Response:** `200 OK` with success confirmation

---

## Usage

### Adding a Vehicle
1. Click **"Add New Car"** button
2. Fill form fields: Owner Name, Make, Model, Year, Color
3. Select Status (ACTIVE, INACTIVE, SERVICE)
4. Click **"Save Car"** → Vehicle appears in the grid with analytics updated

### Searching & Filtering
- **Search Bar** – Type owner name, make, model, or color for instant results
- **Status Filter** – Show all, or only ACTIVE/INACTIVE/SERVICE vehicles
- **Year Range** – Enter min/max year to narrow results
- **Sort** – Choose: Newest first, Oldest first, Make A-Z, Owner A-Z

### Exporting Data
- Apply filters as needed
- Click **"Export CSV"** → Download data for spreadsheet analysis

### Sample Data
Click **"Fill Sample"** to auto-populate the form with a random demo vehicle.

---

## Architecture & Design Patterns

### Frontend Architecture
- **State Management:** React hooks (useState, useMemo) for efficient re-renders
- **Memoization:** useMemo for filtered cars list and stats calculations
- **Component Strategy:** Single monolithic App component (scalable to modular with Context or Redux)
- **Error Handling:** User-facing error messages with loading states

### Backend Architecture
- **REST API:** Standard HTTP verbs (GET, POST, DELETE)
- **Error Handling:** Try-catch blocks with meaningful HTTP status codes
- **Audit Logging:** Trigger_data.txt tracks all database operations (insert, delete)
- **Input Validation:** Server-side defaults for missing fields; ObjectId validation for deletion

### Database Design
- **Collection:** `Carsd` (flexible schema)
- **Index Opportunities:** Consider indexing on `owner_name`, `make`, `status` for large datasets
- **Scalability:** MongoDB Atlas handles growth without redesign

---

## Performance Optimizations

✅ **Frontend**
- Vite's fast bundling and serve
- React useMemo prevents unnecessary recalculations
- CSS animations use GPU-accelerated transforms
- Limit query results to 200 vehicles

✅ **Backend**
- Express middleware for efficient request handling
- MongoDB connection pooling via MongoClient
- CORS pre-flight caching

### Future Enhancements
- Add pagination for datasets >200 items
- Implement database indexes on frequently queried fields
- Add caching layer (Redis) for frequently accessed data
- Implement read replicas for high-traffic scenarios

---

## Testing

Currently no automated tests. Recommended additions for production:

**Frontend:** Jest + React Testing Library
```bash
npm install --save-dev jest @testing-library/react
```

**Backend:** Mocha + Chai
```bash
npm install --save-dev mocha chai supertest
```

Example test:
```javascript
describe('POST /api/cars', () => {
  it('should create a new car', (done) => {
    chai.request(app)
      .post('/api/cars')
      .send({ owner_name: 'Test', make: 'Toyota', model: 'Camry', year: 2024, color: 'Red', status: 'ACTIVE' })
      .end((err, res) => {
        res.should.have.status(201);
        done();
      });
  });
});
```

---

## Deployment

### Deploy Frontend (Render)
1. Connect GitHub repo to Render
2. Set build command: `cd frontend && npm run build`
3. Set publish directory: `frontend/dist`
4. Add env: `VITE_API_URL=https://your-backend-url.onrender.com`

### Deploy Backend (Render)
1. Create new Web Service on Render
2. Set start command: `npm start`
3. Add environment variables: `MONGODB_URL`, `DB_NAME`, `PORT`
4. Deploy and get backend URL

---

## Security Considerations

⚠️ **Current State (Development)**
- CORS open to all origins (fine for learning)
- No authentication/authorization
- Env variables are Git-ignored (good)

🔒 **For Production**
- Add user authentication (JWT or OAuth)
- Restrict CORS to specific domains
- Implement rate limiting on API endpoints
- Add input sanitization to prevent MongoDB injection
- Use HTTPS only
- Add request validation middleware

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URL` | ✅ | MongoDB connection string |
| `DB_NAME` | ✅ | Database name in MongoDB |
| `PORT` | ❌ | Server port (default: 3000) |
| `VITE_API_URL` | ❌ | Frontend API base URL (default: http://localhost:3000) |
| `TRIGGER_WEBHOOK_SECRET` | ❌ | Optional webhook secret for audit logs |

---

## Troubleshooting

**Issue:** "Missing MONGODB_URL"
- **Solution:** Ensure .env file is created and contains valid MongoDB connection string

**Issue:** Frontend can't reach backend API
- **Solution:** Check VITE_API_URL matches backend URL; ensure CORS is enabled

**Issue:** Vehicles not appearing after add
- **Solution:** Check browser console for errors; verify MongoDB credentials are correct

**Issue:** "Cannot DELETE /api/cars/:id" returns 404
- **Solution:** Ensure the vehicle ID exists; use a valid MongoDB ObjectId

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/cool-feature`)
3. Commit changes (`git commit -m 'Add cool feature'`)
4. Push to branch (`git push origin feature/cool-feature`)
5. Open a Pull Request

---

## License

This project is open source under the MIT License. See LICENSE file for details.

---

## Author

Built by [Your Name] – [Your GitHub Profile](https://github.com/yourusername)

Feedback & improvements welcome! Open an issue or reach out directly.

---

## Acknowledgments

- MongoDB for flexible data storage
- Render for seamless cloud deployment
- React community for excellent documentation
- Inspiration from modern fleet management systems

---

**Last Updated:** March 2026

