/**
 * NOTES:
 * In theory page could be named anything
 * BUT im referencing some stuff inside page with page.property/method
 * insted of this.property/method due to problems with 'this' being an
 * event, and me having to access that events properties. So if page
 * were to be renamed one should do a find and replace for "page."
 * and replace with "whatevernewname.".
 * I've wrapped the entire script in a self-invoking function to minize
 * security-problems, with client-side users accesing i.e. data about
 * themselves and changing their role or id or something. This is not 
 * really enough since one could potentially just edit the js file with
 * dev-tools and remove the self-invoking part, but it's better than
 * nothing i guess.
 * 
 * I've used event.path extensively in the project, but have just found
 * out that this is by far not a standard feature (almost chrome exclusive).
 * For this to work in every browser i would need to add a polyfill.
 * 
 * 
 */
/* (function() { */
var page = {
  els: {
    // Elements
    masterContainer: document.querySelector("#masterContainer"),
    pages: document.querySelectorAll(".page"),
    navigation: document.querySelector(".navigation"),
  },
  data: {
    /**
     * Data acts sort of like a store.
     * It's a primitive way of having a single source of truth, so that all 
     * "global" variables will only exist in one place. Data has no defined
     * mutation methods, so data is just directly modified which can lead to
     * unpredictable outcome.
     */
    products: {
      visible: undefined, // <- will be set when filtering products
      all: undefined, // <- will be set after request
      sorting: "none" // <- Can be "ascending", "descending" and "none". Used when rendering products
    },
    cart: [], // <- Products will be inserted here dynamically
    currentUser: undefined, // <- will be set after request
    users: {
      all: undefined
    },
    requests: [],
    currentPage: undefined
  },


  /*************************
   NAVIGATION AND INTERFACE
  *************************/
  goTo: function(pageId) {
    // console.log("goTo('"+pageId+"')");
    this.hideAllPages();
    var newPage = document.querySelector('[data-page-id="'+pageId+'"]');
    newPage.classList.add("active");
  },
  hideAllPages: function() {
    for (var i = 0; i < this.els.pages.length; i++) {
      this.els.pages[i].classList.remove("active");
    }
  },
  updatePageNavigation: function() {
    var self = this;
    var pageLinks = document.querySelectorAll(".page-link");
    for (var i = 0; i < pageLinks.length; i++) {
      pageLinks[i].addEventListener("click", function() {
        var pageLinkId = this.getAttribute("data-go-to-page");
        if (pageLinkId == "edit-user") {
          self.updateEditUserPage();
        }
        self.goTo(pageLinkId);
      });
    }
  },
  getPages: function(callback) {
    this._request({
      type: "GET",
      url: "api/get-pages.php",
      callback: handleResponse
    });
    function handleResponse(res) {
      masterContainer.innerHTML = res.markup;
      callback();
    }
  },
  getMenu: function(callback) {
    // Make request to api.
    // Api decides if user is logged in and thereby
    // which menu is relevant and returns that as 
    // a string
    var self = this;
    this._request({
      type: "GET",
      url: "api/get-menu.php",
      callback: handleResponse
    });
    function handleResponse(res) {
      self.els.navigation.innerHTML = res.markup;
      if (callback) { 
        callback();
      }
    }
  },
  getInterface: function() {
    /**
     * NOTE: This function is a little verbose, and might do a little more than what is needed
     * but it makes it easier to handle all the updating by sort of getting a fresh interface
     * everytime a critical event happens (like sign-in, sign-out, sign-up, creating, editing and deleting
     * products and users).
     * 
     * It prioritizes in this way:
     * 1) Get and render the pages (html markup)
     * 2) Get and render the menu (html markup)
     * 
     * <First paint>
     * 
     * 2b) Get the products while the rest of the script continues (these doesn't have to be ready
     *     since they selv-initialize their functionality)
     * 3) Update all element-references from page.els 
     * 4) Assign event-listeneres and functionality to all the rendered buttons and elements
     * 5) Navigate to the product-page
     * 
     * <Page is usable>
     * 
     * 6) If the user is admin also get the users (this can happen in the back)
     */

    var self = this;
    var curUser = this.data.currentUser;

    self.getPages(waitForPages);
    function waitForPages() {
      self.getMenu(waitForMenu);
      if (curUser) {
        self.getProducts();
        self._loadStateFromLocalStorage();
      }
    }
    function waitForMenu() {
      self.updateEls(waitForEls);
    }
    function waitForEls() {
      self.attachFormEvents(); // This function can be re-called if something changes and you need to re-assign events      
      self.updatePageNavigation();
      if (curUser) {
        self.renderCart();
        self.goTo("view-products");
        if (curUser.role == "admin") {
          self.getUsers();
        }
      } else {
        self.goTo("landing-page");
      }
    } 


  },
  updateEls: function(callback) {
    this.els.masterContainer = document.querySelector("#master-container");
    this.els.pages = document.querySelectorAll(".page");
    this.els.navigation = document.querySelector(".navigation");
    callback();
  },
  attachFormEvents: function() {
    /**
     * This is a bit stupid, but in order for the script
     * to not break, i cannot have a situation where a 
     * link isn't present. By doing a strict typechecking
     * of every button before assigining events i make
     * sure to not break the script if a button is missing
     * (which will happen with buttons that are dynamically
     * inserted). An alternative would be to break up fun
     */
    if (typeof btnSignUp !== "undefined") {
      btnSignUp.addEventListener("click", this.signUp);
    }
    if (typeof btnSignIn !== "undefined") {
      btnSignIn.addEventListener("click", this.signIn);
    }
    if (typeof btnSignOut !== "undefined") {
      btnSignOut.addEventListener("click", this.signOut);
    }
    if (typeof btnEditUser !== "undefined") {
      btnEditUser.addEventListener("click", this.editUser);
    }
    if (typeof btnDeleteUser !== "undefined") {
      btnDeleteUser.addEventListener("click", this.deleteUser);
    }
    if (typeof btnAddProduct !== "undefined") {
      btnAddProduct.addEventListener("click", this.addProduct);
    }
    if (typeof btnEditProduct !== "undefined") {
      btnEditProduct.addEventListener("click", this.editProduct);
    }
    if (typeof btnDeleteProduct !== "undefined") {
      btnDeleteProduct.addEventListener("click", this.deleteProduct);
    }
    if (typeof btnBuyProducts !== "undefined") {
      btnBuyProducts.addEventListener("click", this.buyProducts);
    }
  },


  /**********************
   USERS
  **********************/
  signIn: function() {
    page._request({
      type: "POST",
      url: "api/sign-in.php",
      form: frmLogIn,
      callback: handleResponse
    });
    function handleResponse(res) {
      if (res.login == "ok") {
        page.data.currentUser = res.user;
        page.getInterface();
        page.clearForm(frmLogIn);
      } else {
        page.activateMessage(txtLoginStatus);
      }
    }
  },
  signUp: function() {
    page.checkForm(frmSignUp, function(status) {
      if (status == "ok") {
        page._request({
          type: "POST",
          url: "api/add-user.php",
          form: frmSignUp,
          callback: handleResponse
        });
        function handleResponse(res) {
          if (res.status == "succes") {
            page.data.currentUser = res.user;
            page.getInterface();
            page.clearForm(frmSignUp);
          } else if (res.status == "error") {
            page.activateMessage(msgAddUserPhoneOrEmailTaken);
          }
        }
      } else {
        page.activateMessage(msgAddUserMissingFields);
      }
    });
  },
  signOut: function() {
    page._request({
      type: "GET",
      url: "api/sign-out.php",
      callback: handleResponse
    });
    function handleResponse() {
      page.data.currentUser = undefined;
      page.getInterface();
    }
  },
  editUser: function(e) {
    var jUserData = new FormData(frmEditUser);
    var sUserId = document.querySelector(".page.active .user").getAttribute("data-user-id");
    jUserData.append("txtId", sUserId);
    
    page._request({
      type: "POST",
      url: "api/edit-user.php",
      data: jUserData,
      callback: handleResponse
    });
    function handleResponse(res) {
      if (page.data.currentUser.role == "admin") {
        page.getUsers();
      } else {
        page.data.currentUser = res.user;
      }
      page.activateMessage(txtEditUserMessage);
      page.getInterface();
    }
  },
  updateEditUserPage: function(userId) {
    /* A admin has asked to edit a user that isn't the admin itself */
    if (this.data.currentUser.role == "admin" && userId) {
      for (var i = 0; i < this.data.users.all.length; i++) {
        if (this.data.users.all[i].id == userId) {
          var user = this.data.users.all[i];
        }   
      }
    /* Any type of user have asked to edit themselves */
    } else {
      var user = this.data.currentUser;
    }
    
    var elFirstName = document.querySelectorAll('[data-page-id="edit-user"] [name="txtFirstName"]')[0];
    var elLastName = document.querySelectorAll('[data-page-id="edit-user"] [name="txtLastName"]')[0];
    var elPhone = document.querySelectorAll('[data-page-id="edit-user"] [name="txtPhone"]')[0];
    var elEmail = document.querySelectorAll('[data-page-id="edit-user"] [name="txtEmail"]')[0];
    elFirstName.value = user.firstName;
    elLastName.value = user.lastName;
    elPhone.value = user.phone;
    elEmail.value = user.email;

    var htmlUser = '\
      <div class="user u_mb-xxl" data-user-id="'+user.id+'">\
        <div class="profile-picture" style="background-image: url(images/profile-pictures/'+user.profilePicture+')">\
        </div>\
        <div class="info">\
          <p class="name">'+user.firstName+' '+user.lastName+'</p>\
          <p class="phone">'+user.phone+'</p>\
          <p class="email">'+user.email+'</p>\
          <p class="role">'+user.role+'</p>\
        </div>\
      </div>'
    displayCurrentUserData.innerHTML = htmlUser;
  },
  deleteUser: function() {
    page._request({
      type: "GET",
      url: "api/delete-user.php",
      callback: handleResponse
    });
    function handleResponse(res) {
      page.data.currentUser = undefined;
      page.getInterface();
    }
  },
  getUsers: function() {
    page._request({
      type: "GET",
      url: "api/get-users.php",
      callback: handleResponse
    });
    function handleResponse(res) {
      page.data.users.all = res;
      page.renderUsers();
    }
  },
  renderUsers: function() {
    var htmlUsers = "";
    var users = page.data.users.all;
    for (var i = 0; i < users.length; i++) {
      // Dont render the admin user itself
      if (users[i].id !== page.data.currentUser.id) {
        htmlUsers += '\
        <div class="user">\
          <div class="profile-picture" style="background-image: url(images/profile-pictures/'+users[i].profilePicture+')">\
          </div>\
          <div class="info">\
            <p class="name">'+users[i].firstName+' '+users[i].lastName+'</p>\
            <p class="phone">'+users[i].phone+'</p>\
            <p class="email">'+users[i].email+'</p>\
            <p class="role">'+users[i].role+'</p>\
          </div>\
          <div class="dropdown">\
            <div class="title">\
              <i class="material-icons">more_vert</i>\
            </div>\
            <div class="content">\
              <a class="btnAdminEditUser" data-user-id="'+users[i].id+'"><i class="material-icons">edit</i>Edit user</a>\
              <a class="btnAdminDeleteUser" data-user-id="'+users[i].id+'"><i class="material-icons">delete</i>Delete user</a>\
            </div>\
          </div>\
        </div>'
      }
    }
    usersContainer.innerHTML = htmlUsers;
    page.enableAdminUserEdit();
    page.enableAdminUserDelete();
  },
  enableAdminUserEdit: function() {
    var btnsEditUser = document.querySelectorAll(".btnAdminEditUser");
    for (var i = 0; i < btnsEditUser.length; i++) {
      btnsEditUser[i].addEventListener("click", function(e) {
        console.log(e);
        var currentElement = this;
        var currentElementContainer = page._getEl(e.path, "user");
        var sUserId = this.getAttribute("data-user-id");
        page.updateEditUserPage(sUserId);
        page.goTo("edit-user");
      });
    }
  },
  enableAdminUserDelete: function() {
    var btnsDeleteUser = document.querySelectorAll(".btnAdminDeleteUser");
    for (var i = 0; i < btnsDeleteUser.length; i++) {
      btnsDeleteUser[i].addEventListener("click", function(e) {
        var currentElement = this;
        var currentElementContainer = page._getEl(e.path, "user");
        var sUserId = this.getAttribute("data-user-id");
        var frmData = new FormData();
        frmData.append("sUserId", sUserId);
        page._request({
          type: "POST",
          url: "api/delete-user.php",
          data: frmData,
          callback: function() {
            currentElementContainer.classList.add("deleted");
          }
        });
      });
    }
  },
  IsUserSignedIn: function() {
    page._request({
      type: "GET",
      url: "api/is-user-signed-in.php",
      callback: function(res) {
        page.data.currentUser = res.user;
        page.getInterface();
      },
    });
  },


  /**********************
   PRODUCTS
  **********************/
  addProduct: function() {
    page.checkForm(frmAddProduct, function(status) {
      if (status == "ok") {
        page._request({
          type: "POST",
          url: "api/add-product.php",
          form: frmAddProduct,
          callback: function() {
            page.activateMessage(txtAddProductMessage);
            page.getProducts();
            page.clearForm(frmAddProduct);
          }
        });
      } else {
        page.activateMessage(msgAddProductMissingFields)
      }
    })
  },
  editProduct: function() {
    page._request({
      type: "POST",
      url: "api/edit-product.php",
      form: frmEditProduct,
      callback: function(res) {
        page.getProducts();
        page.goTo("view-products");
      }
    });
  },
  deleteProduct: function() {
    page._request({
      type: "POST",
      url: "api/delete-product.php",
      form: frmEditProduct,
      callback: function(res) {
        page.getProducts();
        page.goTo("view-products");
        page.activateMessage(txtDeleteProductMessage);
      }
    });
  },
  getProducts: function() {
    page._request({
      type: "GET",
      url: "api/get-products.php",
      callback: function(products) {
        page.data.products.all = products;
        page.data.products.visible = products;
        page.renderProducts( initFiltersAndSorting );
        function initFiltersAndSorting() {
          page.enableProductFiltering();
          page.enableProductSorting();
        }
      }
    });
  },
  renderProducts: function(callback) {
    //console.log("Rendering products. Sorting: "+page.data.products.sorting)
    var sProducts = "";
    var products = page.data.products.visible;

    // If a sorting is defined sort the products the way it is defined
    // before render. Else dont sort the products by skipping this step
    if (page.data.products.sorting !== "none") {
      products = page.sortProducts(products, "price", page.data.products.sorting);
    }

    if (products.length) {  
      for (var i = 0; i < products.length; i++) {
        
        // Toggle features based on state

        // Toggle rendering of edit-buttons
        var curUser = page.data.currentUser;
        if (curUser.id == products[i].createdBy ||curUser.role == "admin") {
          var sEditProduct = '<a class="edit-product btnEditProductLink">Edit</a>';
        } else {
          var sEditProduct = "";
        }
        // Toggle sold out or not sold out
        if (page.isProductSoldOut(products[i].id)) {
          var sBtnAddProductToCart = '<a class="button sold-out u_no-float">No more available<i class="material-icons">shopping_cart</i></a>';
        } else {
          var sBtnAddProductToCart = '<a class="button positive u_no-float btnAddProductToCart">Add to cart<i class="material-icons">add_shopping_cart</i></a>';
        }
        /* Dynamically update quantity based on how many is in the cart
           The naming of the var iAmountOfProductInCart is intentionally not
           amountOfProducts because it is amount of a single product
        */
        var iAmountOfProductInCart = 0;
        for (var j = 0; j < page.data.cart.length; j++) {
          if (page.data.cart[j].id == products[i].id) {
            iAmountOfProductInCart++;
          }
        }
      
        // Render product
        var sProduct = '<div class="product" data-product-id="'+products[i].id+'">\
          '+sEditProduct+'\
          <div class="image" style="background-image: url(images/product-pictures/'+products[i].picture+')"></div>\
            <div class="product-details">\
              <div>\
                <p class="title">'+products[i].name+'</p>\
                <p class="price">'+products[i].price+' DKK</p>\
                <p class="quantity">'+(products[i].quantity - iAmountOfProductInCart)+' for sale</p>\
              </div>\
              '+sBtnAddProductToCart+'\
            </div>\
          </div>\
        </div>';
        sProducts += sProduct;
      }
    } else {
      sProducts = "<p class='u-mlr-auto'>No products found...</p>";
    }
    productContainer.innerHTML = sProducts;
    page.updateEditProductLinks();
    page.updateAddToCartLinks();
    txtVisibleProductStatus.innerText = "Showing "+products.length+" out of "+page.data.products.all.length+" products";

    // First time products are fetched a callback will be present.
    // The callback will create event-listeners for the filtering
    // and sorting. Later in the code the render-function will be
    // called without a callback.
    if (callback) {
      callback();
    }
  },
  updateEditProductLinks: function() {
    /**
      * The edit-lnks that are dynamically placed on the products if a 
      * user owns the listed product or is admin.
      */
    page._addEvents({
      elementList: document.querySelectorAll(".btnEditProductLink"),
      callback: function(e) {
        var currentProduct = page._getEl(e.path, "product");
        var productId = currentProduct.getAttribute("data-product-id");
        page.updateEditProductForm(productId);
      }
    });
  },
  updateAddToCartLinks: function() {
    page._addEvents({
      elementList: document.querySelectorAll(".btnAddProductToCart"),
      callback: function(e) {
        var currentProduct = page._getEl(e.path, "product");
        var productId = currentProduct.getAttribute("data-product-id");
        page.addProductToCart(productId);
      }
    });
  },
  updateEditProductForm: function(productId) {
    /* 
      This should be refactored. Since all the needed data already exists inside
      the products array there is really no need for fetching the product.
      On the other hand, if a product were to have more data that could be edited
      than what is displayed this makes sense
    */


    page.activateSpinner();
    page._request({
      type: "GET",
      url: "api/get-product.php?productId="+productId,
      callback: handleResponse
    })
    function handleResponse(res) {
      // Update form values
      var elName = document.querySelectorAll('[data-page-id="edit-product"] [name="txtProductName"]')[0];
      var elPrice = document.querySelectorAll('[data-page-id="edit-product"] [name="txtProductPrice"]')[0];
      var elId = document.querySelectorAll('[data-page-id="edit-product"] [name="txtProductId"]')[0];
      var elQuantity = document.querySelectorAll('[data-page-id="edit-product"] [name="txtProductQuantity"]')[0];
      elName.value = res.name;
      elPrice.value = res.price;
      elId.value = res.id;
      elQuantity.value = res.quantity;

      // Change navigation and disable spinner
      page.goTo("edit-product");
      page.deactivateSpinner();
      page.attachFormEvents();
    }
  },
  enableProductFiltering: function() {
    inputFilterProducts.addEventListener("keyup", page.filterProducts);
  },
  filterProducts: function(e) {
    clearTimeout(timeout);
    var timeout = setTimeout(function() {
      var sSearchString = e.target.value;
      var regEx = new RegExp(sSearchString, 'gi');
      var products = page.data.products.all;
      // Sets the visible products to null
      page.data.products.visible = [];
      for (var i = 0; i < products.length; i++) {
        if ( products[i].name.search(regEx) !== -1 && typeof products[i].name !== "null") {
          // Add products that match to the visible array
          page.data.products.visible.push( products[i] );
        }      
      }
      page.renderProducts();
    }, 100);
  },
  enableProductSorting: function() {
    btnSortAscending.addEventListener("click", function() {
      page.data.products.sorting = "ascending";
      btnSortAscending.classList.add("selected");
      btnSortDecending.classList.remove("selected");
      page.renderProducts();
    })
    btnSortDecending.addEventListener("click", function() {
      page.data.products.sorting = "descending";
      btnSortDecending.classList.add("selected");
      btnSortAscending.classList.remove("selected");
      page.renderProducts();
    })
  },
  sortProducts: function(arrayToSort, sortingKey, sortingWay) {
    arrayToSort.sort(function(a,b) {
    //page.data.products.visible.sort(function(a,b) {
      if (sortingWay == "ascending") {
        return a[sortingKey] - b[sortingKey]
      } else {
        return b[sortingKey] - a[sortingKey];
      }
    });
    return arrayToSort;
  },


  /**********************
   SHOPPING CART
  **********************/
  addProductToCart: function(productId) {
    page.activateSpinner();
    page._request({
      type: "GET",
      url: "api/get-product.php?productId="+productId,
      callback: handleResponse
    })
    function handleResponse(res) {
      // Add product to cart
      page.data.cart.push(res);

      // Update relevant UI
      page.renderProducts();
      page.updateCartIndicator();
      page.renderCart();
    }
  },
  updateCartIndicator: function() {
    var cartIndicator = document.querySelector('.cart-indicator');
    cartIndicator.classList.add("active");
    setTimeout(function() {
      cartIndicator.classList.remove("active");
    }, 500);

    if (page.data.cart.length < 100) {
      cartIndicator.innerText = page.data.cart.length;
    } else {
      cartIndicator.innerText = "99+";
    }
  },
  renderCart: function(productId) {
    var htmlProducts = "";
    var products = page.data.cart;
    var totalPrice = 0;
    if (products.length == 0) {
      var htmlProducts = "<p class='u_t-c'>No products in cart. Add some from the products-page.</p>"; 
    } else {
      for (var i = 0; i < products.length; i++) {
        var sPicture = products[i].picture;
        var sName = products[i].name;
        var sPrice = products[i].price;
        var htmlProduct = '\
          <div class="cart-product">\
            <div \
              class="thumbnail" \
              style="background-image: url(images/product-pictures/'+sPicture+')">\
            </div>\
            <div class="info">\
              <p class="title">'+sName+'</p>\
              <p class="price">'+sPrice+' DKK</p>\
            </div>\
            <div class="actions">\
              <p class="btnRemoveFromCart remove-product" data-delete-index="'+i+'"><i class="material-icons">close</i></p>\
            </div>\
          </div>';
        htmlProducts += htmlProduct;
        totalPrice += Number(sPrice); // the Number() is not really needed but just to make sure...
      }
    }
    cartContainer.innerHTML = htmlProducts;
    txtCartStatus.innerText = "Total: "+totalPrice+" DKK";
    page.updateCartIndicator();
    page.updateRemoveFromCartButtons();
    page._saveStateToLocalStorage();
  },
  updateRemoveFromCartButtons: function() {
    page._addEvents({
      elementList: document.querySelectorAll(".btnRemoveFromCart"),
      callback: page.removeProductFromCart
    });
  },
  removeProductFromCart: function(e) {
    var btnRemoveFromCart = page._getEl(e.path, "btnRemoveFromCart");
    var iCartDeleteIndex = btnRemoveFromCart.getAttribute("data-delete-index");
    var sProductId = page.data.cart[iCartDeleteIndex].id;
    page.data.cart.splice( iCartDeleteIndex, 1 );
    page.renderCart();
    page.renderProducts();
  },
  isProductSoldOut: function(productId) {
    // Get amount of product with 'productId' in cart
    var cart = page.data.cart;
    var iAmountOfProductInCart = 0;
    for (var i = 0; i<cart.length; i++) {
      if (cart[i].id == productId) {
        iAmountOfProductInCart++;
      }
    }
    
    // Get available quantity of product with 'productId'
    var allProducts = page.data.products.all;
    for (var i = 0; i<allProducts.length; i++) {
      if (allProducts[i].id == productId) {
        var iAmountOfAvailableProduct = allProducts[i].quantity;
      }
    }

    if (iAmountOfProductInCart >= iAmountOfAvailableProduct) {
      return true;
    } else {
      return false;
    }
  },
  buyProducts: function() {
    console.log("buyProducts()");
    var frmCartProducts = new FormData();
    var sCartProducts = JSON.stringify(page.data.cart);
    frmCartProducts.append("cartProducts", sCartProducts);

    page._request({
      type: "POST",
      data: frmCartProducts,
      url: "api/buy-products.php",
      callback: handleResponse
    })
    function handleResponse(res) {
      console.log("buy-products.php: ", res);
      page.data.cart = [];
      page.renderCart();
      page.getProducts();
    }
  },


  /**********************
   NOTIFICATIONS
  **********************/
  createNotification: function() {
    
  },


  /**********************
   HELPERS / UTILITIES
  **********************/
  activateMessage: function(id) {
    var activeMessage = document.querySelectorAll(".message.active")
    for (var i = 0; i < activeMessage.length; i++) {
      activeMessage[i].classList.remove("active");
    }

    id.classList.add("active");
    setTimeout(function(){
      id.classList.remove("active");
    },10000)
  },
  activateSpinner: function() {
    spinner.classList.add("active");
  },
  deactivateSpinner: function() {
    spinner.classList.remove("active");
  },
  _request: function( options ) {
    /**
     * Expected options:
     * -------------------
     * type      <string>    
     * url       <string>    
     * form      <id/element>    
     * data      <form-encoded json>
     * callback  <function>
     * --------------------
     */ 

    // Activates spinner as soon as a request is made
    page.activateSpinner();
    
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        // Manage request
        var iIndexOfRequest = page.data.requests.indexOf(request);
        page.data.requests.splice(iIndexOfRequest,1);      
        
        // Send data to caller
        var response = JSON.parse(this.response);
        options.callback(response);

        // If there are no active request, deactivate spinner
        if (page.data.requests.length == 0) {
          page.deactivateSpinner();
        }
      }
    }
    request.open( options.type, options.url, true );
    if (options.type == "POST" && options.form) {
      var jData = new FormData( options.form )
      request.send(jData);
    } else if ( options.type == "POST" && options.data) {
      request.send(options.data);
    } else {
      request.send();
      // Manage requests
      page.data.requests.push(request);
    }

  },
  _getEl: function(searchList, searchWord) {
    for (var i = 0; i < searchList.length; i++) {
      if (searchList[i].classList.contains(searchWord)) {
        return searchList[i];
      }
    }
  },
  _addEvents: function(options) {
    /**
     *   DOCS:
     *   Options should be an object and contain the following properties: 
     *   
     *   Name          Type               Example
     *   ---------------------------------------------------------------------
     *   elementList:  <html collection>  document.querySelectorAll(".button")
     *   eventType:    <string>           "click"
     *   callback:     <function>         callback() -> will get the event back
     */

    if (!options.eventType) {
      options.eventType = "click";
    }

    for (var i = 0; i < options.elementList.length; i++) {
      options.elementList[i].addEventListener(options.eventType, options.callback)
    }
  },
  _saveStateToLocalStorage: function() {
    /**
     * Saves cart and products.soldOut to localstorage
     * 
     */
    var webShopState = {
      cart: page.data.cart
    }
    webShopState = JSON.stringify(webShopState);
    localStorage.setItem('webShopState', webShopState);
  },
  _loadStateFromLocalStorage: function() {
    var webShopState = localStorage.getItem('webShopState');
    webShopState = JSON.parse(webShopState);
    page.data.cart = webShopState.cart;
  },
  checkForm: function(form, callback) {
    var errors = 0;
    for (var i = 0; i < form.children.length; i++) {
      var curEl = form.children[i];
      /* 
        Loop through all children of the form
        To all children of type input or select (Add more if needed)
      */
      if ( 
        (!curEl.value) &&
        (curEl.classList.contains("required")) &&
        (curEl.tagName == "INPUT" || curEl.tagName == "SELECT") 
      ) {
        curEl.classList.add("error-value-missing");
        errors++;
      } else if ( 
        (curEl.value) &&
        (curEl.classList.contains("required")) &&
        (curEl.classList.contains("error-value-missing")) &&
        (curEl.tagName == "INPUT" || curEl.tagName == "SELECT") 
      ) {
        curEl.classList.remove("error-value-missing");
      }
    }

    if (errors == 0) {
      callback("ok");
    } else {
      callback("error");
    }
  },
  clearForm: function(form) {
    for (var i = 0; i < form.children.length; i++) {
      form.children[i].value = "";
    }
  },
  submitFormOnEnter: function() {
    window.addEventListener("keydown", function(e) {
      var btnSubmit = document.querySelector(".page.active .button.positive");
      if (e.key === "Enter" && btnSubmit) {
        btnSubmit.click();
      }
    });
  },
  init: function() {
    this.IsUserSignedIn();
    this.submitFormOnEnter();
  },
}
page.init();
/* })() */