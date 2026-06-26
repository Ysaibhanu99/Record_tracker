# Record Tracker 📚

**🚀 Live Website:** [https://record-tracker-sg8d.onrender.com/](https://record-tracker-sg8d.onrender.com/)

Record Tracker is a powerful, Flask-based web application designed to help teachers and administrators efficiently track whether students have bought and submitted their academic records.

## ✨ Features

- **📊 Interactive Dashboard:** Get a bird's-eye view of your school's or class's progress with visual cards and dynamic bar charts powered by Chart.js.
- **⚡ Optimistic UI:** The interface is built for speed. Checking off students instantly updates the interface without needing to reload the page, thanks to optimistic UI rendering.
- **📥 Bulk Uploads:** Easily add hundreds of students at once by dragging and dropping `.csv` or `.xlsx` files. The database checks for duplicates automatically in a single bulk query.
- **✅ Bulk Actions:** Select multiple students at once to mark their records as "Bought" or "Submitted" simultaneously, saving valuable time.
- **🔄 Class Reset:** Need to reuse a class list for a new semester? Instantly wipe all tracking data for a specific class with the click of a button.
- **🔍 Fast DB-Level Search & Pagination:** Search through thousands of records instantly. The backend utilizes PostgreSQL bulk searching and pagination (50 items per page) so your browser never freezes up.
- **🕒 Timestamps:** The system automatically logs the exact date and time a record status is updated.
- **📝 Remarks & Notes:** Keep specific notes on individual students (e.g., "Lost original record", "Absent") directly in the tracking table.
- **📤 Export to CSV:** Search, filter, and instantly download specific lists of students as a `.csv` file.

## 🛠️ Technology Stack

- **Backend:** Python, Flask
- **Database:** PostgreSQL (Compatible with Neon), SQLAlchemy (ORM)
- **Frontend:** HTML5, Vanilla CSS, Vanilla JavaScript
- **Data Processing:** Pandas (for parsing uploaded Excel/CSV files)
- **Charting:** Chart.js
- **Hosting:** Render (Web Service via `render.yaml`)

## 🚀 Getting Started

### Prerequisites
Make sure you have Python installed. You will also need a PostgreSQL database URL (e.g., from [Neon.tech](https://neon.tech)).

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Ysaibhanu99/Record_tracker.git
   cd Record_tracker
   ```

2. **Create a virtual environment (optional but recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. **Install the dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Setup:**
   Create a `.env` file in the root directory and add your database URL:
   ```env
   DATABASE_URL=postgresql://user:password@hostname/dbname
   ```

5. **Initialize the Database:**
   Run the following script to create the necessary tables in your database:
   ```bash
   python reset_db.py
   ```
   *(Note: This drops existing tables and recreates them. Use with caution!)*

6. **Run the application Locally:**
   ```bash
   python app.py
   ```
   The application will be running at `http://127.0.0.1:5000`.

## ☁️ Deployment (Render)

This project is configured to be instantly deployed on **Render** using the provided `.python-version` and `render.yaml` configuration files.
1. Create a Blueprint in Render.
2. Link this repository.
3. Supply your `DATABASE_URL` when prompted.

## 📂 Project Structure

- `app.py` - The main Flask application containing all API endpoints and routing logic.
- `db.py` - Database configuration, SQLAlchemy engine setup, and the `Student` schema definition.
- `reset_db.py` - A utility script to quickly drop and recreate the database schema.
- `render.yaml` & `.python-version` - Infrastructure configuration for deploying to Render.
- `templates/index.html` - The single-page application frontend.
- `static/css/styles.css` - Custom styling and UI design logic.
- `static/js/script.js` - Frontend logic for handling API requests, UI toggles, and Chart.js rendering.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Ysaibhanu99/Record_tracker/issues).
