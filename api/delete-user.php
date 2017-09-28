<?php
include_once('inc_check-login.php');

session_start();

// get currently logged in user's id
$sUser = $_SESSION['sUser'];
$jUser = json_decode($sUser);

// If a user id is sent with the request the request is from an admin
if (isset($_POST['sUserId'])) {
  $sCurrentUserId = $_POST['sUserId'];

// If not the request is a regular user deleting itself: just use
// the id from the session
} else {
  $sCurrentUserId = $jUser->id;
}

// get all users
$sUsers = file_get_contents('../data/users.txt');
$aUsers = json_decode($sUsers);

for ($i = 0; $i < count($aUsers); $i++) {
  if ($aUsers[$i]->id == $sCurrentUserId) {
    // Delete image
    $sFolder = '../images/profile-pictures/';
    $sFileName = $aUsers[$i]->profilePicture;
    $sFileLocation = $sFolder.$sFileName;
    if ($sFileName !== 'dummy.svg') {
      unlink( $sFileLocation );
    }
    
    array_splice($aUsers, $i, 1);
    $sUsers = json_encode($aUsers);
    file_put_contents('../data/users.txt', $sUsers);
    echo '{"message": "User deleted"}';

    // If the deleted user is the one logged in (if the delete
    // were called from the edit-profile-page by a )
    if ($jUser->id == $sCurrentUserId){
      session_destroy();
    }

    exit();
  }
}

?>