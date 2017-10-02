<?php 
/*  
  NOTE:
  I dont feel super proud of this api. It's allright to work with as long as you change 
  the syntax to html when editing the html-string and php when dealing with the php. An
  alternative could be to use include files and have the markup in partials that would
  be included. 
*/


session_start();
$sUser = $_SESSION['sUser'];
$jResponse = json_decode("{}");

/* If the user is logged in, display the relevant pages */
if ( isset($sUser) ) {
  $jUser = json_decode($sUser);
  $jResponse->markup = '
  <!-- Landing page -->
  <div class="page" data-page-id="landing-page">
    <div class="container u_t-c">
      <h2>Welcome</h2>
      <p class="u_mb-xl">This is a custom cms-system that lets you create, update and delete users and associated products.</p>
      <a class="page-link button invisible u_no-float" data-go-to-page="add-product">Add a product<i class="material-icons">add</i></a>
      <a class="page-link button positive u_no-float" data-go-to-page="view-products">Browse products <i class="material-icons">arrow_forward</i></a>
    </div>
  </div>
  
  <!-- Cart -->
  <div class="page" data-page-id="shopping-cart">
    <div class="container small">
      <h2>Shopping cart</h2>
      <div class="cart-container" id="cartContainer">
        <!-- Products in the cart will be rendered here -->
      </div>
      <div class="cart-status">
        <p id="txtCartStatus"></p>
      </div>
      <a id="btnBuyProducts" class="button positive u_mb-xxl">Purchase everything in cart<i class="material-icons">arrow_forward</i></a>
    </div>
  </div>

  <!-- Edit user -->
  <div class="page" data-page-id="edit-user">
    <div class="container small">
      <h2>Edit your profile</h2>
      <div id="txtEditUserMessage" class="message succes">
        <p>Your changes were saved</p>
      </div>

      <h3>Profile preview</h3>
      <div id="displayCurrentUserData">
        <!-- User preview will dynamically be inserted here -->
      </div>

      <h3>Profile Data</h3>
      <form id="frmEditUser" class="u_mb-xl">
        <label for="txtFirstName">New first Name</label>
        <input type="text" name="txtFirstName">
        
        <label for="txtLastName">New last Name</label>
        <input type="text" name="txtLastName">
        
        <label for="txtPhone">New phone number</label>
        <input type="phone" name="txtPhone">
        
        <label for="txtEmail">New email adress</label>
        <input type="email" name="txtEmail">
        
        <label for="fileProfilePicture">New profile picture</label>
        <input type="file" name="fileProfilePicture" accept="image/gif, image/jpeg, image/png">
        
        <label for="txtPassword">New password</label>
        <input type="password" name="txtPassword" class="u_mb-xl">
        
        <a id="btnEditUser" class="button positive">Save changes <i class="material-icons">save</i></a>
        <a id="btnDeleteUser" class="button red u_mb-xxl">Delete profile <i class="material-icons">delete</i></a>
      </form>
    </div>
  </div>
  
  <!-- Products -->
  <div class="page" data-page-id="view-products">
    <div class="container big">
      <h2>Products</h2>
      <div id="txtDeleteProductMessage" class="message succes">
        <p>Product deleted</p>
      </div>
      <div class="products-filters u_mb-xl">
        <p id="txtVisibleProductStatus"></p>
        <div class="dropdown">
          <div class="title">
            <p>Order by</p>
            <i class="material-icons">arrow_drop_down</i>
          </div>
          <div class="content">
            <a id="btnSortAscending">Price: Low to high</a>
            <a id="btnSortDecending">Price: High to low</a>
          </div>
        </div>
        <div class="search-input-container">
          <input type="text" placeholder="Search for product" id="inputFilterProducts">
        </div>
      </div>

      <div class="products-container" id="productContainer">
        <!-- Products will be dynamically inserted here -->
      </div>
    </div>
  </div>
  
  <!-- Add product -->
  <div class="page" data-page-id="add-product">
    <div class="container small">
      <h2>Add product</h2>
      <!-- Message: Succesfully added product -->
      <div id="txtAddProductMessage" class="message succes">
      <p>New product added</p>
      </div>
      <!-- Message: Cant add product - missing fields -->
      <div id="msgAddProductMissingFields" class="message error">
        <p>Please fill out all the required fields to add the product.</p>
      </div>
      <form id="frmAddProduct">
        <label for="txtProductName">Name</label>
        <input type="text" name="txtProductName" placeholder="Enter product name here" class="required">

        <label for="txtProductPrice">Price in DKK</label>
        <input type="number" name="txtProductPrice" class="required">

        <label for="txtProductQuantity">Quantity available</label>
        <input type="number" name="txtProductQuantity" class="required">
        
        <label for="fileProductPicture">Picture</label>
        <input type="file" name="fileProductPicture" class="u_mb-xl" accept="image/gif, image/jpeg, image/png">

        <a id="btnAddProduct" class="button positive">Add product <i class="material-icons">add</i></a>
        <a class="button invisible">Cancel<i class="material-icons">close</i></a>
      </form>
    </div>
  </div>

  <!-- Edit product -->
  <div class="page" data-page-id="edit-product">
    <div class="container small">
      <h2>Edit product</h2>
      <form id="frmEditProduct">
        <label for="txtProductName">Name</label>
        <input type="text" name="txtProductName">

        <label for="txtProductPrice">Price in DKK</label>
        <input type="number" name="txtProductPrice">

        <label for="txtProductQuantity">Quantity available</label>
        <input type="number" name="txtProductQuantity">

        <label for="fileProductPicture">Picture</label>
        <input type="file" name="fileProductPicture" class="u_mb-xl" accept="image/gif, image/jpeg, image/png">
        
        <input type="text" name="txtProductId" class="u_hidden">
        
        <a id="btnEditProduct" class="button positive">Save changes <i class="material-icons">save</i></a>
        <a id="btnDeleteProduct" class="button red">Delete <i class="material-icons">delete</i></a>
        <a class="button invisible page-link" data-go-to-page="view-products">Cancel<i class="material-icons">close</i></a>
      </form>
    </div>
  </div>';

  if ($jUser->role == "admin") {
    $jResponse->markup .= '
    <div class="page" data-page-id="manage-users">
      <div class="container small">
        <h2>Manage users</h2>
        <div id="txtDeleteUserMessage" class="message succes">
          <p>User was deleted</p>
        </div>
        
        <div id="usersContainer">
          <!-- Users will be inserted here -->
        </div>
      </div>
    </div>';
  }

/* If the user is NOT logged in, only display landingpage, login and signup-page */  
} else {
  $jResponse->markup = 
  '<!-- Landing page -->
  <div class="page" data-page-id="landing-page">
    <div class="container u_t-c">
      <h2>Welcome</h2>

      <p class="u_mb-xl">This is a custom cms-system that lets you create, update and delete users and associated products. Get started by:</p>
      <a class="page-link button invisible u_no-float" data-go-to-page="add-user">Creating a new user <i class="material-icons">add</i></a>
      <a class="page-link button positive u_no-float" data-go-to-page="login">Sign in <i class="material-icons">arrow_forward</i></a>
    </div>
  </div>
  
  <!-- Sign in -->
  <div class="page" data-page-id="login">
    <div class="container small">
      <h2>Sign in</h2>
      <div id="txtLoginStatus" class="message error">
        <p>Could not login. Check your info again.</p>
      </div>
      <form id="frmLogIn">
        <label for="txtMailOrPhone">Email or phone number:</label>
        <input type="text" name="txtMailOrPhone" placeholder="Enter your email adress or phone number">
        <label for="txtPassword">Password:</label>
        <input type="password" name="txtPassword" class="u_mb-lg">
        <a tabindex="1" id="btnSignIn" class="button positive u_mb-xxl">Sign in  <i class="material-icons">arrow_forward</i></a>
        <a class="page-link button invisible" data-go-to-page="add-user"> Not a member? Sign up here <i class="material-icons">add</i></a>
      </form>
    </div>
  </div>

  <!-- Sign up -->
  <div class="page" data-page-id="add-user">
    <div class="container small">
      <h2>Sign up</h2>
      <div id="msgAddUserMissingFields" class="message error">
        <p>Please fill out all the required fields to sign up.</p>
      </div>
      <div id="msgAddUserPhoneOrEmailTaken" class="message error">
        <p>Email or phone is already taken. Perhaps you forgot your login-informations?</p>
      </div>
      <form id="frmSignUp">
        <label for="txtFirstName">First Name</label>
        <input type="text" name="txtFirstName" class="required">

        <label for="txtLastName">Last Name</label>
        <input type="text" name="txtLastName" class="required">

        <label for="txtPhone">Phone number</label>
        <input type="phone" name="txtPhone" class="required">

        <label for="txtEmail">Email adress</label>
        <input type="email" name="txtEmail" class="required">

        <label for="filePicture">Profile picture</label>
        <input type="file" name="fileProfilePicture" accept="image/gif, image/jpeg, image/png"> 

        <label for="txtPassword">Password</label>
        <input type="password" name="txtPassword" class="required">

        <label for="txtUserRole">Select a user role</label>
        <select name="txtUserRole" class="u_mb-xl">
          <option value="user">Standard</option>
          <option value="admin">Admin</option>
        </select>

        <div class="checkbox">
          <input type="checkbox" id="boolSubscribe" name="boolSubscribe">
          <label for="boolSubscribe">Subscribe to out newsletter?</label>
        </div>

        <a id="btnSignUp" class="button positive u_mb-xxl">Signup <i class="material-icons">arrow_forward</i></a>
        <a class="page-link button invisible" data-go-to-page="login"><i class="material-icons">arrow_back</i> Cancel</a>
        
      </form>
    </div>
  </div>';
}
  
$sResponse = json_encode($jResponse);
echo $sResponse;
exit;
?>