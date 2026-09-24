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
        
        echo json_encode([
            'success' => true,
            'total' => (int)$total,
            'teachers' => (int)$teachers,
            'students' => (int)$students,
            'schools' => (int)$schools,
            'checked_in' => (int)$checked_in,
            'capacity' => 60
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
        $food_pref = trim($input['food_pref'] ?? 'normal');

        if (empty($fullname) || empty($school)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'กรุณากรอกชื่อและโรงเรียน']);
            exit;
        }

        $count = $db->query("SELECT COUNT(*) FROM participants")->fetchColumn();
        if ($count >= 60) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ที่นั่งเต็มจำนวน 60 ท่านแล้ว']);
            exit;
        }

        $reg_code = sprintf("REG-2026-%03d", $count + 1);
        $now = date('Y-m-d H:i:s');

        $stmt = $db->prepare("INSERT INTO participants (reg_code, prefix, fullname, role, school, grade_dept, phone, email, food_pref, status, checked_in, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 0, ?)");
        $stmt->execute([$reg_code, $prefix, $fullname, $role, $school, $grade_dept, $phone, $email, $food_pref, $now]);

        echo json_encode([
            'success' => true,
            'message' => 'ลงทะเบียนสำเร็จ!',
            'reg_code' => $reg_code,
            'id' => $db->lastInsertId(),
            'fullname' => trim("$prefix $fullname"),
            'role' => $role,
            'school' => $school
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
        $stmt = $db->prepare("UPDATE participants SET checked_in = ? WHERE id = ?");
        $stmt->execute([$checked_in, $id]);
        echo json_encode(['success' => true]);
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
