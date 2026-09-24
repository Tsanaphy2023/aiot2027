<?php
/**
 * LEQs SciRBRU Digital Precision Farming & Deep AI
 * PHP REST API Backend for Apache / XAMPP / Production Hosting
 * Database: SQLite3 (Automatic fall-through)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$db_file = __DIR__ . '/../database.db';
$db = new PDO("sqlite:" . $db_file);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'stats':
        $total = $db->query("SELECT COUNT(*) FROM participants")->fetchColumn();
        $teachers = $db->query("SELECT COUNT(*) FROM participants WHERE role = 'teacher'")->fetchColumn();
        $students = $db->query("SELECT COUNT(*) FROM participants WHERE role = 'student'")->fetchColumn();
        $schools = $db->query("SELECT COUNT(DISTINCT school) FROM participants")->fetchColumn();
        $checked_in = $db->query("SELECT COUNT(*) FROM participants WHERE checked_in = 1")->fetchColumn();
        $laptops = $db->query("SELECT COUNT(*) FROM participants WHERE laptop_avail = 'yes'")->fetchColumn();
        $capacity = 60;
        $remaining = max(0, $capacity - (int)$total);
        
        echo json_encode([
            'success' => true,
            'total' => (int)$total,
            'teachers' => (int)$teachers,
            'students' => (int)$students,
            'schools' => (int)$schools,
            'checked_in' => (int)$checked_in,
            'capacity' => $capacity,
            'quota_remaining' => $remaining,
            'quota_percentage' => round(((int)$total / $capacity) * 100, 1),
            'laptops_count' => (int)$laptops
        ], JSON_UNESCAPED_UNICODE);
        break;

    case 'participants':
        $stmt = $db->query("SELECT * FROM participants ORDER BY id DESC");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'count' => count($rows), 'participants' => $rows], JSON_UNESCAPED_UNICODE);
        break;

    case 'register':
        $input = json_decode(file_get_contents('php://input'), true);
        $prefix = trim($input['prefix'] ?? '');
        $fullname = trim($input['fullname'] ?? '');
        $role = trim($input['role'] ?? 'student');
        $school = trim($input['school'] ?? '');
        $grade_dept = trim($input['grade_dept'] ?? '');
        $phone = trim($input['phone'] ?? '');
        $email = trim($input['email'] ?? '');
        $line_id = trim($input['line_id'] ?? '');
        $province = trim($input['province'] ?? 'จันทบุรี');
        $food_pref = trim($input['food_pref'] ?? 'normal');
        $laptop_avail = trim($input['laptop_avail'] ?? 'yes');
        $experience_level = trim($input['experience_level'] ?? 'beginner');

        if (empty($fullname) || empty($school) || empty($phone)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'กรุณากรอกชื่อ โรงเรียน และเบอร์โทรศัพท์ให้ครบถ้วน'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Duplicate phone check
        $dupStmt = $db->prepare("SELECT reg_code, fullname FROM participants WHERE phone = ?");
        $dupStmt->execute([$phone]);
        $existing = $dupStmt->fetch(PDO::FETCH_ASSOC);
        if ($existing) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => "เบอร์โทรศัพท์นี้ได้ลงทะเบียนไว้แล้วในชื่อ '{$existing['fullname']}' (รหัส: {$existing['reg_code']})",
                'already_registered' => true,
                'reg_code' => $existing['reg_code']
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $count = $db->query("SELECT COUNT(*) FROM participants")->fetchColumn();
        if ($count >= 60) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ขออภัย ที่นั่งเข้าร่วมอบรมเต็มจำนวน 60 ท่านแล้ว'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $reg_code = sprintf("REG-2026-%03d", $count + 1);
        $qr_token = sprintf("TOKEN-%04d-%s", $count + 1, substr($phone, -4) ?: '0000');
        $now = date('Y-m-d H:i:s');

        $stmt = $db->prepare("INSERT INTO participants 
            (reg_code, prefix, fullname, role, school, grade_dept, phone, email, line_id, province, food_pref, laptop_avail, experience_level, status, checked_in, qr_token, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 0, ?, ?)");
        $stmt->execute([$reg_code, $prefix, $fullname, $role, $school, $grade_dept, $phone, $email, $line_id, $province, $food_pref, $laptop_avail, $experience_level, $qr_token, $now]);

        echo json_encode([
            'success' => true,
            'message' => 'ลงทะเบียนสำเร็จเรียบร้อย!',
            'reg_code' => $reg_code,
            'id' => $db->lastInsertId(),
            'prefix' => $prefix,
            'fullname' => trim("$prefix $fullname"),
            'role' => $role,
            'school' => $school,
            'grade_dept' => $grade_dept,
            'phone' => $phone,
            'email' => $email,
            'line_id' => $line_id,
            'province' => $province,
            'food_pref' => $food_pref,
            'laptop_avail' => $laptop_avail,
            'experience_level' => $experience_level,
            'qr_token' => $qr_token,
            'created_at' => $now
        ], JSON_UNESCAPED_UNICODE);
        break;

    case 'registration-lookup':
        $target = trim($_GET['code'] ?? $_GET['phone'] ?? $_GET['q'] ?? '');
        if (empty($target)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'กรุณาระบุรหัสลงทะเบียน หรือเบอร์โทรศัพท์'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $stmt = $db->prepare("SELECT * FROM participants WHERE reg_code = ? OR phone = ? OR fullname LIKE ? OR qr_token = ? ORDER BY id DESC LIMIT 1");
        $stmt->execute([$target, $target, "%$target%", $target]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            echo json_encode(['success' => true, 'participant' => $row], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'ไม่พบข้อมูลการลงทะเบียน'], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'quick-checkin':
        $input = json_decode(file_get_contents('php://input'), true);
        $target = trim($input['code'] ?? $input['phone'] ?? $input['qr_token'] ?? '');
        if (empty($target)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing code or token'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $stmt = $db->prepare("SELECT id, reg_code, prefix, fullname, role, school FROM participants WHERE reg_code = ? OR phone = ? OR qr_token = ? LIMIT 1");
        $stmt->execute([$target, $target, $target]);
        $p = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$p) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'ไม่พบข้อมูลผู้ลงทะเบียน'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $now = date('Y-m-d H:i:s');
        $up = $db->prepare("UPDATE participants SET checked_in = 1, checkin_time = ? WHERE id = ?");
        $up->execute([$now, $p['id']]);

        echo json_encode([
            'success' => true,
            'message' => 'เช็คอินเรียบร้อยแล้ว!',
            'reg_code' => $p['reg_code'],
            'fullname' => trim("{$p['prefix']} {$p['fullname']}"),
            'school' => $p['school'],
            'role' => $p['role'],
            'checkin_time' => $now
        ], JSON_UNESCAPED_UNICODE);
        break;

    case 'content':
        $stmt = $db->query("SELECT key, value FROM site_content");
        $items = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        echo json_encode(['success' => true, 'content' => $items], JSON_UNESCAPED_UNICODE);
        break;

    case 'admin-login':
        $input = json_decode(file_get_contents('php://input'), true);
        $username = trim($input['username'] ?? '');
        $password = trim($input['password'] ?? '');

        $stmt = $db->prepare("SELECT password FROM admin_users WHERE username = ?");
        $stmt->execute([$username]);
        $stored = $stmt->fetchColumn();

        if ($stored && $stored === $password) {
            $token = bin2hex(random_bytes(16));
            echo json_encode(['success' => true, 'token' => $token, 'message' => 'Login successful']);
        } else {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (Default: admin / LEQs)']);
        }
        break;

    case 'admin-checkin':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = (int)($input['id'] ?? 0);
        $checked_in = (int)($input['checked_in'] ?? 1);
        $now = $checked_in ? date('Y-m-d H:i:s') : null;
        $stmt = $db->prepare("UPDATE participants SET checked_in = ?, checkin_time = ? WHERE id = ?");
        $stmt->execute([$checked_in, $now, $id]);
        echo json_encode(['success' => true, 'id' => $id, 'checked_in' => $checked_in, 'checkin_time' => $now]);
        break;
        break;

    case 'admin-delete':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = (int)($input['id'] ?? 0);
        $stmt = $db->prepare("DELETE FROM participants WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    case 'admin-content':
        $input = json_decode(file_get_contents('php://input'), true);
        $content = $input['content'] ?? [];
        $stmt = $db->prepare("INSERT OR REPLACE INTO site_content (key, value) VALUES (?, ?)");
        foreach ($content as $k => $v) {
            $stmt->execute([$k, $v]);
        }
        echo json_encode(['success' => true]);
        break;

    case 'quiz-stats':
        $stmt = $db->query("SELECT * FROM quiz_records ORDER BY id DESC LIMIT 50");
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'records' => $records], JSON_UNESCAPED_UNICODE);
        break;

    default:
        echo json_encode(['success' => true, 'message' => 'LEQs SciRBRU Workshop API Ready']);
        break;
}
