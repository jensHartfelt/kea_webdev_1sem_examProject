<?php
include_once('inc_check-login.php');

session_start();

$sUser = $_SESSION['sUser'];
$jUser = json_decode($sUser);
$sCurrentUserId = $jUser->id;

// get the image
$sFileExtension = pathinfo($_FILES['fileProductPicture']['name'], PATHINFO_EXTENSION);
$sFolder = '../images/product-pictures/';
$sFileName = uniqid().'.'.$sFileExtension;
$sSaveFileTo = $sFolder.$sFileName;
move_uploaded_file( $_FILES['fileProductPicture']['tmp_name'], $sSaveFileTo);

// Create the product
$jProduct = json_decode("{}");
$jProduct->id = uniqid();
$jProduct->name = $_POST['txtProductName'];
$jProduct->price = $_POST['txtProductPrice'];
if (!empty($sFileExtension)) {
  $jProduct->picture = $sFileName;
} else {
  $jProduct->picture = "dummy.png";
}
$jProduct->createdBy = $sCurrentUserId;

// Save the product
$sProducts = file_get_contents('../data/products.txt');
$aProducts = json_decode($sProducts);
array_push($aProducts, $jProduct);
$sProducts = json_encode($aProducts);
file_put_contents('../data/products.txt', $sProducts);

echo '{
  "message":"succes"
}';

?>