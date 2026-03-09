namespace my.bookshop;
using { managed } from '@sap/cds/common';

entity Books {
  key ID    : Integer;
      title : String;
      stock : Integer;
}
type Gender : String enum { male; Female; Others; };
entity Employee : managed{
  key ID     : UUID;
      Name: String;
      Salary:String;
      Age:Integer;
      @mandatory
      @assert.enum
      Gender:Gender;
      
}


