<?php
include_once('inc_check-login.php');

// Get all users
$sUsers = file_get_contents('../data/users.txt');
$aUsers = json_decode($sUsers);

// Remove all the passwords from the response
for ($i = 0; $i < count($aUsers); $i++) {
  unset( $aUsers[$i]->password  );
}

// Send response
$sUsers = json_encode($aUsers);
echo $sUsers;
/* print_r( $aUsers ); */
?>