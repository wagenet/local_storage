// ==========================================================================
// SCLocalStorage.SQLiteDatabase Unit Test
// ==========================================================================
/*globals SCLocalStorage */

var db, transactionErrorCallbacks, transactionSuccessCallbacks, queries, sampleQuery, sampleQuery2;

function mockTransactions(){
  queries = [];
  transactionErrorCallbacks = [];
  transactionSuccessCallbacks = [];
  db = SCLocalStorage.SQLiteDatabase.create({ name: 'TestDatabase' });
  db._db = {
    transaction: function(transaction, errorCallback, successCallback){
      transaction({
        executeSql: function(query, values, dataCallback, errorCallback){
          queries.push([query, values, dataCallback, errorCallback]);
        }
      });
      transactionErrorCallbacks.push(errorCallback);
      transactionSuccessCallbacks.push(successCallback);
    }
  };
};


module("SCLocalStorage.SQLiteDatabase: Basic");

test("generates default name", function(){
  db = SCLocalStorage.SQLiteDatabase.create();
  ok(db.get('name').match(/^db/), "should generate default name");
});

test("creates database with proper params", function(){
  db = SCLocalStorage.SQLiteDatabase.create({
    name: 'TestDatabase',
    size: 20000,
  });
  equals(db._db.constructor.name, 'Database', "should be a Database");
  // Unfortunately we can't check the name or size
});



module("SCLocalStorage.SQLiteDatabase: Transaction", {
  setup: function(){
    mockTransactions();
    sampleQuery = "SELECT * FROM people;";
    sampleQuery2 = "SELECT * FROM companies;";
  }
});

test("single transaction", function(){
  db.transaction(sampleQuery);
  equals(queries.length, 1, "should have one query");
  equals(queries[0][0], sampleQuery, "should have correct query");
});

test("multiple transactions", function(){
  db.transaction([sampleQuery, sampleQuery2]);
  equals(queries.length, 2, "should have two queries");
  equals(queries[0][0], sampleQuery, "should have first query");
  equals(queries[1][0], sampleQuery2, "should have second query");
});

test("transaction with values", function(){
  db.transaction([[sampleQuery, 'values']]);
  equals(queries.length, 1, "should have one query");
  equals(queries[0][0], sampleQuery, "should have sampleQuery");
  equals(queries[0][1], 'values', "should have values");
});

test("transaction with queryCallbacks", function(){
  db.transaction([sampleQuery, sampleQuery2], { queryData: 'queryDataCallback', queryError: 'queryErrorCallback' });
  equals(queries.length, 2, "should have two queries");
  equals(queries[0][2], 'queryDataCallback', "first query should have dataCallback");
  equals(queries[0][3], 'queryErrorCallback', "first query should have errorCallback");
  equals(queries[1][2], 'queryDataCallback', "second query should have dataCallback");
  equals(queries[1][3], 'queryErrorCallback', "second query should have errorCallback");
});

test("transaction callbacks", function(){
  db.transaction(sampleQuery, { success: 'successCallback', error: 'errorCallback' });
  equals(transactionErrorCallbacks[0], 'errorCallback', "should have errorCallback");
  equals(transactionSuccessCallbacks[0], 'successCallback', "should have successCallback");
});



module("SCLocalStorage.SQLiteDatabase: Create Table", {
  setup: function(){
    mockTransactions();
  }
});

test("create table", function(){
  db.createTable('people', { name: 'text', age: 'integer' });
  equals(queries[0][0], "CREATE TABLE people(name text, age integer);");
  equals(queries[0][3].toString(), "function (){}", "should have blank error callback");
});



module("SCLocalStorage.SQLiteDatabase: Find", {
  setup: function(){
    mockTransactions();
  }
});

test("find with string", function(){
  db.find('people', 'name = "John"');
  equals(queries[0][0], 'SELECT * FROM people WHERE name = "John";');
});

test("find with array", function(){
  db.find('people', ['name = ?', ['John']]);
  equals(queries[0][0], 'SELECT * FROM people WHERE name = ?;');
  equals(queries[0][1][0], 'John');
});

test("find with hash", function(){
  db.find('people', { name: 'John' });
  equals(queries[0][0], 'SELECT * FROM people WHERE name=?;');
  equals(queries[0][1][0], 'John');
});



module("SCLocalStorage.SQLiteDatabase: Insert", {
  setup: function(){
    mockTransactions();
  }
});

test("insert with array", function(){
  db.insert('people', ['John', 30]);
  equals(queries[0][0], 'INSERT INTO people VALUES(?, ?);');
  equals(queries[0][1][0], 'John');
  equals(queries[0][1][1], 30);
});

test("insert with hash", function(){
  db.insert('people', { name: 'John', age: 30 });
  equals(queries[0][0], 'INSERT INTO people(name,age) VALUES(?, ?);');
  equals(queries[0][1][0], 'John');
  equals(queries[0][1][1], 30);
});



module("SCLocalStorage.SQLiteDatabase: Update", {
  setup: function(){
    mockTransactions();
  }
});

test("update with strings", function(){
  db.update('people', 'name = "John"', 'name = "Bob"');
  equals(queries[0][0], 'UPDATE people SET name = "John" WHERE name = "Bob";');
});

test("update with arrays", function(){
  db.update('people', ['name = ?', ['John']], ['name = ?', ['Bob']]);
  equals(queries[0][0], 'UPDATE people SET name = ? WHERE name = ?;');
  equals(queries[0][1][0], 'John');
  equals(queries[0][1][1], 'Bob');
});

test("update with hashes", function(){
  db.update('people', { name: 'John' }, { name: 'Bob' });
  equals(queries[0][0], 'UPDATE people SET name=? WHERE name=?;');
  equals(queries[0][1][0], 'John');
  equals(queries[0][1][1], 'Bob');
});



module("SCLocalStorage.SQLiteDatabase: Destroy", {
  setup: function(){
    mockTransactions();
  }
});

test("destroy with string", function(){
  db.destroy('people', 'name = "John"');
  equals(queries[0][0], 'DELETE FROM people WHERE name = "John";');
});

test("destroy with array", function(){
  db.destroy('people', ['name = ?', ['John']]);
  equals(queries[0][0], 'DELETE FROM people WHERE name = ?;');
  equals(queries[0][1][0], 'John');
});

test("destroy with hash", function(){
  db.destroy('people', { name: 'John' });
  equals(queries[0][0], 'DELETE FROM people WHERE name=?;');
  equals(queries[0][1][0], 'John');
});



module("SCLocalStorage.RecordArray", {
  setup: function(){
    db = SCLocalStorage.SQLiteDatabase.create({ name: 'TestDatabase' });
  }
});

test("Get results from database", function(){
  var resp, callback;

  stop(1000);

  resp = db.find('sqlite_master', 1);

  callback = function(){
    if (resp.get('status') === SCLocalStorage.READY) {
      resp.removeObserver('status', callback);
      equals(resp.get('status'), SCLocalStorage.READY);
      ok(resp.length() > 0, "should have items");
      ok(resp.objectAt(0), "should have a first object");
      start();
    }
  };
  resp.addObserver('status', callback);
  callback(); // Double check in case we missed it
})
