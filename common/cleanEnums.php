<?php
/**
 * Created by PhpStorm.
 * User: mano
 * Date: 18/01/17
 * Time: 10:44
 */

include_once '../server/Enums.php';

$a = array(3,4,6,array(4,5),7);
unset($a[3]);

$f = $a;
//$enums = Enums::getEnumsDataDecoded();
//$enums = $enums["enums"];
//
//try {
//    foreach ($enums as $enum) {
//        $conn = Enums::getDBConnection($enum);
//        $conn->removeTable($enum["id"], $enum["dataSource"]["schema"]);
//    }
//
//} catch (Exception $f) {
//
//}
//
//$paths = Enums::getEnumHeadersPath();
//
//foreach ($paths as $path) {
//    unlink($path);
//}
//
//rmdir("../Enums");


