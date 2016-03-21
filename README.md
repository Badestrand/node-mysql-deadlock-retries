# node-mysql-deadlock-retries
The MySQL database can emit deadlock errors (errno 1213, ER_LOCK_DEADLOCK) in certain scenarios, e.g. when you are mass-executing modifying queries like inserting or updating. This module right here helps you if you use the [node-mysql](https://github.com/felixge/node-mysql) module for your database connections. It proxies the connection's *query* method and retries to execute the query a few times when it fails with that deadlock error. The retries are separated by a configurable, random length, sleep.

Of course if the query does not issue that deadlock error there is no retry or sleep or delay.

## Installation
`npm install node-mysql-deadlock-retries --save`

## Usage
```
var mysql = require('mysql');
var proxyMysqlDeadlockRetries = require('node-mysql-deadlock-retries');

var connection = mysql.createConnection({
  host    : 'localhost',
  user    : 'me',
  password: 'secret',
  database: 'my_db'
});

var retries: 5;      // How many times will the query be retried when the ER_LOCK_DEADLOCK error occurs
var minMillis: 1;    // The minimum amount of milliseconds that the system sleeps before retrying
var maxMillis: 100;  // The maximum amount of milliseconds that the system sleeps before retrying

proxyMysqlDeadlockRetries(connection, retries, minMillis, maxMillis);
```
Example code for when you are using the connection pool instead:
```
var dbPool = mysql.createPool({
	host:     'localhost',
	user:     'me',
	password: 'secret',
	database: 'my_db'
});
dbPool.on('connection', function(connection) {
	proxyMysqlDeadlockRetries(connection, retries, minMillis, maxMillis);
})
```


## The deadlocks

From [the MySQL documentation](https://dev.mysql.com/doc/refman/5.1/en/innodb-error-codes.html):
> The transaction encountered a deadlock and was automatically rolled back so that your application could take corrective action. To recover from this error, run all the operations in this transaction again. A deadlock occurs when requests for locks arrive in inconsistent order between transactions. The transaction that was rolled back released all its locks, and the other transaction can now get all the locks it requested. Thus when you re-run the transaction that was rolled back, it might have to wait for other transactions to complete, but typically the deadlock does not recur. If you encounter frequent deadlocks, make the sequence of locking operations (LOCK TABLES, SELECT ... FOR UPDATE, and so on) consistent between the different transactions or applications that experience the issue. See Section 14.6.3.1.9, “How to Cope with Deadlocks” for details.

Please note that when using with transactions TODO???


## Tests

`npm test`


## Release History

* 1.0.0 Initial release