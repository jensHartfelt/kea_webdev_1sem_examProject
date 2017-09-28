<?php 
session_start();

// Get the image
if ( isset($_FILES['fileProfilePicture']['name']) ) {
  $sFileExtension = pathinfo($_FILES['fileProfilePicture']['name'], PATHINFO_EXTENSION);
  $sFolder = '../images/profile-pictures/';
  $sFileName = uniqid().'.'.$sFileExtension;
  $sSaveFileTo = $sFolder.$sFileName;
  move_uploaded_file( $_FILES['fileProfilePicture']['tmp_name'], $sSaveFileTo);
}

$sUsers = file_get_contents('../data/users.txt');
$aUsers = json_decode($sUsers);

// Check if phone or email is already taken
for ($i = 0; $i < count($aUsers); $i++) {
  if ( $_POST['txtEmail'] == $aUsers[$i]->email || $_POST['txtPhone'] == $aUsers[$i]->phone ) {
    echo '{
      "status": "error",
      "message":"Phone or email already exists"
    }';
    exit;
  }
}





$jNewUser = json_decode("{}");
$jNewUser->id = uniqid();
$jNewUser->role = $_POST['txtUserRole'];
$jNewUser->firstName = $_POST['txtFirstName'];
$jNewUser->lastName = $_POST['txtLastName'];
$jNewUser->password = $_POST['txtPassword']; // Are we suppose to encrypt this?
$jNewUser->email = $_POST['txtEmail'];
$jNewUser->phone = $_POST['txtPhone'];
if (!empty($sFileExtension)) {
  $profilePicture = '"yes"';
  $jNewUser->profilePicture = $sFileName; 
} else {
  $jNewUser->profilePicture = 'dummy.svg '; 
  $profilePicture = '"no"';
}
// ^^^ The api doesn't tell the client where the 
// immage is since the api doesn't know 
// where the image will be requested from.
// Therefor only the name is saved, and the
// client have to specify where the imagefolder is.

array_push($aUsers, $jNewUser);
$sUsers = json_encode($aUsers);
file_put_contents('../data/users.txt', $sUsers);

// Maybe do a check and only echo succes
// if user is actually added 
$sNewUser = json_encode($jNewUser);
$_SESSION['sUser'] = $sNewUser;
echo '{
  "status":"succes",
  "profilePicture":'.$profilePicture.',
  "user":'.$sNewUser.'
}';
?>