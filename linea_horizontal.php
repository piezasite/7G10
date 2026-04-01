<?php function dibujar_ (bool|string $linea_horizontal = true) {
    if (!empty($linea_horizontal) || $linea_horizontal === true) {
        echo "<hr>$linea_horizontal<hr>";
    } else if ($linea_horizontal === 'print') {
        echo "<hr>";
    } else {
        return "<hr>";
    }
}