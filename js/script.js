/**
 * NOTES:
 * I've gone for a OOP-inspired style.
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
 * I've implemented a polyfill which can be found in the bottom of this file.
 */
(function() {
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
     * By wrapping the page-object in a self-invoking function i also make
     * sure to not pollute the global scope and make data harder to get from
     * the client
     * 
     * NOTE:
     * Im aware that i dont have to specify all the stuff that is being set 
     * to undefined. My reasoning for doing this is to have a reference for 
     * what data im using/expecting in a central location. Otherwise it gets
     * very hard to reason about what and where data is set. 
     */
    products: {
      visible: undefined, // <- will be set when filtering products
      all: undefined, // <- will be set after request
      sorting: "none", // <- Can be "ascending", "descending" and "none". Used when rendering products
      viewMode: "grid" // <- can be "grid" and "map"
    },
    cart: [], // <- Products will be inserted here dynamically
    currentUser: undefined, // <- will be set after request
    currentUserPos: undefined,
    users: {
      all: undefined
    },
    requests: [],
    currentPage: undefined,
    sounds: {
      notificationPositive: new Audio('sounds/notification-positive.mp3'),
      notificationNegative: new Audio('sounds/notification-negative.mp3')
    },
    maps: {
      // Add 
      addProduct: undefined,
      addProductMarker: undefined,
      addProductMarkerPos: "yada",

      // Edit
      editProduct: undefined,
      editProductMarker: undefined,
      editProductMarkerPos: "yada",

      // Vidw products
      viewProducts: undefined,
      viewProductsMarkers: []
    }
  },


  /*************************
   NAVIGATION AND INTERFACE
  *************************/
  goTo: function(pageId) {
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
        var activePageLinks = document.querySelectorAll(".page-link.active")
        removeAllActiveClasses(activePageLinks);
        this.classList.add("active");

        if (pageLinkId == "edit-user") {
          self.updateEditUserPage();
        }
        self.goTo(pageLinkId);
      });
    }

    function removeAllActiveClasses(list) {
      for (var i = 0; i < list.length; i++) {
        list[i].classList.remove("active");
      }
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
     * 1)  Get and render the pages (html markup)
     * 2)  Get and render the menu (html markup)
     * 
     * <First paint>
     * 
     * 2b) Get the products while the rest of the script continues (these doesn't have to be ready
     *     since they selv-initialize their functionality and rendering)
     * 3)  Update all element-references from page.els
     * 4)  Assign event-listeneres and functionality to all the rendered buttons and elements
     * 4b) Get the maps. These are not crucial for first paint so if they are not finished
     *     the page will not wait for them.
     * 4c) Render the cart. This is also not super crucial for first paint, so this doesn't
     *     have to finish before page-render
     * 5)  Navigate to the product-page (if user is logged in else it'll go to landingpage)
     * 
     * <Page is usable>
     * 
     * 6) If the user is admin also get the users (this can happen in the back)
     */

    var self = this;
    var curUser = this.data.currentUser;

    // (1)
    self.getPages(waitForPages);
    // (2)
    function waitForPages() {
      self.getMenu(waitForMenu);
      if (curUser) {
        // (2b)
        self.getProducts();
      }
    }
    // (3)
    function waitForMenu() {
      self.updateEls(waitForEls);
    }
    // (4)
    function waitForEls() {
      self.attachFormEvents(); // This function can be re-called if something changes and you need to re-assign events      
      self.updatePageNavigation();
      // (4b)
      self.initMaps();
      if (curUser) {
        // (4c)
        self.renderCart();
        // (5)
        self.goTo("view-products");
        if (curUser.role == "admin") {
          // (6)
          self.getUsers();
        }
      } else {
        // (5)
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
     * inserted). Maybe do a try ... catch ? I guess this would
     * also break the page if i.e. the first button is missing,
     * but i could output nice error messages :)
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
    if (typeof btnUseCurrentLocationAdd !== "undefined") {
      btnUseCurrentLocationAdd.addEventListener("click", page.handleGettingOfUserLocation);
    }
    if (typeof btnUseCurrentLocationEdit !== "undefined") {
      btnUseCurrentLocationEdit.addEventListener("click", page.handleGettingOfUserLocation);
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
        // If use has a cart use it
        if (res.user.cart) {
          page.data.cart = res.user.cart;
        // If not set the cart to be empty
        } else {
          res.user.cart = [];
        }
        page.getInterface();
        page.clearForm(frmLogIn);
        page.createNotification({
          type: "neutral",
          icon: "tag_faces",
          content: "Welcome back "+res.user.firstName+"!",
          desktopNotification: true
        })
      } else {
        page.createNotification({
          type: "negative",
          icon: "error",
          content: "Could not login. Check your info again."
        })
      }
    }
  },
  signUp: function() {
    page.checkForm(frmSignUp, function(status) {
      // The form is filled out and is fine, so will make the request
      if (status == "ok") {
        page._request({
          type: "POST",
          url: "api/add-user.php",
          form: frmSignUp,
          callback: handleResponse
        });
        function handleResponse(res) {
          // The request were succesful, a new user has been created, logged in and returned
          if (res.status == "succes") {
            page.data.currentUser = res.user;
            page.getInterface();
            page.clearForm(frmSignUp);
          // Couldn't create a user. Output an error to the client
          } else if (res.status == "error") {
            page.createNotification({
              type: "negative",
              icon: "error",
              content: "Email or phone is already taken. Perhaps you forgot your login-informations?"
            })
          }
        }
      // The form is not filled out so will not make a request
      } else {
        page.createNotification({
          type: "negative",
          icon: "error",
          content: "Please fill out all the required fields to sign up."
        })
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
      page.data.cart = [];
      page.getInterface();
      page.createNotification({
        type: "neutral",
        icon: "face",
        content: "See you soon",
        desktopNotification: true
      })
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
      // If the request were from an admin update all the users (so the list show the changes)
      if (page.data.currentUser.role == "admin") {
        page.getUsers();
      // If it were not an admin, update the current user
      } else {
        page.data.currentUser = res.user;
      }
      page.createNotification({
        type: "positive",
        icon: "check",
        content: "Your changes were saved"
      });
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
    
    var elFirstName = document.querySelector('[data-page-id="edit-user"] [name="txtFirstName"]');
    var elLastName = document.querySelector('[data-page-id="edit-user"] [name="txtLastName"]');
    var elPhone = document.querySelector('[data-page-id="edit-user"] [name="txtPhone"]');
    var elEmail = document.querySelector('[data-page-id="edit-user"] [name="txtEmail"]');
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
      page.data.cart = undefined;
      page.createNotification({
        type: "neutral",
        icon: "delete",
        content: "User succesfully deleted."
      })
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
            page.createNotification({
              type: "neutral",
              icon: "delete",
              content: "User succesfully deleted."
            });
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
        if (res.signedIn) {
          page.data.currentUser = res.user;
          if (res.user.cart) {
            page.data.cart = res.user.cart;
          } else {
            page.data.cart = [];
          }
        } 
        page.getInterface();
      },
    });
  },


  /**********************
   PRODUCTS
  **********************/
  addProduct: function() {
    page.checkForm(frmAddProduct, function(status) {
      /* 
        Checks if the radio-buttons for "use current location" is checked. If it is, it will
        use whatever position is stored in page.data.currentUserPos. If it is not it will use
        the location of the marker on the map and output an error if no marker is placed 
      */
      var sProductLocation = useCurrentLocationAdd.checked ? page.data.currentUserPos : page.data.maps.addProductMarkerPos;
      sProductLocation = JSON.stringify(sProductLocation);

      if (status == "ok" && sProductLocation) {
        var frmDataAddProduct = new FormData(frmAddProduct);
        frmDataAddProduct.append("location", sProductLocation);
        page._request({
          type: "POST",
          url: "api/add-product.php",
          data: frmDataAddProduct,
          callback: function(res) {
            page.createNotification({
              type: "positive",
              icon: "check",
              content: "Your product were added"
            });
            page.getProducts();
            page.clearForm(frmAddProduct);
          }
        });
      } else if (status != "ok" && !sProductLocation){
        page.createNotification({
          type: "negative",
          icon: "error",
          content: "Please fill out all the required fields to add the product."
        })
      } else if (status == "ok" && !sProductLocation) {
        page.createNotification({
          type: "negative",
          icon: "error",
          content: "Please choose a location"
        })
      }
    })
  },
  editProduct: function() {
    var sProductLocation = useCurrentLocationEdit.checked ? page.data.currentUserPos : page.data.maps.editProductMarkerPos;
    sProductLocation = JSON.stringify(sProductLocation);
    var frmDataEditProduct = new FormData(frmEditProduct);
    frmDataEditProduct.append("location", sProductLocation);

    page._request({
      type: "POST",
      url: "api/edit-product.php",
      data: frmDataEditProduct,
      callback: function(res) {
        page.getProducts();
        page.goTo("view-products");
        page.createNotification({
          type: "positive",
          icon: "check",
          content: "Your shanges were saved"
        })
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
        page.createNotification({
          type: "neutral",
          icon: "delete",
          content: "Product deleted"
        })
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
        page.renderProducts(initFiltersSortingAndViews);

        // Will run when products are rendered to the dom
        function initFiltersSortingAndViews() {
          page.enableProductFiltering();
          page.enableProductSorting();
          page.enableProductViews();
        }
      }
    });
  },
  renderProducts: function(callback) {
    var sProducts = "";
    var products = page.data.products.visible;
    
    // If a sorting is defined sort the products the way it is defined
    // before render. Else dont sort the products by skipping this step
    if (page.data.products.sorting !== "none") {
      products = page.sortProducts(products, "price", page.data.products.sorting);
    }
    
    // If there is any products
    if (products.length) {  
      var curUser = page.data.currentUser;

      for (var i = 0; i < products.length; i++) {
        // Toggle rendering of edit-buttons
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
        var sProduct = '\
        <div class="product" data-product-id="'+products[i].id+'">\
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

        // Render markers on map
        // Create a marker for each product
        try {
          var marker = new google.maps.Marker({
            map: page.data.maps.viewProducts,
            position: products[i].location,
            productId: products[i].id
          })
          page.data.maps.viewProductsMarkers.push(marker);
          marker.addListener("click", page.updateProductInfoWindow)
        } catch(err) {
          /* Google is not yet defined. For the sake of loading the page as quickly
          as possible im not gonna wait for google maps to load before rendering the
          products, so if google isn't ready yet that's fine. I re-render the products
          when google maps finishes loading.
          */
        }
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
  renderProduct: function(options) {
    // Used to render only one product. Right now it's only used to render the info-window products after actions
    /**
     * options = {
     *  id: "ad9238ads",
     *  for: "infoWindow"
     * } 
     */

    var products = page.data.products.all;
    var curUser = page.data.currentUser;

    // Get product that matches the id
    var currentProduct;
    for (var i = 0; i < products.length; i++) {
      if (products[i].id == options.id) {
        currentProduct = products[i];
        break; // Stop the loop
      }
    } 

    if (curUser.id == currentProduct.createdBy ||curUser.role == "admin") {
      var sEditProduct = '<a class="edit-product btnEditProductLink">Edit</a>';
    } else {
      var sEditProduct = "";
    }
    // Toggle sold out or not sold out
    if (page.isProductSoldOut(currentProduct.id)) {
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
      if (page.data.cart[j].id == currentProduct.id) {
        iAmountOfProductInCart++;
      }
    }
    // Render product
    var sProduct = '<div class="product info-window" data-product-id="'+currentProduct.id+'">\
      '+sEditProduct+'\
      <div class="image" style="background-image: url(images/product-pictures/'+currentProduct.picture+')"></div>\
        <div class="product-details">\
          <div>\
            <p class="title">'+currentProduct.name+'</p>\
            <p class="price">'+currentProduct.price+' DKK</p>\
            <p class="quantity">'+(currentProduct.quantity - iAmountOfProductInCart)+' for sale</p>\
          </div>\
          '+sBtnAddProductToCart+'\
        </div>\
      </div>\
    </div>';


    return sProduct;
  },
  updateProductInfoWindow: function(e, options) {
    /**
     * NOTE:
     * This function got a little messy. Basically it's called in two
     * very different scenarios:
     * 1) Called be a marker "click"-event
     * 2) Called when adding products to cart with no event
     * 
     * Basically it will only attach eventlisteners and open if it's called
     * by a click. If it's called "manually" it will only update the content
     * of the window.
     */

    // Manual mode
    if (typeof e === "undefined"){
      var renderOptions = {
        id: options.id,
        for: "infoWindow"
      }

    // Event mode
    } else {
      var renderOptions = {
        id: this.productId,
        for: "infoWindow"
      }
    }
    page.data.maps.viewProductsInfoWindow.setContent(page.renderProduct(renderOptions));

    if (typeof e !== "undefined") {
      page.data.maps.viewProductsInfoWindow.open(page.data.maps.viewProducts, this);
      page.updateEditProductLinks();
      page.updateAddToCartLinks();
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
      if a product were to have more data that could be edited
      than what is displayed in the overview this makes sense,
      else it's a request that isn't really needed.
      Right now this makes sense for the location, but all the
      products is stored in the client anyways. This calls for
      a refactor...
    */

    page.activateSpinner();
    page._request({
      type: "GET",
      url: "api/get-product.php?productId="+productId,
      callback: handleResponse
    })
    function handleResponse(res) {
      // Update form values
      var elName = document.querySelector('[data-page-id="edit-product"] [name="txtProductName"]');
      var elPrice = document.querySelector('[data-page-id="edit-product"] [name="txtProductPrice"]');
      var elId = document.querySelector('[data-page-id="edit-product"] [name="txtProductId"]');
      var elQuantity = document.querySelector('[data-page-id="edit-product"] [name="txtProductQuantity"]');
      elName.value = res.name;
      elPrice.value = res.price;
      elId.value = res.id;
      elQuantity.value = res.quantity;

      page.data.maps.editProduct.setCenter(res.location);
      page.data.maps.editProduct.setZoom(8);
      page.placeMarker({
        marker: page.data.maps.editProductMarker,
        positionObject: "editProductMarkerPos",
        coords: res.location,
        mode: "manual"
      })

      // Change navigation and disable spinner
      page.goTo("edit-product");
      page.deactivateSpinner();
      page.attachFormEvents();
    }
  },
  handleGettingOfUserLocation: function() {
    var type = this.getAttribute("data-type");
    var currentRadio = document.querySelector('.radio[data-type="'+type+'"] input');
    if (type == "edit") {
      btnUseCurrentLocationEdit.removeEventListener("click", page.handleGettingOfUserLocation);
    } else if (type == "add") {
      btnUseCurrentLocationAdd.removeEventListener("click", page.handleGettingOfUserLocation);
    }
    page._getUserLocation(handlePosition);
    function handlePosition(pos, status) {
      if (status == "ok") {
        currentRadio.checked = true;
        page.data.currentUserPos = pos;
      } else {
        currentRadio.checked = false;
        btnUseCurrentLocationAdd.addEventListener("click", page.handleGettingOfUserLocation);
        btnUseCurrentLocationEdit.addEventListener("click", page.handleGettingOfUserLocation);
      }
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
      if (sortingWay == "ascending") {
        return a[sortingKey] - b[sortingKey]
      } else {
        return b[sortingKey] - a[sortingKey];
      }
    });
    return arrayToSort;
  },
  enableProductViews: function() {
    var viewProductsPage = document.querySelector('[data-page-id="view-products"]');
    btnShowAsGrid.addEventListener("click", function(e) {
      viewProductsPage.classList.add("view-mode-grid")
      btnShowAsGrid.classList.add("selected")
      viewProductsPage.classList.remove("view-mode-map")
      btnShowAsMap.classList.remove("selected")
    })
    btnShowAsMap.addEventListener("click", function(e) {
      viewProductsPage.classList.add("view-mode-map")
      btnShowAsMap.classList.add("selected")
      viewProductsPage.classList.remove("view-mode-grid")
      btnShowAsGrid.classList.remove("selected")
    })
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
      page.updateProductInfoWindow(undefined, {id: productId});
      page.renderProducts();
      page.updateCartIndicator();
      page.renderCart();
      page.saveCart();
      page.createNotification({
        type: "neutral",
        icon: "add_shopping_cart",
        content: "Product added to cart"
      })
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
    page.data.cart.splice(iCartDeleteIndex, 1);
    page.renderCart();
    page.renderProducts();
    page.saveCart();
    page.createNotification({
      type: "neutral",
      icon: "shopping_cart",
      content: "Product removed from cart"
    });
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
    var frmCartProducts = new FormData();
    var sCartProducts = JSON.stringify(page.data.cart);
    frmCartProducts.append("cartProducts", sCartProducts);
    page.createNotification({
      type: "positive",
      icon: "check",
      content: "Succesfully bought "+page.data.cart.length+" products.",
      desktopNotification: true
    });

    page._request({
      type: "POST",
      data: frmCartProducts,
      url: "api/buy-products.php",
      callback: handleResponse
    })
    function handleResponse(res) {
      page.data.cart = [];
      page.renderCart();
      page.getProducts();
      page.saveCart();
    }
  },
  saveCart: function() {
    var frmCartProducts = new FormData();
    var sCartProducts = JSON.stringify(page.data.cart);
    frmCartProducts.append("cartProducts", sCartProducts);
    page._request({
      type: "POST",
      data: frmCartProducts,
      url: "api/save-cart.php"
    })
  },


  /**********************
   NOTIFICATIONS
  **********************/
  createNotification: function(options) {
    /**
     * DOCS:
     * Name        Type      Example
     * --------------------------------------------
     * options     <object>  
     * -> type     <string>  "negative", "positive", "neutral"
     * -> icon     <string>  "check" - any material-icons icon
     * -> content  <string>  "Product deleted" - message to user
     * -> desktopNotification  <bool>    true, false
     */

    // Notification settings 
    var iDuration = 5500;
    var iAnimationDuration = 300;

    // Close icon
    var closeIcon = document.createElement("div");
    closeIcon.classList.add("close-notification");
    closeIcon.innerHTML = '<i class="material-icons">close</i>';
    closeIcon.addEventListener("click", removeActiveClass);

    // Notification itself
    var notification = document.createElement("div");
    notification.classList.add("notification", options.type)
    notification.innerHTML = '\
      <div class="icon">\
        <i class="material-icons">'+options.icon+'</i>\
      </div>\
      <div class="content">\
        <p>\
          '+options.content+'\
        </p>\
      </div>';
    notification.insertAdjacentElement("beforeend", closeIcon);

    // Add notification to document
    var body = document.getElementsByTagName("body")[0];
    body.insertAdjacentElement("beforebegin", notification);

    // Set timeout for removal of the notification
    setTimeout( addActiveClass, 50);
    setTimeout( removeActiveClass, iDuration);
    setTimeout( removeNotification, iDuration + iAnimationDuration);
    function addActiveClass() {
      notification.classList.add("active");
    }
    function removeActiveClass() {
      notification.classList.remove("active");
    }
    function removeNotification() {
      notification.parentNode.removeChild(notification);
    }

    // Play sound
    if (options.type == "positive" || options.type == "neutral") {
      page.data.sounds.notificationPositive.play();
    }
    if (options.type == "negative") {
      page.data.sounds.notificationNegative.play();
    }

    // Also use a desktop notification
    if (options.desktopNotification) {
      if (Notification.permission === "granted") {
        displayNotification();
      }
      // Otherwise, we need to ask the user for permission
      else if (Notification.permission !== 'denied') {
        Notification.requestPermission(function (permission) {
          // If the user accepts, let's create a notification
          if (permission === "granted") {
            displayNotification();
          }
        });
      }

      function displayNotification() {
        var notification = new Notification(options.content);
      }
    }
  },


  /**********************
   HELPERS / UTILITIES
  **********************/
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

        if (options.callback) {
          options.callback(response);
        }

        /**
         * NOTE:
         * To see all the requests in the console uncomment line below. It's
         * quite fun to see what the page is doing when you click around
         */
        //console.log(response)

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
    /**
     * Searches thorugh and array of elements and returns the first that contains
     * a certain class.
     */

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
      options.elementList[i].addEventListener(options.eventType, options.callback, true)
    }
  },
  _getUserLocation: function(callback) {
    var options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };
    // If there isn't already a position in the system, go ahead and get it
    if (!page.data.currentUserPos) {
      page.activateSpinner();
      navigator.geolocation.getCurrentPosition(succes, error, options);
      function succes(pos) {
        page.createNotification({
          type: "positive",
          icon: "location_on",
          content: "Yay. Succesfully obtained your location"
        })
        var position = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        }
        var status = "ok";
        callback(position, status);
        page.deactivateSpinner();
      }
      function error() {
        page.createNotification({
          type: "negative",
          icon: "error",
          content: "Couldn't get your location. Manually choose your location instead"
        })
        page.deactivateSpinner();
        status = "error";
        callback(false, status);
      }
    } else {
      // Already obtained user position. I'm assuming it hasn't changed.
      // A million-dollar solution would silently check if the position
      // is somewhat similar to the one in memory and only change it if
      // it isn't.
      var status = "ok";
      callback(page.data.currentUserPos, status)
    }
  },
  checkForm: function(form, callback) {
    var errors = 0;
    for (var i = 0; i < form.children.length; i++) {
      var curEl = form.children[i];
      /* 
        Loop through all children of the form
        To all children of type input or select (Add more if needed)
        -> Since adding this function i've come across some edge-cases
        where this isn't enough. For-example when using form-elemnts
        nested inside something. Only top level children are checked
        and doing a nested loop for each elements children seems
        a little overkill. Maybe i should add a data-attribute that
        notifies this function that this element either needs to be 
        checked or contains children that needs to be checked..
        like data-form-check="this" and data-form-check="children":

        <input data-form-check="this">
        <div data-form-check="children">
          <label>Yada</label>
          <textarea data-form-check="this"></textarea>
        </div>

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


  /**********************
   MAPS
  **********************/
  initMaps: function() {
    /* 
      This function will only work if the maps-script have finished loading.
      The function however is called as soon as a user is logged in an is 
      requesting the interface. Therefor it will try to initMaps every 100ms
      until it succeeds. In my experience this is one try.
    */
    try {
      page.initAddProductMap();
      page.initEditProductMap();
      page.initViewProductsMap();
    } catch (err) {
      setTimeout(page.initMaps, 100);
    }
  },
  initAddProductMap: function() {
    // Add product map
    page.data.maps.addProduct = new google.maps.Map(document.getElementById('addProductMapContainer'), {
      zoom: 6,
      center: {lat: 55.793398, lng:10.903758}
    });
    page.data.maps.addProductMarker = new google.maps.Marker({
      map: page.data.maps.addProduct
    });
    page.data.maps.addProduct.addListener("click", function(e) {
      page.placeMarker({
        e: e,
        marker: page.data.maps.addProductMarker,
        positionObject: "addProductMarkerPos",
        mode: "event"
      })
    });
  },
  initEditProductMap: function() {
    // Add product map
    page.data.maps.editProduct = new google.maps.Map(document.getElementById('editProductMapContainer'), {
      zoom: 7,
      center: {lat: 55.793398, lng:10.903758}
    });
    page.data.maps.editProductMarker = new google.maps.Marker({
      map: page.data.maps.editProduct
    });
    page.data.maps.editProduct.addListener("click", function(e) {
      page.placeMarker({
        e: e,
        marker: page.data.maps.editProductMarker,
        positionObject: "editProductMarkerPos",        
        mode: "event"
      })
    })
  },
  initViewProductsMap: function() {
    // Add product map
    page.data.maps.viewProducts = new google.maps.Map(document.getElementById('viewProductsMap'), {
      zoom: 7,
      center: {lat: 55.793398, lng:10.903758}
    });
    page.data.maps.viewProductsInfoWindow = new google.maps.InfoWindow();
    page.renderProducts();
  },
  placeMarker: function(options ) {
    
    /**
     * MINI-DOCS:
     * 
     * <object>  options = {
     * <event>     e: event,     
     * <object>    marker: page.data.maps.editProductMarker,
     * <string>    positionObject: "editProductMarkerPos",
     * <string>    mode: "event" or "manual"
     * <object>    coords: {
     * <number>      lat: 123123,
     * <number>      lng: 1239213
     *             },
     *           } 
     */

    // If manual coordinates are passed to the function use those
    if (options.mode == "manual") {
      var coords = {
        lat: options.coords.lat,
        lng: options.coords.lng
      }
    // Else assume that theres is a function giving coordinates
    } else if (options.mode == "event") {
      var coords = {
        lat: options.e.latLng.lat(),
        lng: options.e.latLng.lng()
      }
    } else {
      throw("Error in 'placeMarker()'. Parameters doesn't match the expected");
    }
    options.marker.setPosition(coords);

    /* 
      I initially passed the object itself (page.data.maps.editProductMarkerPos)
      but ran into a bug where i couldn't set the value. Im thinking this might
      be because im passing a shallow copy of the objects data and not the acutal
      object-reference, so im basically updating a copy of the original object.
      I cant really make sense of it, so if you read this, i would appreciate some
      feedback on why this wouldn't work if there is some obvious reason.
      Now i basically just use the square-brackets-notation to select the oject
      instead which works perfectly.
    */
    page.data.maps[options.positionObject] = coords;

  }
}
page.init();
})()





/**
 * I've relied on e.path without realising that this isn't
 * a standard feature. Therefore i have polyfilled it.
 * Full disclosure: this is copy-pasted from stackoverflow
 * But, just to show that im not blindly copy-pasting i will
 * try to explain what it does.
 * 
 * JS is a prototypal-inheritance based language. This means
 * that every event will inherit its properties and methods
 * from Event.prototype (this is also true for strings, object
 * numbers, arrays and so on - of course from String.prototype 
 * and so on). 
 * 
 * By checking if the prototype of event has the property "path"
 * i can see if the current browser have and e.path property.
 * If it doesn't this little snippet will continualy push the 
 * parent of the current element to an array until the parent
 * is the document or window, then it will return the array as
 * Event.path. Which basically is the same thing as chrome's
 * implementation of e.path. 
 
 
 if (copyPasting === "not allowed") {
   removeCodeBelow()
   alert("warn teachers that im now only supporting chrome")
 }
 
 */

if (!("path" in Event.prototype)) {
  Object.defineProperty(Event.prototype, "path", {
    get: function() {
      var path = [];
      var currentElem = this.target;
      while (currentElem) {
        path.push(currentElem);
        currentElem = currentElem.parentElement;
      }
      if (path.indexOf(window) === -1 && path.indexOf(document) === -1)
        path.push(document);
      if (path.indexOf(window) === -1)
        path.push(window);
      return path;
    }
  });
}