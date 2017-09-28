<?php
  session_start();

  // Get all users
  $sUsers = file_get_contents('../data/users.txt');
  $aUsers = json_decode($sUsers);

  // Get current login information
  $sMailOrPhone = $_POST['txtMailOrPhone'];
  $sUserPassword = $_POST['txtPassword'];

  // Loop through array to see if phone or email matches a users
  for ($i = 0; $i < count($aUsers); $i++) {
    $sPhone = $aUsers[$i]->phone;
    $sEmail = $aUsers[$i]->email;
    $sPassword = $aUsers[$i]->password;
    if ( ($sPhone == $sMailOrPhone || $sEmail == $sMailOrPhone) && 
         ($sPassword == $sUserPassword) &&
         (isset($sPhone) || isset($sEmail))
       ) {
      // Is login is succesful, set current user as the logged in user
      // of this session and send a status message to the client
      $sUser = json_encode($aUsers[$i]);   
      $_SESSION['sUser'] = $sUser;

      // Make a copy of user without password to send to the client
      // The client can save this as a variable and always have a
      // reference to the profilePicture, name and such
      $jUser = $aUsers[$i];
      unset($jUser->password);
      $sjUser = json_encode($jUser);
      echo '{
        "login":"ok",
        "user": '.$sjUser.'
      }';
      exit;
    }
  }

  // If logins is unsuccesfull, send a message to client
  echo '{"login":"error","message": "Ups. Could not login." }';
  exit;
?>