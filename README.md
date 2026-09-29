# BikeRental Full-Stack Stable

This version keeps the BikeRental admin frontend and connects it to a FastAPI + SQLAlchemy database backend.

## Start

1. Extract this ZIP into a new folder.
2. Double-click `run_backend.bat`.
3. Wait until it says **Backend is ready**.
4. The browser opens automatically at `http://127.0.0.1:8000`.

Do **not** open `frontend/index.html` with Live Server for the full-stack flow.

## Demo login

- Email: `admin@bikerental.com`
- Password: `Admin@123`

## Database

SQLite is used by default at `backend/data/bikerental.db`.
The application automatically creates the tables and repairs missing demo bikes when it starts.

For a clean reset, close the backend and run `backend/reset_database.bat`, then start `run_backend.bat` again.

## Booking flow

Login -> Bookings -> Select an Available Bike -> Date -> Hours -> Pickup Location -> Confirm Booking -> Payment -> Complete Payment.

Booking and payment records are saved in the database.

## Notifications

Notifications are loaded from the database and display an exact date/time (not `2 min ago` style relative time).

## API docs

`http://127.0.0.1:8000/api/docs`
