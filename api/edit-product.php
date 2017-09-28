<?php
include_once('inc_check-login.php');

session_start();

// Get all products
$sProducts = file_get_contents('../data/products.txt');
$aProducts = json_decode($sProducts);

// Get the id of the current product
$sEditProductId = $_POST['txtProductId'];

// Get the new name and price and files
$sNewName = $_POST['txtProductName'];
$sNewPrice = $_POST['txtProductPrice'];
if ( isset($_FILES['fileProductPicture']['name']) ) {
  $sFileExtension = pathinfo($_FILES['fileProductPicture']['name'], PATHINFO_EXTENSION);
  $sFolder = '../images/product-pictures/';
  $sFileName = uniqid().'.'.$sFileExtension;
  $sSaveFileTo = $sFolder.$sFileName;
  move_uploaded_file( $_FILES['fileProductPicture']['tmp_name'], $sSaveFileTo);
}

// Find the matching product and change it
for ($i = 0; $i < count($aProducts); $i++) {
  if ($aProducts[$i]->id == $sEditProductId) {
    $aProducts[$i]->name = $sNewName;
    $aProducts[$i]->price = $sNewPrice;
    if ( !empty($sFileExtension) ) {
      $aProducts[$i]->picture = $sFileName;
    }

    // Write the changes to the file, output something to client and exit
    $sProducts = json_encode($aProducts);
    file_put_contents('../data/products.txt', $sProducts);
    echo '{"messag":"succes"}';
    exit;
  }
}
?>