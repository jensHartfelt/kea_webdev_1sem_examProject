<?php
include_once('inc_check-login.php');

session_start();

$sProducts = file_get_contents('../data/products.txt');
echo $sProducts; 
?>