<?php
include_once('inc_check-login.php');

session_start();

// Get all products
$sProducts = file_get_contents('../data/products.txt');
$aProducts = json_decode($sProducts);

// Get the id of the current product
$sDeleteProductId = $_POST['txtProductId'];

// Find the matching product and change it
for ($i = 0; $i < count($aProducts); $i++) {
  if ($aProducts[$i]->id == $sDeleteProductId) {
    // Delete image
    $sFolder = '../images/product-pictures/';
    $sFileName = $aProducts[$i]->picture;
    $sFileLocation = $sFolder.$sFileName;
    if ($sFileName !== 'dummy.png') {
      unlink( $sFileLocation );
    }

    // Delete the product
    array_splice($aProducts, $i, 1);
    $sProducts = json_encode($aProducts);
    file_put_contents('../data/products.txt', $sProducts);
    echo '{"message":"success"}';
    exit;
  }
}
?>