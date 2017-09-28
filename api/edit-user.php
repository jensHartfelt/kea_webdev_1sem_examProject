<?php
include_once('inc_check-login.php');

session_start();

// Get the id of the user to edit
$sCurrentUserId = $_POST['txtId'];

// Get the session-user
$sUser = $_SESSION['sUser'];
$jUser = json_decode($sUser);

/* If the id of the session user and the user to edit
match, you have to update the session user after edit
If not, you have to keep the session user intact */
if ($sCurrentUserId == $jUser->id) {
  $bAdminRequest = false;
} else {
  $bAdminRequest = true;
}

// get all users
$sUsers = file_get_contents('../data/users.txt');
$aUsers = json_decode($sUsers);

// get the new data to edit the user into
// Get the image
if ( isset($_FILES['fileProfilePicture']['name']) ) {
  $sFileExtension = pathinfo($_FILES['fileProfilePicture']['name'], PATHINFO_EXTENSION);
  $sFolder = '../images/profile-pictures/';
  $sFileName = uniqid().'.'.$sFileExtension;
  $sSaveFileTo = $sFolder.$sFileName;
  move_uploaded_file( $_FILES['fileProfilePicture']['tmp_name'], $sSaveFileTo);
}

// Find user to edit in the users
for ($i = 0; $i < count($aUsers); $i++) {
  if ($aUsers[$i]->id == $sCurrentUserId) {
    /*
      This isset-nightmare seems a little stupid..
      but it prevents manually deleting all data
      about user if logged in and hitting
      this end-point
    */
    if ( isset($_POST['txtFirstName']) ) {
      $aUsers[$i]->firstName = $_POST['txtFirstName'];
    }
    if ( isset($_POST['txtLastName']) ) {
      $aUsers[$i]->lastName = $_POST['txtLastName'];
    }
    if ( isset($_POST['txtPhone']) ) {
      $aUsers[$i]->phone = $_POST['txtPhone'];
    }
    if ( isset($_POST['txtEmail']) ) {
      $aUsers[$i]->email = $_POST['txtEmail'];
    }
    if ( !empty($sFileExtension) ) {
      $aUsers[$i]->profilePicture = $sFileName;
    }
    if ( !empty($_POST['txtPassword']) ) {
      $aUsers[$i]->password = $_POST['txtPassword'];
    }
    
    $sUser = json_encode($aUsers[$i]);
    
    // Write to file
    $sUsers = json_encode($aUsers);
    file_put_contents('../data/users.txt', $sUsers);
    
    echo '{
      "message":"succes",
      "user": '.$sUser.'
    }';
    
    if (!$bAdminRequest) {
      // Update user in session
      $_SESSION['sUser'] = $sUser;
    }
    exit;
  }
}
?>