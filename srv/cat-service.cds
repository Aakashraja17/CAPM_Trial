using { my.shop as my } from '../db/schema';
 
service CatalogService {
 
    // Expose Products - often read-only for customers
    @readonly entity Products as projection on my.Products;
 
    // Expose Orders - allowing customers to create new ones
    entity Orders as projection on my.Orders;
 
    // We usually don't expose OrderItems directly as a top-level entity
    // because they are accessed through the "Items" association in Orders
    @readonly entity OrderItems as projection on my.OrderItems;
}