<div align="center">

# 🏋️‍♂️ Home Workout Planner — Backend API

**A powerful RESTful API for managing workouts, nutrition, performance tracking, and push notifications.**

[![Node.js](https://img.shields.io/badge/Node.js-v24-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v5-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Admin_SDK-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)

🌍 **Live API:** [https://home-workout-planner.onrender.com](https://home-workout-planner.onrender.com)

</div>

---

## 📖 Overview

The Home Workout Planner Backend is a RESTful API built with **Node.js** and **Express v5**.  
It handles authentication, workout scheduling, performance tracking, reminders, and nutrition planning — all powered by **Supabase (PostgreSQL)** and secured with **JWT + bcrypt**.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js |
| **Framework** | Express.js v5 |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | JWT (jsonwebtoken) + bcrypt |
| **Notifications** | Firebase Admin SDK |
| **Scheduler** | node-cron |
| **Config** | dotenv |
| **CORS** | cors |

---

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/G-Kangutkar/Home-Workout-Planner.git
cd Home-Workout-Planner
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret_key
FIREBASE_SERVICE_ACCOUNT=your_firebase_config_json
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-backend.onrender.com/api/calendar/callback
FRONTEND_URL=https://home-workout-planner.vercel.app
```

### 4. Start the Development Server

```bash
npm run dev
```

> Server runs at `http://localhost:5000`

---

## 📡 API Reference

**Base URL:** `http://localhost:5000`  
**Production:** `https://home-workout-planner.onrender.com`

> 🔒 Routes marked as **Protected** require `Authorization: Bearer <JWT_TOKEN>` header.

---

### 🔐 Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/register/signup` | Register a new user | Public |
| `POST` | `/register/login` | Login and receive JWT | Public |
| `GET` | `/api/profile/` | Get user profile | 🔒 Protected |
| `POST` | `/api/profile/add` | Create or update profile | 🔒 Protected |

---

### 💪 Exercises

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/workout/exercises` | Get full exercise library | Public |

---

### 📋 Workout Plans

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/workout/generate` | Generate a new workout plan | 🔒 Protected |
| `GET` | `/api/workout/plan` | Get active workout plan | 🔒 Protected |
| `PUT` | `/api/workout/plan/:id` | Rename workout plan | 🔒 Protected |

---

### 🔄 Day Exercise Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `PUT` | `/api/workout/day-exercise/:id` | Swap an exercise | 🔒 Protected |
| `POST` | `/api/workout/day/:dayId/exercise` | Add exercise to a day | 🔒 Protected |
| `DELETE` | `/api/workout/day-exercise/:id` | Remove exercise from a day | 🔒 Protected |

---

### 📅 Workout Logging

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/workout/log-workout` | Log a completed workout | 🔒 Protected |
| `GET` | `/api/workout/check-logged/:dayId` | Check if a day is logged | 🔒 Protected |

---

### 📊 Performance

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/performance/stats?period=30days` | Get stats for charts | 🔒 Protected |
| `GET` | `/performance/history?limit=20&offset=0` | Paginated workout history | 🔒 Protected |

---

### 🥗 Nutrition

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/nutrition-plan` | Get personalized nutrition plan | 🔒 Protected |

---

### 🔔 Reminders & Notifications

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/set-reminder` | Set a workout reminder | 🔒 Protected |
| `POST` | `/api/save-token` | Save Firebase FCM token | 🔒 Protected |

---

### 🧘 Recovery & Intensity

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/recovery/:goal` | Get recovery guide by goal | 🔒 Protected |
| `POST` | `/api/adapt-intensity` | Adapt workout intensity | 🔒 Protected |

---
### Calendar Routes — `/api/calendar`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/calendar/auth-url` | Returns Google OAuth URL to initiate connection | 🔒 Protected |
| GET | `/api/calendar/callback` | OAuth callback — saves tokens and redirects to frontend | 🔒 Protected |
| POST | `/api/calendar/sync` | Creates Google Calendar events for full week plan + meals | 🔒 Protected |
| GET | `/api/calendar/status` | Returns connection status and time preferences | 🔒 Protected |
| PUT | `/api/calendar/preferences` | Update preferred workout and meal prep times | 🔒 Protected |
| DELETE | `/api/calendar/disconnect` | Revokes calendar access and clears tokens | 🔒 Protected |
---

## 💡 Example Requests

### Register a User

```http
POST /register/signup
Content-Type: application/json

{
  "name": "Alex",
  "email": "alex@example.com",
  "password": "securepassword"
}
```

### Login

```http
POST /register/login
Content-Type: application/json

{
  "email": "alex@example.com",
  "password": "securepassword"
}
```

### Protected Request

```http
GET /api/profile
Authorization: Bearer <your_jwt_token>
```

---

## 🗄️ Database Schema

The backend uses **PostgreSQL via Supabase**. Below are the core tables.

<details>
<summary><b>👤 users</b> — Authentication details</summary>

```sql
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
</details>

<details>
<summary><b>🧍 profile</b> — Fitness profile per user</summary>

```sql
CREATE TABLE IF NOT EXISTS profile (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  weight           INT NOT NULL,
  height           INT NOT NULL,
  fitness_goal     fitness_goal_enum DEFAULT 'general_fitness',
  activity_level   activity_level_enum DEFAULT 'beginner',
  workout_duration INT NOT NULL,
  fcm_token        TEXT,
  preferred_workout_time  time    DEFAULT '07:00:00',
    preferred_meal_time     time    DEFAULT '08:00:00',
   google_access_token     text,
   google_refresh_token    text,
   calendar_sync_enabled   boolean DEFAULT false;
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
```
</details>

<details>
<summary><b>💪 exercises</b> — Full exercise library</summary>

```sql
CREATE TABLE IF NOT EXISTS exercises (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  description      TEXT,
  instructions     TEXT,
  muscle_group     muscle_group_enum NOT NULL,
  difficulty       difficulty_enum NOT NULL,
  default_sets     INT DEFAULT 3,
  default_reps     TEXT DEFAULT '10',
  duration_seconds INT,
  is_equipment     BOOLEAN DEFAULT false,
  tags             TEXT[],
  video_url        TEXT,
  met_value        NUMERIC,
  created_at       TIMESTAMPTZ DEFAULT now()
);
```
</details>

<details>
<summary><b>📋 workout_plans</b> — Generated plans per user</summary>

```sql
CREATE TABLE IF NOT EXISTS workout_plans (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name                      TEXT NOT NULL DEFAULT 'My Workout Plan',
  goal                      fitness_goal_enum NOT NULL,
  is_active                 BOOLEAN DEFAULT true,
  estimated_weekly_calories INT DEFAULT 0,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);
```
</details>

<details>
<summary><b>🔔 reminders</b> — Scheduled workout reminders</summary>

```sql
CREATE TABLE IF NOT EXISTS reminders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  remind_time TIME NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  sent_today  BOOLEAN DEFAULT false,
  last_sent   DATE,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```
</details>

---

### 🔗 Table Relationships

```
users ──────── profile          (1:1)
users ──────── workout_plans    (1:N)
users ──────── reminders        (1:N)
users ──────── workout_sessions (1:N)
exercises ───── plan_day_exercises (N:M via workout_plan_days)
```

---

## 🔐 Authentication Flow

```
1. POST /register/signup  →  Password hashed with bcrypt
2. POST /register/login   →  JWT token generated & returned
3. Frontend stores token  →  Sent as Authorization header
4. Middleware validates   →  Protected routes check JWT on every request
```

---

## 📁 Project Structure

```
src/
 ├── config/          # Supabase & Firebase config
 ├── controllers/     # Route handler logic
 ├── middleware/      # JWT auth middleware
 ├── routes/          # Express route definitions
 ├── utils/           # JWT helpers, calorie calculators
 └── cron/            # node-cron reminder jobs
```

---

<div align="center">

Built with ❤️ using Node.js & Supabase

</div>
