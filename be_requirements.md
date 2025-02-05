# Product Requirements Document (PRD)

## Project Overview

Firebase backend for an inventory manager for a restaurant.

## Feature Requirements

1. Inventory Items
  - Add and remove inventory items.
  - Inventory items should have the following fields:
      - Name
      - Type: raw item or preparation
      - Category: Vegetables, Meats, Bakery, Drinks, Cleaning, etc.
      - Supplier (one or more)
      - Number of days supplier takes to dispatch the item (time to dispatch)
      - Minimum quantity to have on inventory
      - Average daily/weekly/monthly consumption
      - Current quantity.
      - Unit of the current quantity (can be kg, g, l, ml, units)
      - Last updated (date on which inventory was last taken for this item)
  - Update any of the fields of an inventory item.
  
2. Inventory Management
  - Take inventory object to update the quantity of one or more inventory items.
  - Take inventory object is stored persistently in Firestore.
  - A user can see the current inventory, where the quantity for each item corresponds to the quantity of that item in the most recent take inventory object.
  - The elements in the take inventory object should be the following:
    - id: string
    - timestamp: string
    - items: {
      - name: string
      - quantity: number
    }[]

3. API Endpoints
  - Endpoints
    - /api/add-inventory-item
      - POST: Add a new inventory item.
      - Response includes: id, timestamp, items
    - /api/remove-inventory-item
      - POST: Remove an inventory item.
      - Response includes: id, timestamp, items
    - /api/update-inventory-item
      - PUT: Update an inventory item.
      - Response includes: id, timestamp, items
    - /api/get-inventory-item-history
      - GET: Get the history of a specific inventory item.
      - Response includes: id, timestamp, items
    - /api/take-inventory
      - POST: Update inventory with a new take inventory object.
      - Response includes: id, timestamp, items
    - /api/get-inventory
      - GET: A list of all the inventory items with their current quantity.
      - Response includes: id, timestamp, items
    - /api/get-inventory-history
      - GET: Get the history of all the take inventory objects.
      - Response includes: id, timestamp, items

3. Error Handling & Logging
  4.1 Implement comprehensive error handling
  4.2 Log all trades and errors to Firestore
  4.3 Set up monitoring alerts
  4.4 Implement retry logic for API calls

## Technical Architecture

### Core Components

- Cloud Functions (TypeScript)
- Firestore Database

### File Structure

inventory-manager-be/
├── functions/
│   ├── src/
│   │   ├── index.ts              # Main entry point
│   │   ├── config.ts             # Configuration
│   │   ├── services/
│   │   │   ├── firestore.ts      # Database
│   │   ├── types/
│   │   ├── utils/
│   │   ├── api/
│   │   │   ├── inventory.ts      # Inventory API endpoints
│   │   │   ├── suppliers.ts      # Suppliers API endpoints
│   │   │   ├── categories.ts     # Categories API endpoints
│   │   │   ├── items.ts          # Items API endpoints
│   │   │   ├── takeInventory.ts  # Take inventory API endpoints
│   │   │   ├── history.ts        # History API endpoints
│   │   │   ├── errors.ts         # Error handling
│   │   │   ├── logging.ts        # Logging
│   │   │   ├── monitoring.ts     # Monitoring
│   ├── package.json
│   └── tsconfig.json
├── firebase.json
├── firestore.rules
└── firestore.indexes.json

## Developer Notes

- index.ts should be the entry point for the app, it should be the only file in the `src` directory. 
- index.ts should import functions from the `functions` directory and export them.
- Reuse existing libraries and tools whenever possible to maintain consistency and reduce complexity.
- Use the same naming convention for all files and directories.