import datetime as dt
import asyncio
import logging
import json
import os
import re
import smtplib
import sqlite3
import tempfile
import uuid
from collections import Counter
from contextlib import asynccontextmanager, contextmanager
from email.message import EmailMessage

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))
E = os.environ.get
DATA_FILE = os.path.abspath(os.path.join(BASE_DIR, E("DATA_FILE", "data.json")))
ANALYTICS_FILE = os.path.abspath(os.path.join(BASE_DIR, E("ANALYTICS_FILE", "analytics.sqlite3")))
UPLOADS_DIR = os.path.abspath(os.path.join(BASE_DIR, E("UPLOADS_DIR", "uploads")))
SECRET = E("JWT_SECRET", "").strip()
logger = logging.getLogger(__name__)
pwd = CryptContext(schemes=["pbkdf2_sha256"])
oauth = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

cors_origins_raw = E("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
cors_origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await seed()
    yield


app = FastAPI(title="ASVORA API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

now = lambda: dt.datetime.now(dt.timezone.utc).replace(tzinfo=None)
COLS = {"services", "projects", "testimonials", "enquiries", "quotes", "media", "notifications"}
store: dict[str, list[dict]] = {name: [] for name in (*COLS, "admins", "content")}


def find_one(col: str, **criteria):
    return next((row for row in store[col] if all(row.get(k) == v for k, v in criteria.items())), None)


def insert(col: str, row: dict):
    row.setdefault("_id", uuid.uuid4().hex)
    store[col].append(row)
    return row


def load_store():
    if not os.path.exists(DATA_FILE):
        return False
    with open(DATA_FILE, encoding="utf-8") as data_file:
        saved = json.load(data_file)
    if not isinstance(saved, dict):
        raise RuntimeError(f"Persistent data in {DATA_FILE} must be a JSON object.")
    for col in store:
        rows = saved.get(col, [])
        if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
            raise RuntimeError(f"Persistent data collection {col!r} in {DATA_FILE} is invalid.")
        for row in rows:
            if isinstance(row.get("created"), str):
                row["created"] = dt.datetime.fromisoformat(row["created"])
        store[col] = rows
    content = next((row for row in store["content"] if row.get("_id") == "site"), None)
    if content:
        for key, value in CONTENT.items():
            if key not in content:
                content[key] = value
    return True


def encode_json(value):
    if isinstance(value, dt.datetime):
        return value.isoformat()
    raise TypeError(f"Cannot serialize {type(value).__name__} to persistent data.")


def save_store():
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=os.path.dirname(DATA_FILE), delete=False
        ) as data_file:
            temp_path = data_file.name
            json.dump(store, data_file, default=encode_json)
        os.replace(temp_path, DATA_FILE)
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


def ser(row: dict):
    result = {k: v for k, v in row.items() if k != "_id"}
    result["id"] = row["_id"]
    if isinstance(result.get("created"), dt.datetime):
        result["created"] = result["created"].isoformat()
    return result


async def auth(token: str = Depends(oauth)):
    try:
        email = jwt.decode(token, SECRET, algorithms=["HS256"])["sub"]
    except (JWTError, KeyError):
        raise HTTPException(401, "Invalid token")
    admin = find_one("admins", email=email)
    if not admin:
        raise HTTPException(401, "Unknown admin")
    return admin


def check(col: str):
    if col not in COLS:
        raise HTTPException(404, "Unknown collection")


CONTENT = {
    "brand": "ASVORA",
    "heroTitle": "Digital solutions for your business",
    "heroSub": "AS Digital Studio delivers professional web development, creative video editing, and engaging content creation. We help businesses build their online presence with innovative digital solutions and premium quality.",
    "aboutTitle": "Creative digital work. Made for your business.",
    "aboutText": "AS Digital Studio delivers professional web development, creative video editing, and engaging content creation. We help businesses build their online presence with innovative digital solutions and premium quality.",
    "ctaText": "Let's build your online presence.",
    "contactTitle": "Let us talk about your project",
    "email": "", "phone": "9150962176", "address": "Thiruvannamalai, Tamil Nadu, India",
    "stat1": "", "stat2": "", "stat3": "", "stat4": "",
    "technologies": "",
    "quoteBudgets": "",
}
LEGACY_CONTENT = {
    "heroTitle": "We engineer software that scales your business",
    "heroSub": "TECHPRO designs, builds and runs cloud platforms, AI products and digital experiences for ambitious companies.",
    "aboutText": "TECHPRO is a product engineering studio of designers, architects and developers. We pair senior talent with a rigorous delivery process, so ideas become reliable, fast and beautiful software.",
    "ctaText": "Ready to build something exceptional?",
    "email": "hello@techpro.dev", "phone": "+91 44 0000 0000", "address": "Chennai, India",
    "stat1": "120+|Projects delivered", "stat2": "45|Enterprise clients", "stat3": "99.9%|Platform uptime", "stat4": "8 yrs|Of engineering",
    "technologies": "React,TypeScript,Next.js,Python,FastAPI,Node.js,MongoDB,PostgreSQL,AWS,Docker,Kubernetes,TensorFlow",
    "quoteBudgets": "< $10k,$10k–$50k,$50k–$150k,$150k+",
}
SERVICES = [
    ("💻", "Web Development", "Professional websites and web applications designed to build your business's online presence."),
    ("🎬", "Video Editing", "Creative, polished video editing for your brand, marketing, and social channels."),
    ("✍️", "Content Creation", "Engaging content tailored to your brand, audience, and business goals."),
]
LEGACY_SERVICES = [
    ("Web Development", "Modern, responsive websites and web applications built to help your business grow."),
    ("Graphic Design", "Distinctive visual identities, logos, and marketing designs that make your brand stand out."),
    ("Content Creation", "Engaging written and visual content tailored to your brand, audience, and goals."),
    ("Video Editing", "Polished, compelling videos edited for social media, marketing, and storytelling."),
    ("Business Ideas", "Creative business ideas and practical guidance to help turn opportunities into a clear plan."),
]
LEGACY_PROJECTS = [
    ("Nimbus Analytics", "SaaS", "Real-time analytics platform serving 2M events per minute.", "+240% faster reporting"),
    ("Voltix Energy", "IoT", "Smart-grid monitoring dashboard for 14 plants.", "-31% downtime"),
    ("Aurora Health", "AI", "Clinical triage assistant with explainable models.", "4x faster triage"),
    ("Kite Commerce", "E-commerce", "Headless storefront with sub-second page loads.", "+58% conversion"),
]
LEGACY_TESTIMONIALS = [
    ("Priya Raman", "CTO, Nimbus Analytics", "TECHPRO shipped in ten weeks what we had planned for a year. Exceptional engineers and communication."),
    ("Daniel Ortiz", "COO, Voltix Energy", "Their dashboards changed how our operators work. Reliable, fast and beautifully designed."),
    ("Meera Nair", "Founder, Kite Commerce", "A true product partner. They challenged our assumptions and the results speak for themselves."),
]


def connect_analytics():
    os.makedirs(os.path.dirname(ANALYTICS_FILE), exist_ok=True)
    return sqlite3.connect(ANALYTICS_FILE, timeout=10)


@contextmanager
def analytics_connection():
    db = connect_analytics()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_analytics():
    with analytics_connection() as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY, path TEXT NOT NULL, created TEXT NOT NULL)")
        db.execute("CREATE INDEX IF NOT EXISTS visits_created_idx ON visits(created)")
        db.execute("CREATE INDEX IF NOT EXISTS visits_path_idx ON visits(path)")
        db.execute("CREATE TABLE IF NOT EXISTS analytics_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
        migrated = db.execute("SELECT 1 FROM analytics_meta WHERE key = 'json_visits_migrated'").fetchone()
        if not migrated:
            if os.path.exists(DATA_FILE):
                with open(DATA_FILE, encoding="utf-8") as data_file:
                    saved = json.load(data_file)
                old_visits = saved.get("visits", [])
                if not isinstance(old_visits, list) or any(not isinstance(row, dict) for row in old_visits):
                    raise RuntimeError(f"Persistent visit data in {DATA_FILE} is invalid.")
                migration_rows = []
                for row in old_visits:
                    created = row.get("created")
                    if isinstance(created, dt.datetime):
                        created = created.isoformat()
                    if not isinstance(created, str):
                        raise RuntimeError(f"Persistent visit record in {DATA_FILE} has no valid timestamp.")
                    try:
                        dt.datetime.fromisoformat(created)
                    except ValueError as error:
                        raise RuntimeError(f"Persistent visit record in {DATA_FILE} has an invalid timestamp.") from error
                    migration_rows.append((str(row.get("path", "/"))[:100], created))
                db.executemany(
                    "INSERT INTO visits(path, created) VALUES (?, ?)",
                    migration_rows,
                )
            db.execute("INSERT INTO analytics_meta(key, value) VALUES ('json_visits_migrated', '1')")


def migrate_legacy_content():
    content = find_one("content", _id="site")
    changed = False
    if content:
        for key, value in LEGACY_CONTENT.items():
            if content.get(key) == value:
                content[key] = CONTENT[key]
                changed = True
    for admin in store["admins"]:
        if admin.get("name") == "TECHPRO Admin":
            admin["name"] = "ASVORA Admin"
            changed = True
    old_services = [
        row for row in store["services"]
        if (row.get("title"), row.get("description")) in LEGACY_SERVICES
    ]
    if old_services:
        store["services"] = [row for row in store["services"] if row not in old_services]
        for icon, title, description in SERVICES:
            insert("services", {"icon": icon, "title": title, "description": description, "published": True, "created": now()})
        changed = True
    legacy_projects = [
        row for row in store["projects"]
        if any(
            row.get("title") == title and row.get("category") == category
            and row.get("description") == description and row.get("result") == result
            for title, category, description, result in LEGACY_PROJECTS
        )
    ]
    legacy_testimonials = [
        row for row in store["testimonials"]
        if any(
            row.get("name") == name and row.get("role") == role and row.get("quote") == quote
            for name, role, quote in LEGACY_TESTIMONIALS
        )
    ]
    if legacy_projects:
        store["projects"] = [row for row in store["projects"] if row not in legacy_projects]
        changed = True
    if legacy_testimonials:
        store["testimonials"] = [row for row in store["testimonials"] if row not in legacy_testimonials]
        changed = True
    return changed


def send_enquiry_email(recipient: str, subject: str, body: str):
    host = E("SMTP_HOST")
    if not host:
        return
    port = int(E("SMTP_PORT", "587"))
    username, password = E("SMTP_USERNAME"), E("SMTP_PASSWORD")
    sender = E("SMTP_FROM_EMAIL") or username or recipient
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = recipient
    message.set_content(body)
    if E("SMTP_USE_SSL", "false").lower() == "true":
        with smtplib.SMTP_SSL(host, port, timeout=10) as server:
            if username:
                server.login(username, password or "")
            server.send_message(message)
    else:
        with smtplib.SMTP(host, port, timeout=10) as server:
            server.starttls()
            if username:
                server.login(username, password or "")
            server.send_message(message)


async def seed():
    if len(SECRET) < 32:
        raise RuntimeError("Set JWT_SECRET to a fixed random value of at least 32 characters.")
    if load_store():
        migrate_legacy_content()
        init_analytics()
        save_store()
        return
    email, password = E("ADMIN_EMAIL"), E("ADMIN_PASSWORD")
    if not email or not password:
        raise RuntimeError("Set ADMIN_EMAIL and ADMIN_PASSWORD before starting the backend.")
    insert("admins", {"email": email, "name": "ASVORA Admin", "hash": pwd.hash(password)})
    insert("content", {"_id": "site", **CONTENT})
    for icon, title, description in SERVICES:
        insert("services", {"icon": icon, "title": title, "description": description, "published": True, "created": now()})
    save_store()
    init_analytics()


class Login(BaseModel):
    email: EmailStr
    password: str


def issue_token(email: str):
    return jwt.encode({"sub": email, "exp": now() + dt.timedelta(hours=12)}, SECRET, algorithm="HS256")


@app.post("/api/auth/login")
async def login(b: Login):
    admin = find_one("admins", email=str(b.email))
    if not admin or not pwd.verify(b.password, admin["hash"]):
        raise HTTPException(401, "Invalid credentials")
    return {"token": issue_token(admin["email"])}


@app.get("/api/auth/me")
async def me(admin=Depends(auth)):
    return {"email": admin["email"], "name": admin["name"]}


class ProfileUpdate(BaseModel):
    email: EmailStr | None = None
    name: str | None = None
    password: str | None = None


class ReviewSubmission(BaseModel):
    name: str
    rating: int
    quote: str = ""


@app.put("/api/auth/profile")
async def profile(b: ProfileUpdate, admin=Depends(auth)):
    if b.password and len(b.password) < 8:
        raise HTTPException(400, "Password must be 8+ characters")
    if b.email and b.email != admin["email"]:
        if find_one("admins", email=str(b.email)):
            raise HTTPException(409, "That email is already in use")
        admin["email"] = str(b.email)
    if b.name:
        admin["name"] = b.name
    if b.password:
        admin["hash"] = pwd.hash(b.password)
    save_store()
    return {"token": issue_token(admin["email"])}


@app.get("/api/public")
async def public():
    content = find_one("content", _id="site")
    if not content:
        raise HTTPException(500, "Public site content is not configured.")
    return {
        "content": {k: v for k, v in content.items() if k != "_id"},
        **{
            col: [ser(row) for row in sorted(store[col], key=lambda row: row.get("created") or dt.datetime.min) if row.get("published") is not False]
            for col in ("services", "projects", "testimonials")
        },
    }


@app.post("/api/track")
async def track(b: dict):
    with analytics_connection() as db:
        db.execute(
            "INSERT INTO visits(path, created) VALUES (?, ?)",
            (str(b.get("path", "/"))[:100], now().isoformat()),
        )
    return {"ok": True}


async def intake(col: str, b: dict, label: str):
    b = {k: str(v)[:3000] for k, v in b.items() if k in ("name", "email", "message", "service", "budget")}
    if not b.get("name") or not b.get("email") or "@" not in b["email"]:
        raise HTTPException(422, "Name and valid email required")
    insert(col, {**b, "status": "new", "created": now()})
    insert("notifications", {"title": f"New {label}", "message": f"{b['name']} ({b['email']})", "read": False, "created": now()})
    save_store()
    admin = find_one("admins")
    if admin and E("SMTP_HOST"):
        subject = f"New {label} from {b['name']}"
        body = "\n".join(f"{key.title()}: {value}" for key, value in b.items())
        try:
            await asyncio.to_thread(send_enquiry_email, admin["email"], subject, body)
        except (OSError, smtplib.SMTPException, ValueError) as error:
            logger.exception("Could not send the new %s notification email: %s", label, error)
    return {"ok": True}


@app.post("/api/enquiries")
async def enquiry(b: dict):
    return await intake("enquiries", b, "enquiry")


@app.post("/api/quotes")
async def quote(b: dict):
    return await intake("quotes", b, "quote request")


@app.post("/api/reviews")
async def review(b: ReviewSubmission):
    name, quote_text = b.name.strip(), b.quote.strip()
    if not name or len(name) > 120:
        raise HTTPException(422, "Name must be between 1 and 120 characters.")
    if b.rating < 1 or b.rating > 5:
        raise HTTPException(422, "Rating must be between 1 and 5 stars.")
    if len(quote_text) > 3000:
        raise HTTPException(422, "Review must be 3000 characters or fewer.")
    insert("testimonials", {
        "name": name,
        "role": "ASVORA visitor",
        "quote": quote_text or f"Rated {b.rating} out of 5 stars.",
        "rating": b.rating,
        "published": False,
        "created": now(),
    })
    insert("notifications", {
        "title": "New review to approve",
        "message": f"{name} · {b.rating}/5 stars",
        "read": False,
        "created": now(),
    })
    save_store()
    return {"ok": True}


@app.get("/api/admin/stats")
async def stats(_=Depends(auth)):
    today = now().date()
    start = today - dt.timedelta(days=13)
    with analytics_connection() as db:
        total_visits = db.execute("SELECT COUNT(*) FROM visits").fetchone()[0]
        daily = Counter(dict(db.execute(
            "SELECT substr(created, 1, 10), COUNT(*) FROM visits WHERE created >= ? AND created < ? GROUP BY substr(created, 1, 10)",
            (f"{start.isoformat()}T00:00:00", f"{(today + dt.timedelta(days=1)).isoformat()}T00:00:00"),
        )))
        top = db.execute(
            "SELECT path, COUNT(*) AS n FROM visits GROUP BY path ORDER BY n DESC LIMIT 5"
        ).fetchall()
    series = [
        {"d": (day := (start + dt.timedelta(days=i)).isoformat()), "n": daily[day]}
        for i in range(14)
    ]
    return {
        "visits": total_visits,
        "series": series,
        "top": [{"path": path, "n": count} for path, count in top],
        "enquiries": len(store["enquiries"]),
        "quotes": len(store["quotes"]),
        "new": sum(row.get("status") == "new" for col in ("enquiries", "quotes") for row in store[col]),
        "services": len(store["services"]),
        "projects": len(store["projects"]),
        "unread": sum(not row.get("read") for row in store["notifications"]),
    }


@app.get("/api/admin/content")
async def get_content(_=Depends(auth)):
    return {k: v for k, v in find_one("content", _id="site").items() if k != "_id"}


@app.put("/api/admin/content")
async def set_content(b: dict, _=Depends(auth)):
    content = find_one("content", _id="site")
    content.update({k: str(v) for k, v in b.items() if k in CONTENT})
    save_store()
    return {"ok": True}


@app.post("/api/admin/media/upload")
async def upload(file: UploadFile = File(...), _=Depends(auth)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in (".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"):
        raise HTTPException(400, "Images only")
    data = await file.read()
    if len(data) > 5_000_000:
        raise HTTPException(400, "Max 5MB")
    name = uuid.uuid4().hex + ext
    with open(os.path.join(UPLOADS_DIR, name), "wb") as image:
        image.write(data)
    row = insert("media", {"title": file.filename, "url": f"/uploads/{name}", "file": name, "created": now()})
    save_store()
    return ser(row)


@app.get("/api/admin/{col}")
async def list_(col: str, q: str = "", status: str = "", _=Depends(auth)):
    check(col)
    rows = store[col]
    if q:
        pattern = re.compile(re.escape(q), re.IGNORECASE)
        rows = [row for row in rows if any(pattern.search(str(row.get(k, ""))) for k in ("title", "name", "email", "message"))]
    if status:
        rows = [row for row in rows if row.get("status") == status]
    ordered = sorted(
        rows,
        key=lambda row: row.get("created") or dt.datetime.min,
        reverse=col not in ("services", "projects", "testimonials"),
    )
    return [
        ser(row)
        for row in ordered
    ]


@app.post("/api/admin/{col}")
async def create(col: str, b: dict, _=Depends(auth)):
    check(col)
    b.pop("id", None)
    b["created"] = now()
    row = insert(col, b)
    save_store()
    return ser(row)


@app.put("/api/admin/{col}/{id}")
async def update(col: str, id: str, b: dict, _=Depends(auth)):
    check(col)
    row = next((item for item in store[col] if item["_id"] == id), None)
    if not row:
        raise HTTPException(404, "Item not found")
    for key in ("id", "created", "_id"):
        b.pop(key, None)
    row.update(b)
    save_store()
    return {"ok": True}


@app.delete("/api/admin/{col}/{id}")
async def delete(col: str, id: str, _=Depends(auth)):
    check(col)
    row = next((item for item in store[col] if item["_id"] == id), None)
    if row:
        store[col].remove(row)
        if col == "media":
            try:
                os.remove(os.path.join(UPLOADS_DIR, row["file"]))
            except OSError:
                pass
        save_store()
    return {"ok": True}
