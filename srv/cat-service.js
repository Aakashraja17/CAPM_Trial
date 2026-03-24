const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

  const { Orders, OrderItems, Products } = this.entities;


  // BEFORE CREATE -------------------------------------------------------------
  this.before('CREATE', Orders, (req) => {
    if (!req.data.orderNumber) req.error(400, "orderNumber is required");
    if (!req.data.customerName) req.error(400, "customerName is required");
  });

  // ON CREATE ------------------------------------------------------------------
this.on('CREATE', Orders, async (req) => {
  console.log("→ ON CREATE Orders");

  const { Items, ...orderData } = req.data;

  // 1) Insert order (CAP will generate ID automatically)
  await INSERT.into(Orders).entries(orderData);

  // CAP always updates req.data.ID with the generated UUID
  const orderID = req.data.ID;

  if (!orderID) {
    req.error(500, "Order ID was not generated");
  }

  // 2) Insert items
  if (Items && Items.length > 0) {

    for (const item of Items) {

      const product = await SELECT.one.from(Products).where({ ID: item.product_ID });

      if (!product) req.error(404, `Product ${item.product_ID} not found`);

      if (product.stock < item.quantity)
        req.error(400, `Insufficient stock for ${product.title}`);

      item.parent_ID = orderID;

      await INSERT.into(OrderItems).entries(item);

      await UPDATE(Products, product.ID).with({
        stock: product.stock - item.quantity
      });
    }
  }

  // 3) Return full order entity
  return await SELECT.one.from(Orders).where({ ID: orderID });
});


  // AFTER CREATE ---------------------------------------------------------------
  this.after('CREATE', Orders, (data) => {
    console.log("Order created:", data.ID);
  });



  // READ HOOKS -----------------------------------------------------------------
  this.before('READ', '*', (req) => {
    console.log("Reading:", req.target.name);
  });

  this.after('READ', Orders, (rows) => {
    rows.forEach(o => {
      o.displayName = `${o.orderNumber} - ${o.customerName}`;
    });
  });



  // ACTION: reduceStock --------------------------------------------------------
  this.on('reduceStock', async (req) => {
    const { productID, qty } = req.data;

    const product = await SELECT.one.from(Products).where({ ID: productID });
    if (!product) req.error(404, 'Product not found');

    if (product.stock < qty) req.error(400, "Not enough stock");

    await UPDATE(Products, productID).with({
      stock: product.stock - qty
    });

    return `Stock updated: ${product.stock - qty}`;
  });

});