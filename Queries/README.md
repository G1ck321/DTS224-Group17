# DATABASE IMPLEMENTATION
## SQL queries for Vendor Installment and Restock System

**It contains the following entities:**
- `PEOPLE`
- `CUSTOMER`
- `RESIDENCE_LOG`
- `SUPPLIER`
- `PRODUCT`
- `INVENTORY_STOCK`
- `ORDER_HEADER`
- `ORDER_LINE`
- `PAYMENT_LEDGER`
- `SYSTEM_ALERT_LOG`

### Privileges:
Grant common, basic privileges to the user for all tables of the specified database: <br> 

    GRANT SELECT, INSERT, UPDATE ON databaseName.* TO 'userName'@'localhost'
    
Grant all privileges to the user for all tables on all databases (attention with this):

    GRANT ALL ON *.* TO 'userName'@'localhost' WITH GRANT OPTION;

As demonstrated above *.* targets all database and tables, dataBase.* means all tables you can also specify a table using database.tablename

`WITH GRANT ` option, basically allows the user to be able to grant other user permission

Privileges can be either ALL or a combination of the following, each separated by a comma (non-exhaustive list). 

`SELECT 
INSERT 
UPDATE 
DELETE 
CREATE 
DROP`

### Creating a User
Create a user: 

    CREATE USER 'John123'@'%' IDENTIFIED BY 'OpenSesame'; 

The above creates a user John123, able to connect with any hostname due to the % wildcard. The Password for the user is set to 'OpenSesame' which is hashed.