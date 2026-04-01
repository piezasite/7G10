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
    // 1. OBTENER LOS NODOS ACTIVOS (Igual que antes)
    $stmt = $pdo->query("SELECT id, media_url FROM stories WHERE created_at >= NOW() - INTERVAL 15 MINUTE ORDER BY created_at DESC");
    $active_nodes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. LIMPIEZA DE DISCO (Garbage Collector)
    // Buscamos todos los archivos .mp4 en uploads
    $files = glob('uploads/*.mp4');
    $now = time();

    foreach ($files as $file) {
        // Si el archivo tiene más de 900 segundos (15 min) de vida, se borra
        if (is_file($file) && ($now - filemtime($file) >= 900)) {
            unlink($file); 
        }
    }

    // 3. LIMPIEZA DE BASE DE DATOS (Opcional, para mantener la DB ligera)
    $pdo->query("DELETE FROM stories WHERE created_at < NOW() - INTERVAL 15 MINUTE");

    echo json_encode($active_nodes);
}