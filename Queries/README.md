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