# CodeArena — Coding Platform (React + Django + MySQL)

A full-stack coding practice platform with three roles:

- **Admin** — approves/rejects faculty signup requests, manages (views/removes) all students & faculty.
- **Faculty** — must sign up and be **approved by an admin** before they can log in. Once approved, they create coding questions (with test cases) that appear on the student dashboard.
- **Student** — signs up directly and can log in immediately. Solves questions by writing code **directly in the browser** and submitting it — no file upload/download needed. Code is executed on the server against test cases and a verdict (Accepted / Wrong Answer / Error) is returned instantly.

---

## 1. Project Structure

```
codeplatform/
├── backend/            Django REST API
│   ├── codeplatform/    project settings/urls
│   ├── accounts/        custom User model, auth, admin approval logic
│   ├── questions/       question + test case models/views
│   ├── submissions/     code execution engine + submission history
│   ├── requirements.txt
│   └── manage.py
└── frontend/            React app
    ├── src/
    │   ├── api/          axios instance (backend URL configured here)
    │   ├── context/       auth context (JWT storage)
    │   ├── components/    Navbar, ProtectedRoute, CodeEditor
    │   ├── pages/         Home, Login, Signup, Admin/Faculty/Student dashboards
    │   └── styles/        global CSS theme
    └── package.json
```

---

## 2. WHERE TO CHANGE THE DATABASE USERNAME & PASSWORD

Open **`backend/codeplatform/settings.py`** and find the `DATABASES` section
(clearly marked with comments). Replace `USER` and `PASSWORD` with your own
MySQL credentials:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'codeplatform_db',       # <-- your database name
        'USER': 'root',                  # <-- CHANGE: your MySQL username
        'PASSWORD': 'password',          # <-- CHANGE: your MySQL password
        'HOST': 'localhost',
        'PORT': '3306',
        'OPTIONS': {'charset': 'utf8mb4'},
    }
}
```

Before running the server, create the database in MySQL:

```sql
CREATE DATABASE codeplatform_db CHARACTER SET utf8mb4;
```

---

## 3. Backend Setup (Django)

Requires Python 3.10+ and MySQL Server installed and running.

```bash
cd backend

# create & activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# install dependencies
pip install -r requirements.txt

# (edit settings.py DB credentials as described above, then:)

# create tables
python manage.py makemigrations
python manage.py migrate

# create your Admin account (any Django superuser = Admin on this platform)
python manage.py createsuperuser

# run the server
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`.

> Note on `mysqlclient`: on Linux you may need `sudo apt install default-libmysqlclient-dev build-essential pkg-config` before `pip install` succeeds. On Mac: `brew install mysql pkg-config`.

### Code execution requirements
- Python submissions run using the `python3` executable already on your system (no extra setup).
- C++ submissions are compiled with `g++`. Install a C++ toolchain if you want to support it (e.g. `sudo apt install g++`), otherwise just don't select C++ in the UI.

---

## 4. Frontend Setup (React)

Requires Node.js 18+.

```bash
cd frontend
npm install
npm start
```

The app opens at `http://localhost:3000`.

If your Django backend runs on a different host/port, update the `BASE_URL`
constant at the top of **`frontend/src/api/axios.js`**.

---

## 5. How the roles work

1. **Admin**: created via `python manage.py createsuperuser` (any superuser is auto-treated as `role='admin'`). Log in from the "Admin" tab on the login page.
2. **Faculty**: sign up from the "Sign up as Faculty" page. The account is created with `is_approved=False` and **cannot log in** until the Admin approves it from the Admin Dashboard → "Pending Faculty" tab.
3. **Student**: sign up from "Sign up as Student" — account is active immediately, no approval needed.

Faculty (once approved) can create questions with a title, description, difficulty, sample input/output, and one or more test cases (each test case can be marked hidden or visible). Students see all published questions on their dashboard, open a question, write code in the in-browser editor (Python or C++), and click **Submit Code**. The backend runs the code against every test case and returns Accepted / Wrong Answer / Error with the number of test cases passed — all without leaving the browser.

---

## 6. Security & production notes

This project is built for a college/learning-project scope. Before deploying it publicly, you should:
- Change `SECRET_KEY` in `settings.py` and set `DEBUG = False`.
- Restrict `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`.
- Run submitted code inside a proper sandbox (Docker container / gVisor / seccomp + resource limits) instead of a plain subprocess, since arbitrary code execution is inherently risky.
- Use environment variables (e.g. `python-decouple` or `django-environ`, already listed in requirements.txt) instead of hardcoding DB credentials in `settings.py`.
