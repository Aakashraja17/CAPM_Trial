namespace my.bookshop;

entity Books {
  key ID    : Integer;
      title : String;
      stock : Integer;
}
entity Employee {
  key EmpId : String;
      Name: String;
      Salary:String;
      Age:Integer;
      @mandatory
      Gender:Gender @assert.notNull @title : 'Gender';
      
}

type Gender : String enum { Male; Female; Others; };
