"""StudyBrain — AI tutor with persistent hindsight memory.

Backend: FastAPI + MongoDB + emergentintegrations (Claude Sonnet 4.5).
"""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Cookie
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import uuid
import bcrypt
import jwt as pyjwt
import requests as http_requests
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta

from emergentintegrations.llm.chat import LlmChat, UserMessage

# ---------- Setup ----------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"

app = FastAPI(title="StudyBrain API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("studybrain")


# ---------- Models ----------
class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionIn(BaseModel):
    session_id: str


class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    auth_provider: str = "password"  # or "google"


class TopicIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: Optional[str] = ""
    level: Literal["beginner", "intermediate", "advanced"] = "beginner"


class Topic(BaseModel):
    topic_id: str
    user_id: str
    title: str
    description: str = ""
    level: str = "beginner"
    mastery: float = 0.0
    message_count: int = 0
    created_at: str
    last_active: str


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class ChatMessage(BaseModel):
    message_id: str
    topic_id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: str


class ConceptFact(BaseModel):
    name: str
    mastery: int  # 0-100
    last_seen: str
    note: Optional[str] = ""


class Mistake(BaseModel):
    concept: str
    description: str
    created_at: str
    resolved: bool = False


class TopicMemoryOut(BaseModel):
    topic_id: str
    concepts: List[ConceptFact] = []
    mistakes: List[Mistake] = []
    strengths: List[str] = []
    summary: str = ""


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_index: int
    concept: str
    explanation: str


class QuizGenerated(BaseModel):
    quiz_id: str
    topic_id: str
    questions: List[QuizQuestion]


class QuizAnswerIn(BaseModel):
    quiz_id: str
    question_index: int
    selected_index: int


# ---------- Auth helpers ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_jwt(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(request: Request) -> User:
    # Try session cookie first (Google OAuth), then Authorization bearer (JWT)
    token = request.cookies.get("session_token")
    if token:
        sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if sess:
            exp = sess.get("expires_at")
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp > datetime.now(timezone.utc):
                user_doc = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
                if user_doc:
                    return User(**user_doc)

    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        jwt_token = auth[7:]
        try:
            payload = pyjwt.decode(jwt_token, JWT_SECRET, algorithms=[JWT_ALGO])
            user_id = payload["sub"]
            user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
            if user_doc:
                return User(**user_doc)
        except Exception:
            pass

    raise HTTPException(status_code=401, detail="Not authenticated")


# ---------- Auth routes ----------
@api.post("/auth/register")
async def register(body: SignupIn):
    existing = await db.users.find_one({"email": body.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": body.email,
        "name": body.name,
        "picture": None,
        "auth_provider": "password",
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = make_jwt(user_id)
    return {
        "token": token,
        "user": {"user_id": user_id, "email": body.email, "name": body.name, "picture": None, "auth_provider": "password"},
    }


@api.post("/auth/login")
async def login(body: LoginIn):
    user_doc = await db.users.find_one({"email": body.email}, {"_id": 0})
    if not user_doc or not user_doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(body.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = make_jwt(user_doc["user_id"])
    return {
        "token": token,
        "user": {
            "user_id": user_doc["user_id"],
            "email": user_doc["email"],
            "name": user_doc["name"],
            "picture": user_doc.get("picture"),
            "auth_provider": user_doc.get("auth_provider", "password"),
        },
    }


@api.post("/auth/session")
async def google_session(body: GoogleSessionIn, response: Response):
    """Exchange Emergent OAuth session_id for session_token; create/update user."""
    resp = http_requests.get(
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
        headers={"X-Session-ID": body.session_id},
        timeout=10,
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid OAuth session")
    data = resp.json()
    email = data["email"]
    name = data.get("name", email.split("@")[0])
    picture = data.get("picture")
    session_token = data["session_token"]

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60,
    )
    return {
        "user": {"user_id": user_id, "email": email, "name": name, "picture": picture, "auth_provider": "google"},
    }


@api.get("/auth/me")
async def auth_me(user: User = Depends(get_current_user)):
    return user.model_dump()


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ---------- Topics ----------
@api.get("/topics")
async def list_topics(user: User = Depends(get_current_user)):
    docs = await db.topics.find({"user_id": user.user_id}, {"_id": 0}).sort("last_active", -1).to_list(500)
    return docs


@api.post("/topics")
async def create_topic(body: TopicIn, user: User = Depends(get_current_user)):
    topic_id = f"topic_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "topic_id": topic_id,
        "user_id": user.user_id,
        "title": body.title,
        "description": body.description or "",
        "level": body.level,
        "mastery": 0.0,
        "message_count": 0,
        "created_at": now,
        "last_active": now,
    }
    await db.topics.insert_one(doc)
    await db.topic_memory.insert_one({
        "topic_id": topic_id,
        "user_id": user.user_id,
        "concepts": [],
        "mistakes": [],
        "strengths": [],
        "summary": "",
    })
    doc.pop("_id", None)
    return doc


@api.get("/topics/{topic_id}")
async def get_topic(topic_id: str, user: User = Depends(get_current_user)):
    doc = await db.topics.find_one({"topic_id": topic_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Topic not found")
    return doc


@api.delete("/topics/{topic_id}")
async def delete_topic(topic_id: str, user: User = Depends(get_current_user)):
    res = await db.topics.delete_one({"topic_id": topic_id, "user_id": user.user_id})
    await db.chat_messages.delete_many({"topic_id": topic_id})
    await db.topic_memory.delete_many({"topic_id": topic_id})
    await db.quizzes.delete_many({"topic_id": topic_id})
    return {"deleted": res.deleted_count}


@api.get("/topics/{topic_id}/messages")
async def get_messages(topic_id: str, user: User = Depends(get_current_user)):
    topic = await db.topics.find_one({"topic_id": topic_id, "user_id": user.user_id}, {"_id": 0})
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    msgs = await db.chat_messages.find({"topic_id": topic_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return msgs


@api.get("/topics/{topic_id}/memory")
async def get_memory(topic_id: str, user: User = Depends(get_current_user)):
    topic = await db.topics.find_one({"topic_id": topic_id, "user_id": user.user_id}, {"_id": 0})
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    mem = await db.topic_memory.find_one({"topic_id": topic_id}, {"_id": 0})
    if not mem:
        mem = {"topic_id": topic_id, "concepts": [], "mistakes": [], "strengths": [], "summary": ""}
    return mem


# ---------- Chat (AI Tutor with Hindsight Memory) ----------
def build_tutor_system_prompt(topic: dict, memory: dict) -> str:
    concepts = memory.get("concepts", []) or []
    mistakes = memory.get("mistakes", []) or []
    strengths = memory.get("strengths", []) or []
    summary = memory.get("summary", "") or ""

    weak = [c for c in concepts if c.get("mastery", 0) < 50]
    strong = [c for c in concepts if c.get("mastery", 0) >= 75]

    mem_block = ""
    if summary:
        mem_block += f"\nPrevious session summary: {summary}\n"
    if strong:
        mem_block += f"Learner is strong in: {', '.join(c['name'] for c in strong[:6])}.\n"
    if weak:
        mem_block += f"Learner struggles with: {', '.join(c['name'] for c in weak[:6])}.\n"
    if mistakes:
        recent_mistakes = [m for m in mistakes if not m.get("resolved")][-5:]
        if recent_mistakes:
            mem_block += "Recent unresolved mistakes to circle back to:\n"
            for m in recent_mistakes:
                mem_block += f"- {m.get('concept','')}: {m.get('description','')}\n"
    if strengths:
        mem_block += f"Confirmed strengths: {', '.join(strengths[:5])}.\n"

    return (
        f"You are StudyBrain, an adaptive AI tutor specializing in '{topic['title']}' at {topic['level']} level.\n"
        f"Topic description: {topic.get('description','(none)')}\n\n"
        "TEACHING STYLE:\n"
        "- Be concise, clear, and encouraging.\n"
        "- Use the Socratic method when helpful: ask probing questions before giving full answers.\n"
        "- Build on what the learner already knows; scaffold from weak areas.\n"
        "- Revisit past mistakes naturally.\n"
        "- Use concrete examples and analogies.\n"
        "- Keep responses under 250 words unless depth is explicitly requested.\n\n"
        f"HINDSIGHT MEMORY (what you know about THIS learner on THIS topic):{mem_block or ' (none yet — this is the first interaction)'}\n"
    )


async def extract_memory_update(topic: dict, memory: dict, user_msg: str, assistant_msg: str) -> dict:
    """Ask a small LLM call to extract structured memory updates from the exchange."""
    session_id = f"mem_{uuid.uuid4().hex[:8]}"
    extractor = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=(
            "You are a learning-analytics extractor. Given a tutor-learner exchange, output ONLY valid JSON "
            "with this schema:\n"
            "{\n"
            "  \"concepts\": [{\"name\": str, \"mastery\": int (0-100), \"note\": str}],\n"
            "  \"mistakes\": [{\"concept\": str, \"description\": str}],\n"
            "  \"strengths\": [str],\n"
            "  \"summary_delta\": str\n"
            "}\n"
            "Rules: concepts = only ones directly engaged. mastery reflects what the LEARNER demonstrated. "
            "mistakes = factual errors the learner made. strengths = things learner clearly understood. "
            "summary_delta = one short sentence capturing what happened this turn. Output ONLY JSON, no prose."
        ),
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    prompt = (
        f"TOPIC: {topic['title']} ({topic['level']})\n\n"
        f"LEARNER: {user_msg}\n\n"
        f"TUTOR: {assistant_msg}\n\n"
        "Extract JSON now."
    )
    try:
        raw = await extractor.send_message(UserMessage(text=prompt))
        text = raw.strip()
        # Strip possible code fences
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
        parsed = json.loads(text)
        return parsed
    except Exception as e:
        logger.warning(f"Memory extraction failed: {e}")
        return {}


async def merge_memory(topic_id: str, current: dict, update: dict, user_msg: str) -> dict:
    concepts = {c["name"].lower(): c for c in (current.get("concepts") or [])}
    now = datetime.now(timezone.utc).isoformat()

    for c in (update.get("concepts") or []):
        key = (c.get("name") or "").lower().strip()
        if not key:
            continue
        prev = concepts.get(key)
        new_mastery = int(c.get("mastery", 0))
        if prev:
            # Exponential moving average
            merged_mastery = int(round(0.6 * prev["mastery"] + 0.4 * new_mastery))
            concepts[key] = {
                "name": c["name"],
                "mastery": max(0, min(100, merged_mastery)),
                "last_seen": now,
                "note": c.get("note", prev.get("note", "")),
            }
        else:
            concepts[key] = {
                "name": c["name"],
                "mastery": max(0, min(100, new_mastery)),
                "last_seen": now,
                "note": c.get("note", ""),
            }

    mistakes = list(current.get("mistakes") or [])
    for m in (update.get("mistakes") or []):
        mistakes.append({
            "concept": m.get("concept", ""),
            "description": m.get("description", ""),
            "created_at": now,
            "resolved": False,
        })

    strengths = list(set((current.get("strengths") or []) + (update.get("strengths") or [])))
    strengths = strengths[-10:]

    summary_delta = update.get("summary_delta", "").strip()
    old_summary = current.get("summary", "") or ""
    summary = (old_summary + " " + summary_delta).strip()[-800:]

    merged = {
        "topic_id": topic_id,
        "concepts": list(concepts.values()),
        "mistakes": mistakes[-30:],
        "strengths": strengths,
        "summary": summary,
    }

    await db.topic_memory.update_one(
        {"topic_id": topic_id},
        {"$set": {
            "concepts": merged["concepts"],
            "mistakes": merged["mistakes"],
            "strengths": merged["strengths"],
            "summary": merged["summary"],
        }},
        upsert=True,
    )

    # Update topic-level mastery (average)
    if merged["concepts"]:
        avg = sum(c["mastery"] for c in merged["concepts"]) / len(merged["concepts"])
    else:
        avg = 0.0
    await db.topics.update_one(
        {"topic_id": topic_id},
        {"$set": {"mastery": round(avg, 1), "last_active": now}, "$inc": {"message_count": 2}},
    )
    return merged


@api.post("/topics/{topic_id}/chat")
async def send_chat(topic_id: str, body: ChatIn, user: User = Depends(get_current_user)):
    topic = await db.topics.find_one({"topic_id": topic_id, "user_id": user.user_id}, {"_id": 0})
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    memory = await db.topic_memory.find_one({"topic_id": topic_id}, {"_id": 0}) or {}

    # Persist user message
    now = datetime.now(timezone.utc).isoformat()
    user_msg_doc = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "topic_id": topic_id,
        "role": "user",
        "content": body.message,
        "created_at": now,
    }
    await db.chat_messages.insert_one(dict(user_msg_doc))

    # Build adaptive system prompt with hindsight memory
    system_prompt = build_tutor_system_prompt(topic, memory)
    session_id = f"tutor_{topic_id}"
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_prompt,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    # Include recent message history for context
    history = await db.chat_messages.find(
        {"topic_id": topic_id}, {"_id": 0}
    ).sort("created_at", -1).limit(12).to_list(12)
    history.reverse()
    # Build a single user message that includes recent context
    context_lines = []
    for m in history[:-1]:  # exclude the just-inserted user msg
        role = "Learner" if m["role"] == "user" else "Tutor"
        context_lines.append(f"{role}: {m['content']}")
    context_lines.append(f"Learner: {body.message}")
    composed = "\n\n".join(context_lines) if len(context_lines) > 1 else body.message

    try:
        assistant_text = await chat.send_message(UserMessage(text=composed))
    except Exception as e:
        logger.error(f"LLM error: {e}")
        raise HTTPException(status_code=500, detail=f"Tutor LLM error: {str(e)}")

    assistant_doc = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "topic_id": topic_id,
        "role": "assistant",
        "content": assistant_text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.chat_messages.insert_one(dict(assistant_doc))

    # Extract + merge hindsight memory (async best-effort)
    update = await extract_memory_update(topic, memory, body.message, assistant_text)
    merged = await merge_memory(topic_id, memory, update, body.message)

    # Remove _id if any
    assistant_doc.pop("_id", None)
    user_msg_doc.pop("_id", None)
    merged.pop("_id", None)

    return {
        "user_message": user_msg_doc,
        "assistant_message": assistant_doc,
        "memory": merged,
    }


# ---------- Quiz ----------
@api.post("/topics/{topic_id}/quiz")
async def generate_quiz(topic_id: str, user: User = Depends(get_current_user)):
    topic = await db.topics.find_one({"topic_id": topic_id, "user_id": user.user_id}, {"_id": 0})
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    memory = await db.topic_memory.find_one({"topic_id": topic_id}, {"_id": 0}) or {}
    weak = [c["name"] for c in (memory.get("concepts") or []) if c.get("mastery", 0) < 60]
    focus = ", ".join(weak[:5]) if weak else "core fundamentals of the topic"

    session_id = f"quiz_{uuid.uuid4().hex[:8]}"
    quiz_llm = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=(
            "You are a quiz generator. Output ONLY valid JSON (no prose, no code fences) with schema:\n"
            "{\"questions\": [{\"question\": str, \"options\": [str, str, str, str], "
            "\"correct_index\": int (0-3), \"concept\": str, \"explanation\": str}]}\n"
            "Generate exactly 5 questions. Each question must have exactly 4 options."
        ),
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    prompt = (
        f"Topic: {topic['title']} ({topic['level']})\n"
        f"Description: {topic.get('description','')}\n"
        f"Focus especially on these weak areas: {focus}.\n"
        "Generate 5 multiple-choice questions in the JSON schema. JSON only."
    )
    raw = await quiz_llm.send_message(UserMessage(text=prompt))
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    try:
        parsed = json.loads(text)
        questions = parsed.get("questions", [])
    except Exception as e:
        logger.error(f"Quiz parse failed: {e}\nRaw: {raw[:500]}")
        raise HTTPException(status_code=500, detail="Quiz generation failed")

    quiz_id = f"quiz_{uuid.uuid4().hex[:12]}"
    doc = {
        "quiz_id": quiz_id,
        "topic_id": topic_id,
        "user_id": user.user_id,
        "questions": questions,
        "answers": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.quizzes.insert_one(dict(doc))
    doc.pop("_id", None)
    # Don't leak correct_index to the client on initial load
    public_questions = [
        {"question": q["question"], "options": q["options"], "concept": q.get("concept", "")}
        for q in questions
    ]
    return {"quiz_id": quiz_id, "topic_id": topic_id, "questions": public_questions}


@api.post("/quiz/answer")
async def quiz_answer(body: QuizAnswerIn, user: User = Depends(get_current_user)):
    quiz = await db.quizzes.find_one({"quiz_id": body.quiz_id, "user_id": user.user_id}, {"_id": 0})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    qs = quiz["questions"]
    if body.question_index < 0 or body.question_index >= len(qs):
        raise HTTPException(status_code=400, detail="Invalid question index")
    q = qs[body.question_index]
    correct = body.selected_index == q["correct_index"]

    answer_record = {
        "question_index": body.question_index,
        "selected_index": body.selected_index,
        "correct": correct,
        "answered_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.quizzes.update_one({"quiz_id": body.quiz_id}, {"$push": {"answers": answer_record}})

    # Update memory: if incorrect, record mistake; if correct, bump mastery
    topic_id = quiz["topic_id"]
    memory = await db.topic_memory.find_one({"topic_id": topic_id}, {"_id": 0}) or {
        "topic_id": topic_id, "concepts": [], "mistakes": [], "strengths": [], "summary": ""
    }
    concept = q.get("concept", "general")
    now = datetime.now(timezone.utc).isoformat()
    concepts = memory.get("concepts") or []
    found = False
    for c in concepts:
        if c["name"].lower() == concept.lower():
            delta = 10 if correct else -8
            c["mastery"] = max(0, min(100, c["mastery"] + delta))
            c["last_seen"] = now
            found = True
            break
    if not found:
        concepts.append({
            "name": concept,
            "mastery": 60 if correct else 30,
            "last_seen": now,
            "note": "",
        })

    mistakes = memory.get("mistakes") or []
    if not correct:
        mistakes.append({
            "concept": concept,
            "description": f"Quiz error: {q['question']}",
            "created_at": now,
            "resolved": False,
        })

    await db.topic_memory.update_one(
        {"topic_id": topic_id},
        {"$set": {"concepts": concepts, "mistakes": mistakes[-30:]}},
        upsert=True,
    )
    avg = (sum(c["mastery"] for c in concepts) / len(concepts)) if concepts else 0.0
    await db.topics.update_one(
        {"topic_id": topic_id}, {"$set": {"mastery": round(avg, 1), "last_active": now}}
    )

    return {
        "correct": correct,
        "correct_index": q["correct_index"],
        "explanation": q.get("explanation", ""),
    }


# ---------- Dashboard ----------
@api.get("/dashboard")
async def dashboard(user: User = Depends(get_current_user)):
    topics = await db.topics.find({"user_id": user.user_id}, {"_id": 0}).to_list(500)
    total_messages = sum(t.get("message_count", 0) for t in topics)
    total_topics = len(topics)
    avg_mastery = (sum(t.get("mastery", 0) for t in topics) / total_topics) if total_topics else 0.0

    # Aggregate weak concepts across topics
    all_memories = await db.topic_memory.find(
        {"topic_id": {"$in": [t["topic_id"] for t in topics]}}, {"_id": 0}
    ).to_list(500)
    concept_bucket = {}
    for m in all_memories:
        for c in m.get("concepts", []) or []:
            concept_bucket.setdefault(c["name"], []).append(c["mastery"])
    weak_spots = sorted(
        [
            {"name": k, "mastery": round(sum(v) / len(v), 1)}
            for k, v in concept_bucket.items()
        ],
        key=lambda x: x["mastery"],
    )[:5]

    return {
        "total_topics": total_topics,
        "total_messages": total_messages,
        "avg_mastery": round(avg_mastery, 1),
        "weak_spots": weak_spots,
        "topics": topics,
    }


# ---------- Health ----------
@api.get("/")
async def root():
    return {"service": "StudyBrain", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
