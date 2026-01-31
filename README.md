# EPFO Recovery Soft

A comprehensive web-based application for managing Employee Provident Fund Organization (EPFO) recovery cases.

## Project Structure

```
epfo-recovery-soft/
├── backend/          # Node.js/Express backend API
├── frontend/         # React frontend application
└── README.md         # This file
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your MongoDB connection string:
   ```
   MONGODB_URI=mongodb://localhost:27017/epfo-recovery
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The backend API will be available at `http://localhost:5000`

### Frontend Setup

*Frontend setup will be added in a later phase.*

## Development Status

### Phase 0: Foundation ✅
- [x] Backend project skeleton
- [x] Express configuration
- [x] MongoDB connection setup
- [x] Error handling middleware
- [x] Basic routing structure

### Phase 1: Coming Soon
- Authentication module
- EPFO business logic
- Frontend application

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

## Technology Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- dotenv for environment configuration

### Frontend
- *To be added*

## License

ISC

