import {
  InventoryItem,
  TakeInventory,
  Supplier,
  Order,
  OrderStatus,
  Recipe,
  InventoryHistoryRecord,
  ItemCategory,
  ItemUnit,
  UpdateFrequency,
} from '../types';

const ITEM_CATEGORIES: ItemCategory[] = [
  'Raw Materials',
  'Cleaning',
  'Consumables',
  'Drinks',
  'Fruits and Vegetables',
  'Eggs, Dairy and Derivatives',
  'Cereals, Rice and Pasta',
  'Dry Seasonings and Spices',
  'Sauces',
  'Oils, Fats and Vinegars',
  'Preserved Foods',
  'Frozen Foods',
  'Pastry and Baked Goods',
  'Fish and Seafood',
  'Meats',
  'Packaging',
  'Other',
];

const ITEM_UNITS: ItemUnit[] = [
  'mg', 'g', 'kg',
  'ml', 'l',
  'units', 'pieces', 'servings',
];

const UPDATE_FREQUENCIES: UpdateFrequency[] = [
  'daily', 'weekly', 'monthly',
];

/**
 * Validation class containing static methods for validating various data types
 */
export class Validation {
  /**
   * Validates an inventory item
   * @param {string} restaurantId - The ID of the restaurant
   * @param {Partial<InventoryItem>} item - The inventory item to validate
   * @throws {Error} If validation fails
   */
  static validateInventoryItem(
    restaurantId: string,
    item: InventoryItem | Omit<InventoryItem, 'id'>
  ): void {
    if (item?.restaurantId !== restaurantId) {
      throw new Error('Restaurant ID mismatch');
    }

    if (typeof item?.name !== 'string') {
      throw new Error('Name must be a string');
    }

    if (!['raw', 'preparation'].includes(item?.type)) {
      throw new Error('Invalid item type');
    }

    if (!ITEM_CATEGORIES.includes(item?.category)) {
      throw new Error('Invalid item category');
    }

    if (!ITEM_UNITS.includes(item?.unit)) {
      throw new Error('Invalid unit');
    }

    if (!UPDATE_FREQUENCIES.includes(item?.updateFrequency)) {
      throw new Error('Invalid update frequency');
    }

    if (item?.minimumQuantity < 0) {
      throw new Error('Minimum quantity cannot be negative');
    }

    if (item?.currentQuantity === undefined || item?.currentQuantity < 0) {
      throw new Error('Current quantity cannot be undefined or negative');
    }

    if (item.currentCost === undefined || item.currentCost < 0) {
      throw new Error('Cost cannot be negative or undefined');
    }

    if (item.averageConsumption) {
      if (item.averageConsumption.daily < 0) {
        throw new Error('Daily average consumption cannot be negative');
      }
      if (item.averageConsumption.weekly < 0) {
        throw new Error('Weekly average consumption cannot be negative');
      }
      if (item.averageConsumption.monthly < 0) {
        throw new Error('Monthly average consumption cannot be negative');
      }
    }
  }


  /**
   * Validates an inventory item
   * @param {string} restaurantId - The ID of the restaurant
   * @param {Partial<InventoryItem>} item - The inventory item to validate
   * @throws {Error} If validation fails
   */
  static validateInventoryItemPartial(
    restaurantId: string,
    item: Partial<InventoryItem>
  ): void {
    if (!restaurantId) {
      throw new Error('Restaurant ID is required');
    }

    if (item.restaurantId && item.restaurantId !== restaurantId) {
      throw new Error('Restaurant ID mismatch');
    }

    if (item.name && typeof item.name !== 'string') {
      throw new Error('Name must be a string');
    }

    if (item.type && !['raw', 'preparation'].includes(item.type)) {
      throw new Error('Invalid item type');
    }

    if (item.category && !ITEM_CATEGORIES.includes(item.category)) {
      throw new Error('Invalid item category');
    }

    if (item.unit && !ITEM_UNITS.includes(item.unit)) {
      throw new Error('Invalid unit');
    }

    if (item.updateFrequency &&
        !UPDATE_FREQUENCIES.includes(item.updateFrequency)) {
      throw new Error('Invalid update frequency');
    }

    if (item.minimumQuantity !== undefined && item.minimumQuantity < 0) {
      throw new Error('Minimum quantity cannot be negative');
    }

    if (item.currentQuantity !== undefined && item.currentQuantity < 0) {
      throw new Error('Current quantity cannot be negative');
    }

    if (item.currentCost !== undefined && item.currentCost < 0) {
      throw new Error('Cost cannot be negative');
    }

    if (item.averageConsumption) {
      if (item.averageConsumption.daily < 0) {
        throw new Error('Daily average consumption cannot be negative');
      }
      if (item.averageConsumption.weekly < 0) {
        throw new Error('Weekly average consumption cannot be negative');
      }
      if (item.averageConsumption.monthly < 0) {
        throw new Error('Monthly average consumption cannot be negative');
      }
    }
  }

  /**
   * Validates an inventory history record
   * @param {string} restaurantId - The ID of the restaurant
   * @param {string} itemId - The ID of the inventory item
   * @param {InventoryHistoryRecord} record - The history record to validate
   * @throws {Error} If validation fails
   */
  static validateInventoryItemHistory(
    restaurantId: string,
    itemId: string,
    record: InventoryHistoryRecord
  ): void {
    if (!restaurantId) {
      throw new Error('Restaurant ID is required');
    }

    if (!itemId) {
      throw new Error('Item ID is required');
    }

    if (!record.date) {
      throw new Error('Date is required');
    }

    if (!record.type ||
        !['tookInventory', 'receivedOrder'].includes(record.type)) {
      throw new Error('Invalid history record type');
    }

    if (record.amount < 0) {
      throw new Error('Amount cannot be negative');
    }
  }

  /**
   * Validates a take inventory record
   * @param {string} restaurantId - The ID of the restaurant
   * @param {TakeInventory | Omit<TakeInventory, 'id'>} takeInventory - The
   * take inventory record to validate
   * @throws {Error} If validation fails
   */
  static validateTakeInventory(
    restaurantId: string,
    takeInventory: TakeInventory | Omit<TakeInventory, 'id'>
  ): void {
    if (!restaurantId) {
      throw new Error('Restaurant ID is required');
    }

    if (!takeInventory.items || !Array.isArray(takeInventory.items)) {
      throw new Error('Items must be an array');
    }

    if (takeInventory.items.length === 0) {
      throw new Error('Items array cannot be empty');
    }

    for (const item of takeInventory.items) {
      if (!item.id) {
        throw new Error('Item ID is required');
      }
      if (!item.name) {
        throw new Error('Item name is required');
      }
      if (item.quantity < 0) {
        throw new Error('Item quantity cannot be negative');
      }
    }
  }

  /**
   * Validates a supplier
   * @param {string} restaurantId - The ID of the restaurant
   * @param {Partial<Supplier>} supplier - The supplier to validate
   * @throws {Error} If validation fails
   */
  static validateSupplier(
    restaurantId: string,
    supplier: Supplier | Omit<Supplier, 'id'>
  ): void {
    if (!restaurantId) {
      throw new Error('Restaurant ID is required');
    }

    if (supplier?.restaurantId !== restaurantId) {
      throw new Error('Restaurant ID mismatch');
    }

    if (typeof supplier?.name !== 'string') {
      throw new Error('Name must be a string');
    }

    if (supplier?.dispatchTime === undefined || supplier?.dispatchTime < 0) {
      throw new Error('Dispatch time cannot be negative or undefined');
    }

    if (supplier?.daysOfDelivery) {
      const days = supplier.daysOfDelivery;
      if (typeof days.monday !== 'boolean') {
        throw new Error('Invalid monday value');
      }
      if (typeof days.tuesday !== 'boolean') {
        throw new Error('Invalid tuesday value');
      }
      if (typeof days.wednesday !== 'boolean') {
        throw new Error('Invalid wednesday value');
      }
      if (typeof days.thursday !== 'boolean') {
        throw new Error('Invalid thursday value');
      }
      if (typeof days.friday !== 'boolean') {
        throw new Error('Invalid friday value');
      }
      if (typeof days.saturday !== 'boolean') {
        throw new Error('Invalid saturday value');
      }
      if (typeof days.sunday !== 'boolean') {
        throw new Error('Invalid sunday value');
      }
    }

    if (supplier?.contactMethod) {
      if (!['email', 'phone'].includes(supplier?.contactMethod?.type)) {
        throw new Error('Invalid contact method type');
      }

      if (supplier?.contactMethod?.type === 'email') {
        const emails = supplier?.contactMethod?.emails;
        const isValidEmails = emails && Array.isArray(emails);
        if (!isValidEmails) {
          throw new Error('Invalid emails array');
        }
      }

      if (
        supplier?.contactMethod?.type === 'phone' &&
        !supplier?.contactMethod?.phone
      ) {
        throw new Error('Phone number is required for phone contact method');
      }
    }
  }

  /**
   * Validates a supplier
   * @param {string} restaurantId - The ID of the restaurant
   * @param {Partial<Supplier>} supplier - The supplier to validate
   * @throws {Error} If validation fails
   */
  static validateSupplierPartial(
    restaurantId: string,
    supplier: Partial<Supplier>
  ): void {
    if (!restaurantId) {
      throw new Error('Restaurant ID is required');
    }

    if (supplier?.restaurantId !== restaurantId) {
      throw new Error('Restaurant ID mismatch');
    }

    if (typeof supplier?.name !== 'string') {
      throw new Error('Name must be a string');
    }

    if (supplier?.dispatchTime !== undefined && supplier?.dispatchTime < 0) {
      throw new Error('Dispatch time cannot be negative or undefined');
    }

    if (supplier?.daysOfDelivery) {
      const days = supplier.daysOfDelivery;
      if (typeof days.monday !== 'boolean') {
        throw new Error('Invalid monday value');
      }
      if (typeof days.tuesday !== 'boolean') {
        throw new Error('Invalid tuesday value');
      }
      if (typeof days.wednesday !== 'boolean') {
        throw new Error('Invalid wednesday value');
      }
      if (typeof days.thursday !== 'boolean') {
        throw new Error('Invalid thursday value');
      }
      if (typeof days.friday !== 'boolean') {
        throw new Error('Invalid friday value');
      }
      if (typeof days.saturday !== 'boolean') {
        throw new Error('Invalid saturday value');
      }
      if (typeof days.sunday !== 'boolean') {
        throw new Error('Invalid sunday value');
      }
    }

    if (supplier?.contactMethod) {
      if (!['email', 'phone'].includes(supplier?.contactMethod?.type)) {
        throw new Error('Invalid contact method type');
      }

      if (supplier?.contactMethod?.type === 'email') {
        const emails = supplier?.contactMethod?.emails;
        const isValidEmails = emails && Array.isArray(emails);
        if (!isValidEmails) {
          throw new Error('Invalid emails array');
        }
      }

      if (supplier?.contactMethod?.type === 'phone' &&
          !supplier?.contactMethod?.phone) {
        throw new Error('Phone number is required for phone contact method');
      }
    }
  }

  /**
   * Validates an order
   * @param {string} restaurantId - The ID of the restaurant
   * @param {Partial<Order>} order - The order to validate
   * @throws {Error} If validation fails
   */
  static validateOrder(
    restaurantId: string,
    order: Order | Omit<Order, 'id'>
  ): void {
    if (!restaurantId) {
      throw new Error('Restaurant ID is required');
    }

    if (order?.restaurantId !== restaurantId) {
      throw new Error('Restaurant ID mismatch');
    }

    if (typeof order?.supplierId !== 'string') {
      throw new Error('Supplier ID must be a string');
    }

    if (typeof order?.supplierName !== 'string') {
      throw new Error('Supplier name must be a string');
    }

    if (order?.items) {
      if (!Array.isArray(order?.items)) {
        throw new Error('Items must be an array');
      }

      if (order?.items?.length === 0) {
        throw new Error('Items array cannot be empty');
      }

      for (const item of order.items) {
        if (!item?.id) throw new Error('Item ID is required');
        if (!item?.name) throw new Error('Item name is required');
        if (item?.currentQuantity < 0) {
          throw new Error('Current quantity cannot be negative');
        }
        if (item?.orderQuantity < 0) {
          throw new Error('Order quantity cannot be negative');
        }
        if (item?.receivedQuantity < 0) {
          throw new Error('Received quantity cannot be negative');
        }
        if (!item?.unit) throw new Error('Unit is required');
      }
    }

    if (order?.expectedDelivery) {
      if (
        typeof order.expectedDelivery !== 'string' ||
        isNaN(Date.parse(order.expectedDelivery))) {
        throw new Error('Expected delivery date must be a valid date string');
      }
    }
  }

  /**
   * Validates an order
   * @param {string} restaurantId - The ID of the restaurant
   * @param {Partial<Order>} order - The order to validate
   * @throws {Error} If validation fails
   */
  static validateOrderPartial(
    restaurantId: string,
    order: Partial<Order>
  ): void {
    if (!restaurantId) {
      throw new Error('Restaurant ID is required');
    }

    if (order?.restaurantId && order?.restaurantId !== restaurantId) {
      throw new Error('Restaurant ID mismatch');
    }

    if (order?.supplierId && typeof order?.supplierId !== 'string') {
      throw new Error('Supplier ID must be a string');
    }

    if (order?.supplierName && typeof order?.supplierName !== 'string') {
      throw new Error('Supplier name must be a string');
    }

    if (order?.items) {
      if (!Array.isArray(order?.items)) {
        throw new Error('Items must be an array');
      }

      if (order?.items?.length === 0) {
        throw new Error('Items array cannot be empty');
      }

      for (const item of order.items) {
        if (!item?.id) throw new Error('Item ID is required');
        if (!item?.name) throw new Error('Item name is required');
        if (item?.currentQuantity < 0) {
          throw new Error('Current quantity cannot be negative');
        }
        if (item?.orderQuantity < 0) {
          throw new Error('Order quantity cannot be negative');
        }
        if (item?.receivedQuantity < 0) {
          throw new Error('Received quantity cannot be negative');
        }
        if (!item?.unit) throw new Error('Unit is required');
      }
    }

    if (order?.expectedDelivery) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const isValidDate = dateRegex.test(order.expectedDelivery);
      if (!isValidDate) {
        throw new Error('Invalid expected delivery date format');
      }
    }
  }

  /**
   * Validates an order status
   * @param {OrderStatus} status - The order status to validate
   * @throws {Error} If validation fails
   */
  static validateOrderStatus(status: OrderStatus): void {
    if (![
      'pending',
      'sent',
      'confirmed',
      'delivered',
      'cancelled',
    ].includes(status)) {
      throw new Error('Invalid order status');
    }
  }

  /**
   * Validates a recipe
   * @param {string} restaurantId - The ID of the restaurant
   * @param {Partial<Recipe>} recipe - The recipe to validate
   * @throws {Error} If validation fails
   */
  static validateRecipe(
    restaurantId: string,
    recipe: Recipe | Omit<Recipe, 'id'>
  ): void {
    if (!restaurantId) {
      throw new Error('Restaurant ID is required');
    }

    if (recipe?.restaurantId !== restaurantId) {
      throw new Error('Restaurant ID mismatch');
    }

    if (typeof recipe?.name !== 'string') {
      throw new Error('Name must be a string');
    }

    if (!['dish', 'preparation'].includes(recipe.type)) {
      throw new Error('Invalid recipe type');
    }

    if (typeof recipe?.instructions !== 'string') {
      throw new Error('Instructions must be a string');
    }

    if (recipe?.ingredients) {
      if (!Array.isArray(recipe?.ingredients)) {
        throw new Error('Ingredients must be an array');
      }

      if (recipe?.ingredients?.length === 0) {
        throw new Error('Ingredients array cannot be empty');
      }

      for (const ingredient of recipe.ingredients) {
        if (!ingredient?.id) throw new Error('Ingredient ID is required');
        if (!ingredient?.name) throw new Error('Ingredient name is required');
        if (ingredient?.quantity <= 0) {
          throw new Error('Ingredient quantity must be positive');
        }
        if (!ingredient?.unit) throw new Error('Ingredient unit is required');
        if (ingredient?.currentCost < 0) {
          throw new Error('Ingredient cost cannot be negative');
        }
        if (!ingredient?.ingredientType ||
            !['Recipe', 'InventoryItem'].includes(ingredient.ingredientType)) {
          throw new Error('Invalid ingredient type');
        }
      }
    }

    if (recipe?.quantityProduced) {
      const unit = recipe.quantityProduced.unit;
      const isValidUnit = ITEM_UNITS.includes(unit);
      if (!isValidUnit) {
        throw new Error('Invalid quantity produced unit');
      }
    }

    if (recipe?.estimatedCost !== undefined && recipe?.estimatedCost < 0) {
      throw new Error('Estimated cost cannot be negative');
    }
  }

  /**
   * Validates a partial recipe
   * @param {string} restaurantId - The ID of the restaurant
   * @param {Partial<Recipe>} recipe - The recipe to validate
   * @throws {Error} If validation fails
   */
  static validateRecipePartial(
    restaurantId: string,
    recipe: Partial<Recipe>
  ): void {
    if (!restaurantId) {
      throw new Error('Restaurant ID is required');
    }

    if (recipe?.restaurantId && recipe?.restaurantId !== restaurantId) {
      throw new Error('Restaurant ID mismatch');
    }

    if (recipe?.name && typeof recipe?.name !== 'string') {
      throw new Error('Name must be a string');
    }

    if (recipe?.type && !['dish', 'preparation'].includes(recipe.type)) {
      throw new Error('Invalid recipe type');
    }

    if (recipe?.instructions && typeof recipe?.instructions !== 'string') {
      throw new Error('Instructions must be a string');
    }

    if (recipe?.ingredients) {
      if (!Array.isArray(recipe?.ingredients)) {
        throw new Error('Ingredients must be an array');
      }

      if (recipe?.ingredients?.length === 0) {
        throw new Error('Ingredients array cannot be empty');
      }

      for (const ingredient of recipe.ingredients) {
        if (!ingredient?.id) throw new Error('Ingredient ID is required');
        if (!ingredient?.name) throw new Error('Ingredient name is required');
        if (ingredient?.quantity <= 0) {
          throw new Error('Ingredient quantity must be positive');
        }
        if (!ingredient?.unit) throw new Error('Ingredient unit is required');
        if (ingredient?.currentCost < 0) {
          throw new Error('Ingredient cost cannot be negative');
        }
        if (!ingredient?.ingredientType ||
            !['Recipe', 'InventoryItem'].includes(ingredient.ingredientType)) {
          throw new Error('Invalid ingredient type');
        }
      }
    }

    if (recipe?.quantityProduced) {
      const unit = recipe.quantityProduced.unit;
      const isValidUnit = ITEM_UNITS.includes(unit);
      if (!isValidUnit) {
        throw new Error('Invalid quantity produced unit');
      }
    }

    if (recipe?.estimatedCost !== undefined && recipe?.estimatedCost < 0) {
      throw new Error('Estimated cost cannot be negative');
    }
  }
}
