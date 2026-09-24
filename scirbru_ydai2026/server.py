#!/usr/bin/env python3
"""
LEQs SciRBRU Digital Precision Farming & Deep AI
Workshop Management System Backend (SQLite3 + REST API + Static Files Server)
No external dependencies required (Standard Library only)
"""

import http.server
import socketserver
import json
import sqlite3
import os
import sys
import urllib.parse
from datetime import datetime

PORT = 8090
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database.db")
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    # 1. Participants table
    c.execute("""
    CREATE TABLE IF NOT EXISTS participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reg_code TEXT UNIQUE,
        prefix TEXT,
        fullname TEXT NOT NULL,
        role TEXT NOT NULL, -- 'teacher' or 'student'
        school TEXT NOT NULL,
        grade_dept TEXT,
        phone TEXT,
        email TEXT,
        line_id TEXT,
        province TEXT,
        food_pref TEXT DEFAULT 'normal', -- 'normal', 'halal', 'vegetarian', 'allergies'
        laptop_avail TEXT DEFAULT 'yes',
        experience_level TEXT DEFAULT 'beginner',
        status TEXT DEFAULT 'confirmed', -- 'pending', 'confirmed', 'attended', 'cancelled'
        checked_in INTEGER DEFAULT 0,
        checkin_time TEXT,
        qr_token TEXT,
        created_at TEXT,
        updated_at TEXT
    )
    """)

    # Auto-migration for new columns in participants
    cols = [col[1] for col in c.execute("PRAGMA table_info(participants)").fetchall()]
    new_cols = [
        ("line_id", "TEXT"),
        ("province", "TEXT"),
        ("laptop_avail", "TEXT DEFAULT 'yes'"),
        ("experience_level", "TEXT DEFAULT 'beginner'"),
        ("checkin_time", "TEXT"),
        ("qr_token", "TEXT"),
        ("updated_at", "TEXT")
    ]
    for col_name, col_def in new_cols:
        if col_name not in cols:
            c.execute(f"ALTER TABLE participants ADD COLUMN {col_name} {col_def}")

    # 2. Site Content & CMS Settings table
    c.execute("""
    CREATE TABLE IF NOT EXISTS site_content (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT
    )
    """)

    # 3. Quiz & Assessment Records table
    c.execute("""
    CREATE TABLE IF NOT EXISTS quiz_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullname TEXT,
        school TEXT,
        quiz_type TEXT, -- 'pretest' or 'posttest'
        score INTEGER,
        total_questions INTEGER,
        created_at TEXT
    )
    """)

    # 4. Admin Credentials table
    c.execute("""
    CREATE TABLE IF NOT EXISTS admin_users (
        username TEXT PRIMARY KEY,
        password TEXT
    )
    """)

    # Seed or update admin password to LEQs
    c.execute("INSERT OR REPLACE INTO admin_users (username, password) VALUES (?, ?)", ("admin", "LEQs"))

    # Seed default initial content if empty
    default_content = {
        "hero_title": "สร้าง ยุวนวัตกรเกษตรแม่นยำ ด้วย\nAIoT & Deep Learning Edge Intelligence",
        "hero_subtitle": "เปิดโลกการเรียนรู้ด้านวิทยาศาสตร์และเทคโนโลยีการเกษตรยุคใหม่สำหรับคุณครูและนักเรียน ลงมือประกอบชุดทดลอง Smart Farm Kit จริง เขียนโค้ดไมโครคอนโทรลเลอร์ ESP32 เชื่อมต่อเซนเซอร์ดินและอากาศ ส่งข้อมูลขึ้นคลาวด์ พร้อมประยุกต์ใช้โครงข่ายประสาทเทียม (Deep Learning) พยากรณ์และรดน้ำอัตโนมัติ",
        "announcement": "📢 เปิดรับสมัครครูและนักเรียนที่สนใจเข้าร่วมโครงการอบรมเชิงปฏิบัติการ วันที่ 25-26 ธันวาคม 2568 ณ คณะวิทยาศาสตร์และเทคโนโลยี มรภ.รำไพพรรณี รับจำนวนจำกัด 60 ที่นั่ง ฟรีไม่มีค่าใช้จ่าย!",
        "workshop_dates": "25 - 26 ธันวาคม 2568",
        "workshop_location": "ห้องปฏิบัติการฟิสิกส์เกษตรดิจิทัล คณะวิทยาศาสตร์และเทคโนโลยี มรภ.รำไพพรรณี"
    }

    for k, v in default_content.items():
        c.execute("INSERT OR IGNORE INTO site_content VALUES (?, ?, ?)", (k, v, datetime.now().isoformat()))

    # Seed initial sample participants for demonstration
    c.execute("SELECT COUNT(*) FROM participants")
    if c.fetchone()[0] == 0:
        samples = [
            ("REG-2026-001", "นาย", "สมชาย ชำนาญคิด", "teacher", "โรงเรียนเบญจมราชูทิศ จันทบุรี", "กลุ่มสาระฯ วิทยาศาสตร์และเทคโนโลยี", "081-234-5678", "somchai@benchama.ac.th", "@somchai_sci", "จันทบุรี", "normal", "yes", "intermediate", "confirmed", 1, "2026-09-24 08:30:15", "tok_001", datetime.now().isoformat()),
            ("REG-2026-002", "นางสาว", "กัญญา พรหมมินทร์", "student", "โรงเรียนเบญจมราชูทิศ จันทบุรี", "มัธยมศึกษาปีที่ 4/1", "089-987-6543", "kanya@gmail.com", "kanya.line", "จันทบุรี", "normal", "yes", "beginner", "confirmed", 1, "2026-09-24 08:32:40", "tok_002", datetime.now().isoformat()),
            ("REG-2026-003", "นาย", "ธนพล นวัตกร", "student", "โรงเรียนศรียานุสรณ์ จันทบุรี", "มัธยมศึกษาปีที่ 5/2", "086-555-4321", "thanapol@gmail.com", "", "จันทบุรี", "halal", "yes", "beginner", "confirmed", 0, None, "tok_003", datetime.now().isoformat()),
            ("REG-2026-004", "นาง", "วรรณา สดใส", "teacher", "โรงเรียนท่าใหม่ 'พูลสวัสดิ์ราษฎร์นุกูล'", "กลุ่มสาระฯ การงานอาชีพ", "084-111-2233", "wanna@thamai.ac.th", "", "จันทบุรี", "vegetarian", "yes", "beginner", "confirmed", 0, None, "tok_004", datetime.now().isoformat()),
            ("REG-2026-005", "เด็กชาย", "ปกรณ์ เกษตรมั่นคง", "student", "โรงเรียนชุมชนวัดแสนตุ้ง", "มัธยมศึกษาปีที่ 3", "082-333-4455", "pakorn@gmail.com", "", "ตราด", "normal", "no", "none", "confirmed", 0, None, "tok_005", datetime.now().isoformat()),
        ]
        for s in samples:
            c.execute("""
            INSERT INTO participants 
            (reg_code, prefix, fullname, role, school, grade_dept, phone, email, line_id, province, food_pref, laptop_avail, experience_level, status, checked_in, checkin_time, qr_token, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, s)

    conn.commit()
    conn.close()
    print("✅ Database initialized successfully at:", DB_FILE)

class WorkshopHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # API Routes
        if path == "/api/participants":
            self.handle_get_participants()
        elif path == "/api/stats":
            self.handle_get_stats()
        elif path == "/api/content":
            self.handle_get_content()
        elif path == "/api/quiz-stats":
            self.handle_get_quiz_stats()
        elif path == "/api/registration/lookup":
            self.handle_registration_lookup(parsed.query)
        elif path == "/api/export-csv":
            self.handle_export_csv()
        else:
            # Fallback to serving static files
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # Read JSON body
        content_length = int(self.headers.get("Content-Length", 0))
        body = {}
        if content_length > 0:
            try:
                raw_data = self.rfile.read(content_length).decode("utf-8")
                body = json.loads(raw_data)
            except Exception as e:
                self._send_json({"success": False, "error": f"Invalid JSON: {str(e)}"}, 400)
                return

        # API Handlers
        if path == "/api/register":
            self.handle_register(body)
        elif path == "/api/registration/quick-checkin":
            self.handle_quick_checkin(body)
        elif path == "/api/admin/login":
            self.handle_admin_login(body)
        elif path == "/api/admin/checkin":
            self.handle_admin_checkin(body)
        elif path == "/api/admin/status":
            self.handle_admin_update_status(body)
        elif path == "/api/admin/delete-participant":
            self.handle_admin_delete_participant(body)
        elif path == "/api/admin/content":
            self.handle_admin_save_content(body)
        elif path == "/api/quiz":
            self.handle_save_quiz(body)
        else:
            self._send_json({"success": False, "error": "Endpoint not found"}, 404)

    # -------------------------------------------------------------
    # API Implementations
    # -------------------------------------------------------------
    def handle_get_participants(self):
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM participants ORDER BY id DESC")
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        self._send_json({"success": True, "count": len(rows), "participants": rows})

    def handle_get_stats(self):
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        c.execute("SELECT COUNT(*) FROM participants")
        total = c.fetchone()[0]

        c.execute("SELECT COUNT(*) FROM participants WHERE role = 'teacher'")
        teachers = c.fetchone()[0]

        c.execute("SELECT COUNT(*) FROM participants WHERE role = 'student'")
        students = c.fetchone()[0]

        c.execute("SELECT COUNT(DISTINCT school) FROM participants")
        schools = c.fetchone()[0]

        c.execute("SELECT COUNT(*) FROM participants WHERE checked_in = 1")
        checked_in = c.fetchone()[0]

        c.execute("SELECT COUNT(*) FROM participants WHERE laptop_avail = 'yes'")
        laptops = c.fetchone()[0]

        quota_total = 60
        quota_remaining = max(0, quota_total - total)

        c.execute("SELECT AVG(score) FROM quiz_records WHERE quiz_type = 'pretest'")
        avg_pre = c.fetchone()[0] or 0.0

        c.execute("SELECT AVG(score) FROM quiz_records WHERE quiz_type = 'posttest'")
        avg_post = c.fetchone()[0] or 0.0

        conn.close()
        self._send_json({
            "success": True,
            "total": total,
            "teachers": teachers,
            "students": students,
            "schools": schools,
            "checked_in": checked_in,
            "capacity": quota_total,
            "quota_remaining": quota_remaining,
            "quota_percentage": round((total / quota_total) * 100, 1),
            "laptops_count": laptops,
            "avg_pretest": round(avg_pre, 1),
            "avg_posttest": round(avg_post, 1)
        })

    def handle_get_content(self):
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT key, value FROM site_content")
        items = dict(c.fetchall())
        conn.close()
        self._send_json({"success": True, "content": items})

    def handle_register(self, body):
        prefix = body.get("prefix", "").strip()
        fullname = body.get("fullname", "").strip()
        role = body.get("role", "student").strip()
        school = body.get("school", "").strip()
        grade_dept = body.get("grade_dept", "").strip()
        phone = body.get("phone", "").strip()
        email = body.get("email", "").strip()
        line_id = body.get("line_id", "").strip()
        province = body.get("province", "จันทบุรี").strip()
        food_pref = body.get("food_pref", "normal").strip()
        laptop_avail = body.get("laptop_avail", "yes").strip()
        experience_level = body.get("experience_level", "beginner").strip()

        if not fullname or not school or not phone:
            self._send_json({"success": False, "error": "กรุณากรอกชื่อ-นามสกุล โรงเรียน และเบอร์โทรศัพท์ให้ครบถ้วน"}, 400)
            return

        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        # Check duplicate registration by phone number
        c.execute("SELECT reg_code, fullname, school FROM participants WHERE phone = ?", (phone,))
        existing = c.fetchone()
        if existing:
            conn.close()
            self._send_json({
                "success": False, 
                "error": f"เบอร์โทรศัพท์นี้ได้ลงทะเบียนไว้แล้วในชื่อ '{existing['fullname']}' (รหัส: {existing['reg_code']})",
                "already_registered": True,
                "reg_code": existing["reg_code"]
            }, 400)
            return

        # Check total capacity
        c.execute("SELECT COUNT(*) FROM participants")
        count = c.fetchone()[0]
        if count >= 60:
            conn.close()
            self._send_json({"success": False, "error": "ขออภัย ที่นั่งเข้าร่วมอบรมเต็มจำนวน 60 ท่านแล้ว กรุณาติดต่อทีมงานเพื่อลงทะเบียนสำรอง"}, 400)
            return

        # Generate unique registration code: REG-2026-XXX
        reg_code = f"REG-2026-{count + 1:03d}"
        qr_token = f"TOKEN-{count + 1:04d}-{phone[-4:] if len(phone)>=4 else '0000'}"
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        c.execute("""
        INSERT INTO participants 
        (reg_code, prefix, fullname, role, school, grade_dept, phone, email, line_id, province, food_pref, laptop_avail, experience_level, status, checked_in, qr_token, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 0, ?, ?)
        """, (reg_code, prefix, fullname, role, school, grade_dept, phone, email, line_id, province, food_pref, laptop_avail, experience_level, qr_token, now))
        
        participant_id = c.lastrowid
        conn.commit()
        conn.close()

        self._send_json({
            "success": True,
            "message": "ลงทะเบียนสำเร็จเรียบร้อย!",
            "reg_code": reg_code,
            "id": participant_id,
            "prefix": prefix,
            "fullname": f"{prefix} {fullname}".strip(),
            "role": role,
            "school": school,
            "grade_dept": grade_dept,
            "phone": phone,
            "email": email,
            "line_id": line_id,
            "province": province,
            "food_pref": food_pref,
            "laptop_avail": laptop_avail,
            "experience_level": experience_level,
            "qr_token": qr_token,
            "created_at": now
        })

    def handle_registration_lookup(self, query_str):
        params = urllib.parse.parse_qs(query_str)
        q = params.get("q", [""])[0].strip()
        code = params.get("code", [""])[0].strip()
        phone = params.get("phone", [""])[0].strip()

        target = code or phone or q
        if not target:
            self._send_json({"success": False, "error": "กรุณาระบุรหัสลงทะเบียน หรือเบอร์โทรศัพท์"}, 400)
            return

        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("""
        SELECT * FROM participants 
        WHERE reg_code = ? OR phone = ? OR fullname LIKE ? OR qr_token = ?
        ORDER BY id DESC LIMIT 1
        """, (target, target, f"%{target}%", target))
        row = c.fetchone()
        conn.close()

        if row:
            self._send_json({"success": True, "participant": dict(row)})
        else:
            self._send_json({"success": False, "error": "ไม่พบข้อมูลการลงทะเบียนตามเงื่อนไขที่ระบุ"}, 404)

    def handle_quick_checkin(self, body):
        target = body.get("code") or body.get("phone") or body.get("qr_token")
        if not target:
            self._send_json({"success": False, "error": "Missing code or token"}, 400)
            return

        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("""
        SELECT id, reg_code, prefix, fullname, role, school, checked_in FROM participants 
        WHERE reg_code = ? OR phone = ? OR qr_token = ?
        LIMIT 1
        """, (target, target, target))
        p = c.fetchone()
        if not p:
            conn.close()
            self._send_json({"success": False, "error": "ไม่พบข้อมูลผู้ลงทะเบียน"}, 404)
            return

        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        c.execute("UPDATE participants SET checked_in = 1, checkin_time = ? WHERE id = ?", (now, p["id"]))
        conn.commit()
        conn.close()

        self._send_json({
            "success": True,
            "message": "เช็คอินเรียบร้อยแล้ว!",
            "reg_code": p["reg_code"],
            "fullname": f"{p['prefix']} {p['fullname']}".strip(),
            "school": p["school"],
            "role": p["role"],
            "checkin_time": now
        })

    def handle_admin_login(self, body):
        username = body.get("username", "").strip()
        password = body.get("password", "").strip()

        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT password FROM admin_users WHERE username = ?", (username,))
        row = c.fetchone()
        conn.close()

        if row and row[0] == password:
            self._send_json({"success": True, "token": f"token_{username}_valid", "user": username})
        else:
            self._send_json({"success": False, "error": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (Default: admin / LEQs)"}, 401)

    def handle_admin_checkin(self, body):
        p_id = body.get("id")
        checked = 1 if body.get("checked_in") in [1, True, "1"] else 0
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S") if checked == 1 else None

        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("UPDATE participants SET checked_in = ?, checkin_time = ? WHERE id = ?", (checked, now, p_id))
        conn.commit()
        conn.close()

        self._send_json({"success": True, "id": p_id, "checked_in": checked, "checkin_time": now})

    def handle_admin_update_status(self, body):
        p_id = body.get("id")
        status = body.get("status", "confirmed")

        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("UPDATE participants SET status = ? WHERE id = ?", (status, p_id))
        conn.commit()
        conn.close()

        self._send_json({"success": True, "id": p_id, "status": status})

    def handle_admin_delete_participant(self, body):
        p_id = body.get("id")

        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("DELETE FROM participants WHERE id = ?", (p_id,))
        conn.commit()
        conn.close()

        self._send_json({"success": True, "deleted_id": p_id})

    def handle_admin_save_content(self, body):
        items = body.get("content", {})
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        now = datetime.now().isoformat()

        for k, v in items.items():
            c.execute("""
            INSERT INTO site_content (key, value, updated_at) 
            VALUES (?, ?, ?) 
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
            """, (k, v, now))

        conn.commit()
        conn.close()
        self._send_json({"success": True, "message": "อัปเดตเนื้อหาเว็บไซต์เรียบร้อยแล้ว"})

    def handle_save_quiz(self, body):
        fullname = body.get("fullname", "ไม่ระบุชื่อ").strip()
        school = body.get("school", "ไม่ระบุโรงเรียน").strip()
        quiz_type = body.get("quiz_type", "pretest")
        score = int(body.get("score", 0))
        total = int(body.get("total", 5))

        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        c.execute("""
        INSERT INTO quiz_records (fullname, school, quiz_type, score, total_questions, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (fullname, school, quiz_type, score, total, now))

        conn.commit()
        conn.close()
        self._send_json({"success": True, "score": score, "total": total})

    def handle_get_quiz_stats(self):
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM quiz_records ORDER BY id DESC LIMIT 50")
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        self._send_json({"success": True, "records": rows})

    def handle_export_csv(self):
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("""
        SELECT reg_code, prefix, fullname, role, school, grade_dept, phone, email, line_id, province, food_pref, laptop_avail, experience_level, checked_in, checkin_time, created_at 
        FROM participants ORDER BY id ASC
        """)
        rows = c.fetchall()
        conn.close()

        csv_lines = ["รหัสลงทะเบียน,คำนำหน้า,ชื่อ-นามสกุล,สถานะ,โรงเรียน/สถาบัน,ระดับชั้น/กลุ่มสาระ,เบอร์โทร,อีเมล,LINE ID,จังหวัด,อาหาร,นำโน้ตบุ๊กมา,ระดับพื้นฐาน,เช็คอินวันงาน,เวลาเช็คอิน,วันที่ลงทะเบียน\n"]
        for r in rows:
            role_th = "ครูผู้สอน" if r[3] == "teacher" else "นักเรียน"
            check_th = "เช็คอินแล้ว" if r[13] == 1 else "ยังไม่เช็คอิน"
            laptop_th = "มีโน้ตบุ๊ก" if r[11] == "yes" else "ไม่มีโน้ตบุ๊ก"
            clean_cols = [
                f'"{str(r[0] or "")}"', f'"{str(r[1] or "")}"', f'"{str(r[2] or "")}"', f'"{role_th}"',
                f'"{str(r[4] or "")}"', f'"{str(r[5] or "")}"', f'"{str(r[6] or "")}"', f'"{str(r[7] or "")}"',
                f'"{str(r[8] or "")}"', f'"{str(r[9] or "")}"', f'"{str(r[10] or "")}"', f'"{laptop_th}"',
                f'"{str(r[12] or "")}"', f'"{check_th}"', f'"{str(r[14] or "-")}"', f'"{str(r[15] or "")}"'
            ]
            csv_lines.append(",".join(clean_cols) + "\n")

        csv_content = "".join(csv_lines).encode("utf-8-sig") # BOM for Excel Thai support
        self.send_response(200)
        self.send_header("Content-Type", "text/csv; charset=utf-8")
        self.send_header("Content-Disposition", 'attachment; filename="scirbru_aiot_participants.csv"')
        self.send_header("Content-Length", str(len(csv_content)))
        self.end_headers()
        self.wfile.write(csv_content)

def main():
    init_db()
    with socketserver.TCPServer(("", PORT), WorkshopHandler) as httpd:
        print(f"🚀 LEQs SciRBRU Workshop Management Backend running at http://localhost:{PORT}/")
        print(f"📁 Serving static files from: {STATIC_DIR}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")

if __name__ == "__main__":
    main()
