<?php
header('Content-Type: application/json');
$host = 'db'; $db = '7G10'; $user = 'root'; $pass = 'rootlocalpass';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (Exception $e) { echo json_encode(['error' => 'Offline']); exit; }

$action = $_GET['action'] ?? '';

if ($action === 'upload') {
    $dir = 'uploads/';
    
    // Si la carpeta no existe, intenta crearla con permisos totales
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }

    $filename = time() . '.mp4';
    $target = $dir . $filename;
    $ahora = date("Y-m-d H:i:s");

    // VALIDACIÓN EXTRA: ¿Es escribible?
    if (!is_writable($dir)) {
        echo json_encode(['error' => 'La carpeta uploads no tiene permisos de escritura']);
        exit;
    }

    if (move_uploaded_file($_FILES['video']['tmp_name'], $target)) {
        // Solo insertamos media_url, la DB se encarga del resto (id y created_at)
        $stmt = $pdo->prepare("INSERT INTO stories (media_url) VALUES (?)");
        $stmt->execute([$target]);
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['error' => 'Error al mover archivo']);
    }
} elseif ($action === 'fetch') {
    // CAMBIO CRÍTICO: Intervalo de 15 minutos únicamente
    $stmt = $pdo->query("SELECT id, media_url FROM stories WHERE created_at >= NOW() - INTERVAL 15 MINUTE ORDER BY created_at DESC");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
}