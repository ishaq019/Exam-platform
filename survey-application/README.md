# Survey Application - Public Mode

This Survey application is designed to work as a separate MERN app with the generated Quiz application.

It does not require login, registration, JWT, role authorization, or protected routes.

## Ports

- Survey Backend: http://localhost:5001
- Survey Frontend: http://localhost:5174

## Backend Setup

Create `backend/.env`:

```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/quiz_exam_management
CLIENT_URL=http://localhost:5174
SURVEY_CLIENT_URL=http://localhost:5174
QUIZ_CLIENT_URL=http://localhost:5173
```

Run:

```bash
cd backend
npm install
npm run dev
```

## Frontend Setup

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5001/api
VITE_QUIZ_APP_URL=http://localhost:5173
```

Run:

```bash
cd frontend
npm install
npm run dev
```

## Integration Links

Open survey manager from Quiz app:

```txt
http://localhost:5174/admin/exams/<examId>/survey-templates?returnUrl=http://localhost:5173/admin/exams
```

Open pre-exam survey:

```txt
http://localhost:5174/student/exams/<examId>/before-survey?returnUrl=http://localhost:5173/student/exams/<examId>/attempt&participantId=<studentId>
```

Open post-exam survey:

```txt
http://localhost:5174/student/exams/<examId>/after-survey?returnUrl=http://localhost:5173/result&participantId=<studentId>
```

`participantId` is optional. If Quiz app does not pass it, Survey frontend creates one locally.
