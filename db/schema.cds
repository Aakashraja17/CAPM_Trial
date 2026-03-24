using { cuid, managed } from '@sap/cds/common';
 
namespace my.shop;
 
// Orders now automatically gets a 'key ID: UUID' and four audit fields
entity Orders : cuid, managed {
  orderNumber  : String;
  customerName : String;
  Items        : Composition of many OrderItems on Items.parent = $self;
}
 
// OrderItems also needs a unique ID and tracking
entity OrderItems : cuid, managed {
  parent   : Association to Orders;
  product  : Association to Products;
  quantity : Integer;
}
 
entity Products : cuid, managed {
  title : String;
  stock : Integer;
  price : Decimal(10,2);
}