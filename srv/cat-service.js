const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

  const { Orders, OrderItems, Products } = this.entities;

  // --------------------------------------------------------------------------
  // BEFORE CREATE: Auto-generate orderNumber
  // --------------------------------------------------------------------------
  this.before('CREATE', Orders, async (req) => {
    if (!req.data.customerName) {
      req.error(400, "customerName is required");
    }

    const tx = cds.transaction(req);

    // Fetch last orderNumber
    const last = await tx.run(
      SELECT.one.from(Orders)
        .columns('orderNumber')
        .orderBy({ orderNumber: 'desc' })
    );

    let nextNo = 1;
    if (last?.orderNumber) {
      const m = last.orderNumber.match(/(\d+)$/);
      if (m) nextNo = parseInt(m[1], 10) + 1;
    }

    const year = new Date().getFullYear();
    req.data.orderNumber = `ORD-${year}-${String(nextNo).padStart(3, '0')}`;
  });

  // --------------------------------------------------------------------------
  // ON CREATE: Insert order, items, update stock (single transaction)
  // --------------------------------------------------------------------------
  this.on('CREATE', Orders, async (req) => {

    const tx = cds.transaction(req);
    const { Items, ...orderData } = req.data;

    // 1) Create Order
    await tx.run(INSERT.into(Orders).entries(orderData));
    const orderID = req.data.ID;

    if (!orderID) {
      req.error(500, "Order ID not generated");
    }

    // 2) Create Order Items + reduce stock
    if (Items?.length) {
      for (const item of Items) {

        const product = await tx.run(
          SELECT.one.from(Products).where({ ID: item.product_ID })
        );

        if (!product) req.error(404, `Product not found`);
        if (product.stock < item.quantity) {
          req.error(400, `Insufficient stock for ${product.title}`);
        }

        await tx.run(
          INSERT.into(OrderItems).entries({
            parent_ID: orderID,
            product_ID: item.product_ID,
            quantity: item.quantity
          })
        );

        await tx.run(
          UPDATE(Products, product.ID).with({
            stock: product.stock - item.quantity
          })
        );
      }
    }

    // 3) Return created order
    return await tx.run(
      SELECT.one.from(Orders).where({ ID: orderID })
    );
  });

  // --------------------------------------------------------------------------
  // AFTER READ: displayName helper
  // --------------------------------------------------------------------------
  this.after('READ', Orders, (rows) => {
    rows.forEach(o => {
      o.displayName = `${o.orderNumber} - ${o.customerName}`;
    });
  });

});
