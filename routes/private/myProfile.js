const express = require("express");
const router = express.Router();
const Product = require("../../models/Product");
const User = require("../../models/User");
const Order = require("../../models/Order");

const uploadCloud = require("../../config/cloudinary.config");

router.get("/home", async (req, res) => {
  res.render("private/home");
});

router.get("/home/products", async (req, res) => {
  const userId = req.session.currentUser._id;
  const usersProducts = [];
  try {
    const products = await Product.find();
    for (let i = 0; i < products.length; i++) {
      if (products[i].user != userId) {
        usersProducts.push(products[i]);
      }
    }
    const filteredProducts = usersProducts.filter(
      product => product.status === "Disponível"
    );
    res.render("private/home-products", { filteredProducts });
  } catch (error) {
    console.log(error);
  }
});

router.post("/home/products", async (req, res) => {
  const { category } = req.body;
  const userId = req.session.currentUser._id;
  const usersProducts = [];
  const products = await Product.find();
  for (let i = 0; i < products.length; i++) {
    if (products[i].user != userId) {
      usersProducts.push(products[i]);
    }
  }

  try {
    const filteredProducts = usersProducts.filter(product =>
      product.category.toLowerCase().includes(category.toLowerCase())
    );
    console.log(filteredProducts);

    res.render("private/filtered-products", { products: filteredProducts });
  } catch (error) {
    console.log(error);
  }
});

router.get("/products/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const product = await Product.findById(id);
    const user = await User.findById(product.user);

    const productUser = Object.assign({}, user, { product: product });
    console.log(productUser);

    res.render("private/products-details", productUser);
  } catch (error) {
    console.log(error);
  }
});

router.get("/my-profile", async (req, res, next) => {
  const userId = req.session.currentUser._id;
  try {
    const myUser = await User.findById(userId);
    console.log(myUser, userId);

    res.render("private/my-profile", { myUser });
  } catch (error) {
    console.log(error);
  }
});

router.get("/my-profile/edit", async (req, res) => {
  res.render("private/my-profile-edit");
});

router.get("/my-profile/my-products", async (req, res, next) => {
  const userId = req.session.currentUser._id;

  try {
    const products = await Product.find({ user: userId });

    const filteredProducts = products.filter(
      product => product.status === "Disponível"
    );
    res.render("private/my-products", { filteredProducts });
  } catch (error) {
    console.log(error);
  }
});

router.get("/my-profile/pending", async (req, res, next) => {
  const currentUser = req.session.currentUser._id;

  try {
    const orders = await Order.find({
      myUser: currentUser
    })
      .populate("userProducts")
      .populate("myProducts")
      .populate("myUser");

    const filteredOrders = orders.filter(order => order.accept === false);

    res.render("private/pending", { filteredOrders });
  } catch (error) {
    console.log(error);
  }
});

router.get("/my-profile/my-offers", async (req, res, next) => {
  const currentUser = req.session.currentUser._id;

  try {
    const orders = await Order.find({
      userId: currentUser
    })
      .populate("userProducts")
      .populate("myProducts")
      .populate("myUser");
    // console.log(orders);

    const filteredOrders = orders.filter(order => order.accept === false);

    res.render("private/my-offers", { filteredOrders });
  } catch (error) {
    console.log(error);
  }
});

router.get("/my-products/insert-product", async (req, res, next) => {
  res.render("private/insertProduct");
});

router.post(
  "/my-products",
  uploadCloud.single("imageUrl"),
  async (req, res, next) => {
    const { name, description, quantity, category, user } = req.body;
    const imageUrl = req.file.url;
    console.log(imageUrl);

    const newProduct = new Product({
      name,
      description,
      quantity,
      category,
      user: req.session.currentUser._id,
      imageUrl
    });
    newProduct
      .save()
      .then(() => {
        console.log(`Product ${newProduct} created`);
        res.redirect(`my-profile/my-products/`);
      })
      .catch(error => {
        res.render("private/insertProduct");
        console.log(error);
      });
  }
);

router.get("/my-products/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findById(id);
    res.render("private/my-products-details", product);
  } catch (error) {
    console.log(error);
  }
});

router.get("/my-products/:id/delete", async (req, res) => {
  const { id } = req.params;
  try {
    await Product.findByIdAndDelete(id);
    res.redirect("/my-profile/my-products");
  } catch (error) {
    console.log(error);
  }
});

router.get("/my-products/:id/edit", async (req, res, next) => {
  const { id } = req.params;
  try {
    const product = await Product.findById(id);
    res.render("private/edit-product", product);
  } catch (error) {
    console.log(error);
  }
});

router.post("/my-products/:id", async (req, res, next) => {
  const { id } = req.params;
  const product = req.body;
  try {
    await Product.findByIdAndUpdate(id, product);
    res.redirect("/my-profile/my-products");
  } catch (error) {
    console.log(error);
    error;
  }
});

router.get("/order/:id", async (req, res, next) => {
  const { id } = req.params;
  const userId = req.session.currentUser;
  try {
    const productOrder = await Product.findById(id);
    const userProduct = await Product.find({ user: userId });

    const filteredProducts = userProduct.filter(
      product => product.status === "Disponível"
    );

    res.render("private/order", { productOrder, filteredProducts });
  } catch (error) {
    console.log(error);
  }
});

router.post("/order", async (req, res, next) => {
  const { userProducts, userId } = req.body;
  const myProducts = [];
  const body = req.body;
  const keys = Object.keys(req.body);

  keys.forEach(key => {
    if (body[key] === "on") {
      myProducts.push(key);
    }
  });

  const newOrder = new Order({
    myProducts,
    userProducts,
    userId,
    myUser: req.session.currentUser._id
  });
  newOrder
    .save()
    .then(() => {
      console.log(`Order ${newOrder} created`);
      myProducts.forEach(async product => {
        await Product.findByIdAndUpdate(product, {
          status: "Pendente"
        });
      });
      res.redirect("/my-profile/my-products");
    })
    .catch(error => {
      res.render("private/home");
      console.log(error);
    });
});

router.get("/:id/decline", async (req, res) => {
  const { id } = req.params;
  try {
    const orders = await Order.findById(id);
    orders.myProducts.forEach(async product => {
      await Product.findByIdAndUpdate(product, {
        status: "Disponível"
      });
    });

    await Order.findByIdAndDelete(id);
    console.log("pedido deletado");

    res.redirect("/my-profile/my-offers");
  } catch (error) {
    console.log(error);
  }
});

router.get("/:id/accept", async (req, res) => {
  const { id } = req.params;
  try {
    const order = await Order.findById(id);

    order.myProducts.forEach(async product => {
      await Product.findByIdAndUpdate(product, {
        status: "Indisponível"
      });
    });

    order.userProducts.forEach(async product => {
      await Product.findByIdAndUpdate(product, {
        status: "Indisponível"
      });
    });

    const updatedOrder = await Order.findByIdAndUpdate(order, {
      accept: true
    });

    res.redirect("/my-profile/my-offers");
  } catch (error) {
    console.log(error);
  }
});

router.get("/:id/cancel", async (req, res) => {
  const { id } = req.params;

  try {
    const orders = await Order.findById(id);

    orders.myProducts.forEach(async product => {
      await Product.findByIdAndUpdate(product, {
        status: "Disponível"
      });
    });

    await Order.findByIdAndDelete(id);

    res.redirect("/my-profile/pending");
  } catch (error) {
    console.log(error);
  }
});

router.get("/user/:id", async (req, res) => {
  const { id } = req.params;
  const userProducts = [];
  try {
    const allProducts = await Product.find();

    for (let i = 0; i < allProducts.length; i++) {
      if (allProducts[i].user == id) {
        userProducts.push(allProducts[i]);
      }
    }

    const user = await User.findById(id);

    res.render("private/user-profile", { userProducts, user });
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
