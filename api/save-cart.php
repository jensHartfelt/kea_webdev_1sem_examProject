<?php
include_once('inc_check-login.php');

session_start();

// Get the new cart
$sCart = $_POST['cartProducts'];
$jCart = json_decode($sCart);

// Get and update the session-user
$sUser = $_SESSION['sUser'];
$jUser = json_decode($sUser);
$jUser->cart = $jCart;

// Get all users
$sUsers = file_get_contents('../data/users.txt');
$aUsers = json_decode($sUsers);

// Find and update the relevant user
for ($i = 0; $i < count($aUsers); $i++) {
  if ( $aUsers[$i]->id == $jUser->id ) {
    $aUsers[$i]->cart = $jCart;
  }
}

// Save the changes to the "database"
$sUsers = json_encode($aUsers);
file_put_contents('../data/users.txt', $sUsers);

// Save the changes to the session user
$sUser = json_encode($jUser);
$_SESSION['sUser'] = $sUser;

echo '{"status": "ok"}';
?>