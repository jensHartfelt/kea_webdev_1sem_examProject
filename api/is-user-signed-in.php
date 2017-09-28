<?php
session_start();
$sUser = $_SESSION['sUser'];

if ( isset($sUser) ) {  
  $jUser = json_decode($sUser);
  unset($jUser->password);
  $sjUser = json_encode($jUser);
  $response = '{
    "signedIn": true,
    "user": '.$sjUser.'
  }';
  echo $response;
  exit;
} else {
  $response = '{"signedIn": false}';
  echo $response;
  exit;
}

?>