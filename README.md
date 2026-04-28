# 🚀 NextLab - Remote Code Execution Platform

A full-stack **Remote Code Execution (RCE) Platform** with real-time monitoring, role-based access, and an integrated online IDE for students and teachers.

---

## 🧠 Overview

NextLab is designed to simulate a real-world coding platform where:

- Students can solve coding problems in an IDE
- Teachers can create problems and monitor activity
- Code is executed remotely using Judge0 API
- Real-time tracking ensures transparency and control

---

## 🖥️ Backend Architecture (The Engine)

### 1. Database Layer (MongoDB & Mongoose)

- **User Model**
  - Authentication with roles: `student`, `teacher`

- **Problem Model**
  - Fields: `title`, `description`, `difficulty`
  - **Test Cases**
    - `input`
    - `expectedOutput`
    - `isPublic` (controls visibility)

- **Submission Model**
  - Stores:
    - Code
    - Language
    - Score (passed/total)

- **Activity/Log Model**
  - Tracks:
    - Heartbeats
    - Tab switches
    - Student activity

---

### 2. Business Logic (Controllers & Routes)

- **Auth Controller**
  - JWT-based authentication

- **Problem Controller**
  - `createProblem`
    - Validates input
    - Handles test case visibility
  - `listProblems`
    - Uses `.select()` for optimized data transfer

- **Code Execution Controller**
  - Integrates with **Judge0 (RapidAPI)**
  - Executes code against:
    - Public + Hidden test cases
  - Calculates final verdict

---

### 3. Real-time Layer (Socket.io)

- Persistent connection between client & server
- Enables:
  - Live activity tracking
  - Instant updates to teacher dashboard

---

## 🎨 Frontend Architecture (The IDE)

### 1. Authentication & State

- Uses `localStorage` for persistence
- Lazy initialization with `useState`
- Role-based routing:
  - Student → IDE
  - Teacher → Dashboard

---

### 2. Student IDE (Triple Panel Layout)

- **Left Panel (Problem Brief)**
  - Displays problem statement
  - Shows only `isPublic: true` test cases

- **Center Panel (Code Editor)**
  - Monaco Editor (VS Code engine)
  - Supports:
    - C++
    - Python
    - Java
    - JavaScript

- **Right Panel (Console)**
  - Custom STDIN input
  - Output display
  - Verdict card (pass/fail summary)

---

### 3. Teacher Dashboard (Command Center)

- **Problem Creator**
  - Dynamic test case builder
  - Public/Hidden toggle

- **Live Monitoring**
  - Real-time student activity logs

- **Analytics**
  - All submissions overview
  - Language usage
  - Timestamps

---

## 🔄 Code Submission Flow

1. Student writes code and clicks **Submit**
2. Frontend sends:
   - `code`
   - `languageID`
   - `problemID`
3. Backend fetches hidden test cases
4. Backend sends request to **Judge0 API**
5. Judge0 compiles & executes code
6. Backend:
   - Stores result in DB
   - Emits event via WebSocket
7. Student sees final verdict (e.g., `5/5 Passed`)

---

## ✨ Design Philosophy

- **Modern UI**
  - Obsidian dark theme (`#050505`)
  - Glassmorphism design
  - Inter font

- **Resilient System**
  - Defensive programming
  - Optional chaining
  - Safe data handling
  - Prevents crashes on slow/unstable networks

---

## 🛠️ Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.io

### Frontend
- React.js
- Monaco Editor
- Tailwind CSS

### External Services
- Judge0 API (via RapidAPI)

---

## ⚙️ Setup Instructions

### 1. Clone Repository
```bash
git clone https://github.com/Anics35/NextLab.git
cd NextLab
