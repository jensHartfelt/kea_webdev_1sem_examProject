<?php
/*
  This should be included in all at the top of all private api's.
  This script will exit the script exit if the user is not logged in
  and output an error message.
*/
session_start();
if ( !isset($_SESSION['sUser']) ) {
  echo '{
    "status": "error",
    "message": "You need to login to use this api"
  }';
  exit;
} 
?>