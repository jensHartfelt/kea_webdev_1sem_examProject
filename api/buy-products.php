<?php
include_once('inc_check-login.php');

// Get products from cart
$sCartProducts = $_POST['cartProducts'];
$aCartProducts = json_decode($sCartProducts);

// Get products in shop
$sStoreProducts = file_get_contents('../data/products.txt');
$aStoreProducts = json_decode($sStoreProducts);

// For now every error will just return the id. If multiple errors with the same product
// multiple instances of that id will occur in the array.
$aErrors = json_decode('[]');

/* 
Loop through cart-items, and for each cart-item
find the matching product and subtract 1 from it's stock  
*/
for ($i = 0; $i < count($aCartProducts); $i++) {
  $iProductIndex = getProductIndex( $aCartProducts[$i]->id, $aStoreProducts );
  if ($aStoreProducts[$iProductIndex]->quantity <= 0) {
    array_push($aErrors, $aStoreProducts[$iProductIndex]->id);
  } else {
    $aStoreProducts[$iProductIndex]->quantity--;
  }
}

// Helper function tio get the current product. Thinking php
function getProductIndex( $sProductId, $aStoreProducts ) {
  for ($i = 0; $i < count($aStoreProducts); $i++) {
    if ($aStoreProducts[$i]->id == $sProductId) {
      return $i;
    }
  }
}

// Save the changes to the products
$sStoreProducts = json_encode($aStoreProducts);
file_put_contents("../data/products.txt", $sStoreProducts);

// Send output to client
$sErrors = json_encode($aErrors);

echo '{
  "affectedProducts": '.count($aCartProducts).',
  "errors": '.$sErrors.'
}';
?>