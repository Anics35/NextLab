# NexLab Phase 1 Frontend API Contract

Base URL:

```txt
http://localhost:5001
```

Use `Content-Type: application/json` for all `POST` requests.

After login/register, protected APIs require:

```txt
Authorization: Bearer YOUR_TOKEN
```

## Response Rules

Success:

```json
{
  "success": true
}
```

Error:

```json
{
  "success": false,
  "code": "MISSING_FIELDS",
  "error": "code and language are required"
}
```

Frontend should show `error` to the user and may use `code` for custom UI states.

## Health

`GET /health`

```json
{
  "status": "ok",
  "service": "nexlab-backend"
}
```

Use this for connection check.

## Auth

`POST /auth/register`

Student:

```json
{
  "name": "Dimpal Gogoi",
  "email": "dimpal@example.com",
  "password": "password123",
  "role": "student"
}
```

Teacher:

```json
{
  "name": "Teacher",
  "email": "teacher@example.com",
  "password": "password123",
  "role": "teacher"
}
```

`POST /auth/login`

```json
{
  "email": "dimpal@example.com",
  "password": "password123"
}
```

Success:

```json
{
  "success": true,
  "token": "eyJ...",
  "user": {
    "id": "662...",
    "name": "Dimpal Gogoi",
    "email": "dimpal@example.com",
    "role": "student"
  }
}
```

`GET /auth/me`

Requires bearer token and returns the logged-in user.

## Languages

`GET /languages`

```json
{
  "success": true,
  "languages": [
    { "name": "javascript", "id": 63 },
    { "name": "python", "id": 71 },
    { "name": "java", "id": 62 },
    { "name": "cpp", "id": 54 },
    { "name": "c", "id": 50 }
  ]
}
```

Recommended dropdown values: `python`, `javascript`, `java`, `cpp`, `c`.

## Problems

`GET /problems`

Requires token. Students and teachers can access.

```json
{
  "success": true,
  "count": 1,
  "problems": [
    {
      "_id": "662...",
      "title": "Sum Two Numbers",
      "description": "Read two integers and print their sum.",
      "difficulty": "easy",
      "createdAt": "2026-04-27T..."
    }
  ]
}
```

Empty state:

```json
{
  "success": true,
  "count": 0,
  "problems": []
}
```

`GET /problems/:id`

Returns the full problem with test cases. Use this on the coding page.

## Create Problem

`POST /problems`

Requires teacher token.

```json
{
  "title": "Sum Two Numbers",
  "description": "Read two integers and print their sum.",
  "difficulty": "easy",
  "testCases": [
    {
      "input": "2 3",
      "expectedOutput": "5"
    }
  ]
}
```

Edge cases:

- missing `title`, `description`, or test cases: `MISSING_FIELDS`
- missing `expectedOutput`: `INVALID_TEST_CASE`
- invalid difficulty: `VALIDATION_ERROR`

## Run Code

`POST /run`

Requires student token. Do not send `studentId`; backend uses the logged-in user.

```json
{
  "language": "python",
  "code": "a,b=map(int,input().split())\nprint(a+b)",
  "input": "2 3"
}
```

Success:

```json
{
  "success": true,
  "output": "5\n",
  "error": "",
  "status": {
    "id": 3,
    "description": "Accepted"
  }
}
```

Compile/runtime error still returns `success: true`; show `error` in the output panel.

Edge cases:

- missing code/language: `MISSING_FIELDS`
- unsupported language: `UNSUPPORTED_LANGUAGE`
- code too long: `CODE_TOO_LARGE`
- input too long: `INPUT_TOO_LARGE`
- Judge0 key issue: `JUDGE0_AUTH_FAILED` or `JUDGE0_FORBIDDEN`

## Submit Code

`POST /submit`

Requires student token. Do not send `studentId`; backend uses the logged-in user.

```json
{
  "problemId": "PASTE_PROBLEM_ID",
  "language": "python",
  "code": "a,b=map(int,input().split())\nprint(a+b)"
}
```

Success:

```json
{
  "success": true,
  "submissionId": "662...",
  "total": 2,
  "passed": 2,
  "failed": 0,
  "details": [
    {
      "input": "2 3",
      "expectedOutput": "5",
      "actualOutput": "5\n",
      "passed": true,
      "error": ""
    }
  ]
}
```

Edge cases:

- invalid `problemId`: `INVALID_PROBLEM_ID`
- deleted/missing problem: `PROBLEM_NOT_FOUND`
- failed test case: `success: true`, but `passed: false` inside `details`

## Teacher Dashboard

`GET /submissions?limit=50`

Requires teacher token.

Optional filters:

```txt
GET /submissions?studentId=dimpal
GET /submissions?problemId=PASTE_PROBLEM_ID
```

Note: `studentId` means the logged-in student's user id from auth, not the student's display name.

`GET /activity?limit=100`

Requires teacher token.

Optional filters:

```txt
GET /activity?studentId=dimpal
GET /activity?type=tab_switch
GET /activity?severity=warning
```

Note: `studentId` means the logged-in student's user id from auth, not the student's display name.

## Socket.IO

Connect to the same backend URL.

```js
const socket = io("http://localhost:5001", {
  auth: { token }
});
```

Frontend emits:

```js
socket.emit("run_clicked", { problemId });
socket.emit("submit_clicked", { problemId });
socket.emit("tab_switch", { problemId });
socket.emit("heartbeat", { problemId });
```

Backend emits:

```js
socket.on("student_update", handleEvent);
socket.on("alert_event", handleAlert);
socket.on("submission_event", handleSubmissionEvent);
```

Monitoring rules:

- 8 or more runs in 1 minute: warning
- 3 or more tab switches in 5 minutes: warning
- heartbeat gap over 45 seconds: warning
