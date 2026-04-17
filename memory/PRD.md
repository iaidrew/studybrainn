# StudyBrain — PRD

## Original Problem Statement
StudyBrain — System Blueprint. Core idea: An AI tutor with persistent learning memory + adaptive teaching + continuity. Not just chat → learning lifecycle engine. Architecture: User → Chat Interface → AI Tutor Engine (LLM) → Hindsight Memory Layer → Learning Intelligence Layer → Adaptive Response.

## User Choices
- LLM: any → **Claude Sonnet 4.5** via Emergent Universal LLM Key
- Auth: **email/password (JWT)** + **Emergent Managed Google OAuth**
- Design: agent-chosen **Swiss / high-contrast brutalist** (off-white, Klein Blue #002FA7, Highlighter Yellow #EEFF00, hard black 1px borders, Outfit / IBM Plex Sans / JetBrains Mono)

## User Persona
Self-directed learners (students, autodidacts, professionals) who want a tutor that accumulates knowledge of *their* learning state across sessions — not a stateless chatbot.

## Architecture
- Backend: FastAPI + Motor (MongoDB) + emergentintegrations (Claude Sonnet 4.5)
- Frontend: React 19 + React Router 7 + Tailwind + shadcn/ui primitives + Sonner toasts
- Auth dual path: JWT (Bearer) for email/password; cookie session_token for Google OAuth
- Hindsight memory: post-chat JSON extraction call that merges concept mastery (EMA), mistakes, strengths, running summary into per-topic memory doc

## Core Requirements (static)
1. Persistent per-topic memory (concepts with 0–100 mastery, mistakes, strengths, summary)
2. Adaptive chat: memory injected into system prompt every turn
3. Topic organization + dashboard with aggregated stats
4. Adaptive quiz mode (focuses on weak concepts)
5. Both auth paths

## Implemented (2026-02-17) — MVP v1
### Backend (`/app/backend/server.py`)
- Auth: `/api/auth/register`, `/login`, `/session` (Google OAuth), `/me`, `/logout`
- Topics: CRUD at `/api/topics` + `/api/topics/{id}`
- Chat: `/api/topics/{id}/chat` → tutor reply + memory merge
- Memory: `/api/topics/{id}/memory`, `/messages`
- Quiz: `/api/topics/{id}/quiz` + `/api/quiz/answer`
- Dashboard: `/api/dashboard`
- All routes return MongoDB docs with `_id` excluded

### Frontend (`/app/frontend/src/`)
- Landing (`Landing.jsx`) — hero with "memory.log" live card + 4-layer architecture grid
- Signup/Login (`Signup.jsx`, `Login.jsx`) — email/password + "Continue with Google"
- AuthCallback (`AuthCallback.jsx`) — Emergent OAuth handshake
- Dashboard (`Dashboard.jsx`) — stats row, topics grid, weak spots panel, new-topic modal
- Topic (`Topic.jsx`) — chat + live memory sidebar (concepts/mistakes/strengths/summary)
- Quiz (`Quiz.jsx`) — sequential 5-question MCQ with instant feedback + final score screen

## What's tested
- Backend: 20/20 passing (auth, topics, chat w/ live Claude Sonnet 4.5, memory, quiz, dashboard, authorization isolation)
- Frontend: 100% flows — landing, signup/login, dashboard, topic creation, chat, memory update, quiz, logout, protected routes

## Prioritized Backlog
### P0
- (none blocking MVP)

### P1
- Streaming chat responses (currently full response)
- Persist topic-level session summaries on demand (“Summarize my session”)
- Mark mistakes resolved when re-asked correctly later
- Export memory as PDF / printable study guide

### P2
- Spaced-repetition scheduler (resurface concepts at optimal intervals)
- Voice input / audio explanations
- Social — shareable topic "maps"
- Import syllabus / PDF to auto-generate topics

## Tech Debt / Future Care
- Memory extraction is a second LLM call per turn; cache or batch for cost
- No rate limiting yet
- Quiz generation should re-use last quiz state if mid-session
