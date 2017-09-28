<?php
include_once('inc_check-login.php');

session_start();

$sProductId = $_GET['productId'];
$sProducts = file_get_contents('../data/products.txt');
$aProducts = json_decode($sProducts);
for ($i = 0; $i < count($aProducts); $i++) {
  if ($aProducts[$i]->id == $sProductId) {
    $sProduct = json_encode( $aProducts[$i] );
    echo $sProduct;
    exit;
  }
}
?>