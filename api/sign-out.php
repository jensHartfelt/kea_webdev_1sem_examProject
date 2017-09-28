<?php
  session_start();
  $sUser = $_SESSION['sUser'];
  $jUser = json_decode($sUser);
  echo '{"message": "Signed out '.$jUser->firstName.' '.$jUser->lastName.'"}';
  session_destroy();
?>