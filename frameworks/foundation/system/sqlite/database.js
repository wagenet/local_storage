// ==========================================================================
// Project:   LocalStorage - A Local Storage Framework for SproutCore
// Copyright: ©2010 Strobe Inc., Peter Wagenet, and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals SCLocalStorage */

/** 
  @class

  Class for handling an SQLite database.

  @extends SC.Object
*/
SCLocalStorage.SQLiteDatabase = SC.Object.extend(
/** @scope SCLocalStorage.SQLiteDatabase.prototype */ {

  /**
    Name of the database.
    If not set, it will be replaced with a randomly generated name.
    Should not be changed after creation.

    @property {String}
  */
  name: null,

  /**
    Size of database in bytes.
    @property {Number}
  */
  size: 2000000,

  /**
    Optional version of database
    @property {String}
  */
  version: null,


  /**
    The raw database object
  */
  _db: null,

  /**
    Opens the raw database
    @private
  */
  _openDatabase: function(){
    try {
      if (!window.openDatabase) {
        return null;
      } else {
        var name = this.get('name'),
            size = this.get('size'),
            version = this.get('version') || '';
        this._db = window.openDatabase(name, version, name, size);
        if (SC.empty(version)) this.set('version', this._db.version);
      }
    } catch (e) {
      alert("Unknown error "+e+".");
      return;
    }
  },

  /**
    Runs a database transaction.

    'queries' is a single query or an array of queries.
      If an array of arrays is passed, then it is assumed that
      each nested array is an array of query and values, i.e.:
        ["SELECT * FROM people WHERE name = ?;", ["Peter"]]

    'callbacks' takes the following properties (all are optional):
      error - Called if the transaction fails
      success - Called if the transaction succeeds
      queryData - Called with the data results of each query
      queryError - Called if a single query fails

    @param {Array} queries Array or String with queries
    @param {Hash} callbacks Hash of callbacks
  */
  transaction: function(queries, callbacks) {
    if (!this._db) return;

    if (SC.typeOf(queries) !== SC.T_ARRAY) queries = [queries];

    var length = queries.length, query, values, idx;

    var defaultErrorHandler = function(_, error){
      if (error) {
        console.error('SQLite Error: '+error.message+' (Code '+error.code+')');
      } else {
        console.error('Unknown SQLite error');
      }
    };

    callbacks = SC.extend({
      success: function(){},
      error: defaultErrorHandler,
      queryData: function(){},
      queryError: defaultErrorHandler
    }, callbacks || {});

    this._db.transaction(function(t){
      for (idx=0; idx < length; idx++) {
        query = queries[idx];
        if (SC.typeOf(query) === SC.T_ARRAY) {
          values = query[1];
          query = query[0];
        } else {
          values = [];
        }
        t.executeSql(query, values, callbacks.queryData, callbacks.queryError);
      }
    }, callbacks.error, callbacks.success);
  },

  /**
    Creates a Table

    'fields' is a hash with a list of fields and options, i.e.:
      { firstName: 'text NOT NULL', lastName: 'text' }

    @param {String} table The name of the new table
    @param {Hash} fields Field definitions
  */
  createTable: function(table, fields){
    var fieldsSql = [], sql,
        length = fields.length,
        name;

    for(name in fields) fieldsSql.push(name+' '+fields[name]);

    sql = 'CREATE TABLE '+table+'('+fieldsSql.join(', ')+');';
    console.log(sql);

    // Empty queryError hides warnings about existing table
    this.transaction(sql, { queryError: function(){} });
  },

  /**
    Finds records.

    'where' is the WHERE condition.
      This may be a string:
        "firstName = 'Peter'"
      Or an array
        ['firstName = ?', ['Peter']]
      Or a hash
        { firstName: 'Peter' }

    Returns an object with a results property.
    The results property will be populated with the response when it's been received.

    @param {String} table Name of table
    @param {String} where Where condition
    @return {SC.Object} An object with results
  */
  find: function(table, where) {
    var sql, sqlValues = [], whereSql, key;

    if (SC.typeOf(where) === SC.T_HASH) {
      var whereParts = [];
      for (key in where) {
        whereParts.push(key+'=?')
        sqlValues.push(where[key]);
      }
      whereSql = whereParts.join(' AND ');
    } else if (SC.typeOf(where) === SC.T_ARRAY){
      whereSql = where[0];
      sqlValues = where[1];
    } else {
      whereSql = where;
    }

    sql = 'SELECT * FROM '+table;
    if(!SC.empty(whereSql)) sql += ' WHERE '+whereSql;
    sql += ';';

    console.log(sql, sqlValues);

    var ret = SCLocalStorage.RecordArray.create();

    this.transaction([[sql, sqlValues]], { queryData: function(t, results){ ret.set('rawResults', results); } });

    return ret;
  },

  /**
    Insert a record.

    'values' may be an array which matches the order of the fields in the table.
        ['John', 'Doe'] // (Assuming a table with firstName, lastName)
      Or a hash
        { firstName: 'John', lastName: 'Doe' }

    @param {String} table Name of table
    @param {Hash} values List of values to be inserted
  */
  insert: function(table, values) {
    var fieldsSql = '', sqlValues = [], sql, placeholders;

    if (SC.typeOf(values) === SC.T_HASH) {
      var fields = [], field;
      for(field in values) {
        fields.push(field);
        sqlValues.push(values[field]);
      }
      fieldsSql = '('+fields.join(',')+')';
    } else {
      sqlValues = values;
    }

    placeholders = sqlValues.map(function(){ return '?'; });

    sql = 'INSERT INTO '+table+fieldsSql+' VALUES('+placeholders.join(', ')+');';

    console.log(sql, sqlValues);

    this.transaction([[sql, sqlValues]]);
  },

  /**
    Update records matching a condition

    'changes' is a list of the values that should be changed
      This can be a string
        "firstName = 'Peter'"
      Or an array
        ["firstName = ?", 'Peter']
      Or a hash
        { firstName: 'Peter' }

    'where' is the WHERE condition.
      This may be a string:
        "lastName = 'Wagenet' AND gender = 'M'"
      Or an array
        ['lastName = ? AND gender = ?', ['Wagenet', 'M']]
      Or a hash
        { lastName: 'Wagenet', gender: 'M' }

    @param {String} table Name of table
    @param {String} changes Updates to be made
    @param {String} where Where condition
  */
  update: function(table, changes, where) {
    var sql, sqlValues = [], updateSql, whereSql, key;

    if (SC.typeOf(changes) === SC.T_HASH) {
      var updateParts = [];
      for (key in changes) {
        updateParts.push(key+'=?');
        sqlValues.push(changes[key]);
      }
      updateSql = updateParts.join(', ');
    } else if (SC.typeOf(changes) === SC.T_ARRAY){
      updateSql = changes[0];
      sqlValues = changes[1];
    } else {
      updateSql = changes;
    }

    if (SC.typeOf(where) === SC.T_HASH) {
      var whereParts = [];
      for (key in where) {
        whereParts.push(key+'=?')
        sqlValues.push(where[key]);
      }
      whereSql = whereParts.join(' AND ');
    } else if (SC.typeOf(where) === SC.T_ARRAY){
      whereSql = where[0];
      sqlValues = sqlValues.concat(where[1]);
    } else {
      whereSql = where;
    }

    sql = 'UPDATE '+table+' SET '+updateSql+' WHERE '+whereSql+';';

    console.log(sql, sqlValues);

    this.transaction([[sql, sqlValues]]);
  },

  /**
    Deletes records.

    'where' is the WHERE condition.
      This may be a string:
        "firstName = 'Peter'"
      Or an array
        ['firstName = ?', ['Peter']]
      Or a hash
        { firstName: 'Peter' }


    @param {String} table Name of table
    @param {String} where WHERE condition
  */
  destroy: function(table, where) {
    var sql, sqlValues = [], whereSql, key;

    if (SC.typeOf(where) === SC.T_HASH) {
      var whereParts = [];
      for (key in where) {
        whereParts.push(key+'=?')
        sqlValues.push(where[key]);
      }
      whereSql = whereParts.join(' AND ');
    } else if (SC.typeOf(where) === SC.T_ARRAY){
      whereSql = where[0];
      sqlValues = where[1];
    } else {
      whereSql = where;
    }

    sql = 'DELETE FROM '+table+' WHERE '+whereSql+';';

    console.log(sql);

    this.transaction([[sql, sqlValues]]);
  },

  /**
    Initializes the object.
    Also sets a default name and opens the database.
    @private
  */
  init: function(){
    sc_super();
    if (!this.name) this.name = 'db'+SC.guidFor(this);
    this._openDatabase();
  }

});


SCLocalStorage.RecordArray = SC.Object.extend(SC.Enumerable, SC.Array, {

  rawResults: null,

  _rawResultsDidChange: function(){
    var rawResults = this.get('rawResults');
    this.set('status', SCLocalStorage.READY);
  }.observes('rawResults'),

  status: SCLocalStorage.EMPTY,

  length: function(){
    var rawResults = this.get('rawResults');
    return rawResults ? rawResults.rows.length : 0;
  }.property('rawResults').cacheable(),

  objectAt: function(idx){
    var rawResults = this.get('rawResults'),
        length = this.get('length');
    return (idx < length) ? rawResults.rows.item(idx) : null;
  }

});
