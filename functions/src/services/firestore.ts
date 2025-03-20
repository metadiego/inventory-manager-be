import * as admin from 'firebase-admin';
import {
  InventoryItem,
  TakeInventory,
  Supplier,
  NewSupplier,
  Order,
  NewOrder,
  OrderStatus,
  OrderEmail,
  EmailData,
  Sale,
  Recipe,
  NewRecipe,
  InventoryHistoryRecord,
  OrderItem,
  Restaurant,
} from '../types';
import { Validation } from '../util/validation';

/** Service class for Firestore database operations */
export class FirestoreService {
  private db: FirebaseFirestore.Firestore;

  /**
   * Class constructor.
   */
  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Helper function to validate restaurant ID and get restaurant reference
   * @param {string} restaurantId - The ID of the restaurant.
   * @return {DocumentReference} - The reference to the restaurant document
   */
  getRestaurantRef(restaurantId: string): FirebaseFirestore.DocumentReference {
    if (!restaurantId) {
      throw new Error('Restaurant ID is required');
    }

    const ref = this.db.collection('restaurants').doc(restaurantId);

    return ref;
  }

  /**
   * Retrieves a single restaurant by id
   * @param {string} restaurantId - The id of the restaurant
   * @return {Promise<Restaurant>} The restaurant if found, null otherwise.
   */
  async getRestaurantDoc(restaurantId: string): Promise<Restaurant> {
    const doc = await this.getRestaurantRef(restaurantId).get();
    if (!doc.exists) {
      throw new Error('Restaurant not found');
    }
    return {
      id: doc.id,
      ...doc.data() as Omit<Restaurant, 'id'>,
    } as Restaurant;
  }

  /**
   * Retrieves all restaurants from the database
   * @return {Promise<Restaurant[]>} Array of all restaurants
   */
  async getAllRestaurants(): Promise<Restaurant[]> {
    const snapshot = await this.db.collection('restaurants').get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data() as Omit<Restaurant, 'id'>,
    })) as Restaurant[];
  }

  /**
   * Retrieves a single inventory item by id
   * @param {string} restaurantId - The id of the restaurant
   * @param {string} id - The id of the inventory item to retrieve
   * @return {Promise<InventoryItem | null>} The inventory item if found,
   * null otherwise.
   */
  async getInventoryDoc(
    restaurantId: string,
    id: string
  ): Promise<InventoryItem | null> {
    const doc = await this.getRestaurantRef(restaurantId)
      .collection('inventory').doc(id).get();
    return doc.exists ?
      { id: doc.id, ...doc.data() as Omit<InventoryItem, 'id'> } :
      null;
  }

  /**
   * Retrieves all inventory items from the database
   * @param {string} restaurantId - The id of the restaurant
   * @return {Promise<InventoryItem[]>} Array of all inventory items
   */
  async getAllInventoryDocs(
    restaurantId: string
  ): Promise<InventoryItem[]> {
    const snapshot = await this.getRestaurantRef(restaurantId)
      .collection('inventory').get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data() as Omit<InventoryItem, 'id'>,
    }));
  }


  /**
   * Gets the history of a specific inventory item
   * @param {string} restaurantId - The id of the restaurant
   * @param {string} itemId - The ID of the item to get history for
   * @return {Promise<InventoryHistoryRecord[]>} Array of inventory history
   * records.
   */
  async getInventoryDocHistory(
    restaurantId: string,
    itemId: string
  ): Promise<InventoryHistoryRecord[]> {
    const historySnapshot = await this.getRestaurantRef(restaurantId)
      .collection('inventory')
      .doc(itemId)
      .collection('history')
      .orderBy('date', 'desc')
      .get();

    return historySnapshot.docs.map(
      (doc) => doc.data() as InventoryHistoryRecord,
    );
  }

  /**
   * Creates a new inventory item to the database
   * @param {string} restaurantId - The id of the restaurant
   * @param {Omit<InventoryItem, 'id'>} item - The inventory item to add
   * (without id).
   * @return {Promise<InventoryItem>} The created inventory item with
   * generated id
   */
  async addInventoryDoc(
    restaurantId: string,
    item: Omit<InventoryItem, 'id'>
  ): Promise<InventoryItem> {
    const inventoryRef = this.getRestaurantRef(restaurantId)
      .collection('inventory');

    // Check if item is valid.
    Validation.validateInventoryItem(restaurantId, item);

    const docRef = await inventoryRef.add({
      ...item,
      lastUpdated: new Date().toISOString(),
    });

    const newItem: InventoryItem = {
      id: docRef.id,
      ...item,
      restaurantId,
      lastUpdated: new Date().toISOString(),
    };

    return newItem;
  }

  /**
   * Adds a history record to an inventory item's history subcollection
   * @param {string} restaurantId - The id of the restaurant
   * @param {string} itemId - The ID of the inventory item
   * @param {InventoryHistoryRecord} record - The history record to add
   */
  private async addInventoryHistoryDoc(
    restaurantId: string,
    itemId: string,
    record: InventoryHistoryRecord
  ): Promise<void> {
    // Check if item is valid.
    Validation.validateInventoryItemHistory(restaurantId, itemId, record);

    await this.getRestaurantRef(restaurantId)
      .collection('inventory')
      .doc(itemId)
      .collection('history')
      .add(record);
  }

  /**
   * Batch adds history records to multiple inventory items
   * @param {string} restaurantId - The id of the restaurant
   * @param {Array<{itemId: string, record: InventoryHistoryRecord}>} items
   *  - The items to add history records to
   */
  async batchAddInventoryHistoryDocs(
    restaurantId: string,
    items: { itemId: string; record: InventoryHistoryRecord }[],
  ): Promise<void> {
    const restaurantRef = this.getRestaurantRef(restaurantId);
    const batch = this.db.batch();
    for (const elem of items) {
      // Check if item is valid.
      Validation.validateInventoryItemHistory(
        restaurantId,
        elem.itemId,
        elem.record,
      );

      const docRef = restaurantRef
        .collection('inventory')
        .doc(elem.itemId)
        .collection('history')
        .doc(); // Create new doc reference with auto-generated ID
      batch.set(docRef, elem.record);
    }
    await batch.commit();
  }

  /**
   * Removes an inventory item from the database
   * @param {string} restaurantId - The id of the restaurant
   * @param {string} id - The id of the inventory item to remove
   * @return {Promise<void>}
   */
  async removeInventoryDoc(
    restaurantId: string,
    id: string
  ): Promise<void> {
    await this.getRestaurantRef(restaurantId)
      .collection('inventory').doc(id).delete();
  }

  /**
   * Updates an existing inventory item in the database
   * @param {string} restaurantId - The id of the restaurant
   * @param {string} id - The id of the inventory item to update
   * @param {Partial<InventoryItem>} item - The partial item data to update
   * @return {Promise<void>}
   */
  async updateInventoryDoc(
    restaurantId: string,
    id: string,
    item: Partial<InventoryItem>
  ): Promise<void> {
    // Check if item is valid.
    Validation.validateInventoryItemPartial(restaurantId, item);

    await this.getRestaurantRef(restaurantId)
      .collection('inventory').doc(id).update({
        ...item,
      });
  }

  /**
   * Batch updates multiple inventory items in the database
   * @param {string} restaurantId - The id of the restaurant.
   * @param {Partial<InventoryItem>[]} items - The items to update
   * @return {Promise<void>}
   */
  async batchUpdateInventoryDocs(
    restaurantId: string,
    items: Partial<InventoryItem>[]
  ): Promise<void> {
    const restaurantRef = this.getRestaurantRef(restaurantId);
    const batch = this.db.batch();
    for (const item of items) {
      if (item.id) {
        // Check if item is valid.
        Validation.validateInventoryItemPartial(restaurantId, item);

        batch.update(restaurantRef.collection('inventory').doc(item.id), item);
      } else {
        throw new Error('Item ID is required');
      }
    }
    await batch.commit();
  }

  /**
   * Adds a new take inventory record to the database
   * @param {string} restaurantId - The id of the restaurant
   * @param {Omit<TakeInventory, 'id'>} takeInventory - The take inventory data
   * to add (without id).
   * @return {Promise<TakeInventory>} The created take inventory record with
   * generated id.
   */
  async addTakeInventoryDoc(
    restaurantId: string,
    takeInventory: Omit<TakeInventory, 'id'>
  ): Promise<TakeInventory> {
    const restaurantRef = this.getRestaurantRef(restaurantId);
    const batch = this.db.batch();
    const now = new Date().toISOString();

    // Check if take inventory is valid.
    Validation.validateTakeInventory(restaurantId, takeInventory);

    // Create the take inventory record
    const takeInventoryRef = restaurantRef
      .collection('takeInventory').doc();
    const newTakeInventory: TakeInventory = {
      id: takeInventoryRef.id,
      ...takeInventory,
      timestamp: now,
    };
    batch.set(takeInventoryRef, newTakeInventory);

    // Update each item's quantity and history
    for (const item of takeInventory.items) {
      const itemRef = restaurantRef
        .collection('inventory').doc(item.id);
      batch.update(itemRef, {
        currentQuantity: item.quantity,
        lastUpdated: now,
      });

      // Add history record for inventory take
      await this.addInventoryHistoryDoc(
        restaurantId,
        item.id,
        {
          date: now,
          amount: item.quantity,
          type: 'tookInventory',
        }
      );
    }

    await batch.commit();
    return newTakeInventory;
  }

  /**
   * Retrieves the take inventory history ordered by timestamp
   * @param {string} restaurantId - The id of the restaurant
   * @return {Promise<TakeInventory[]>} Array of take inventory records
   */
  async getAllTakeInventoryDocs(restaurantId: string):
    Promise<TakeInventory[]> {
    const snapshot = await this.getRestaurantRef(restaurantId)
      .collection('takeInventory')
      .orderBy('timestamp', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data() as Omit<TakeInventory, 'id'>,
    }));
  }

  /**
   * Retrieves all suppliers from the database
   * @param {string} restaurantId - The id of the restaurant
   * @return {Promise<Supplier[]>} Array of all suppliers
   */
  async getAllSupplierDocs(
    restaurantId: string
  ): Promise<Supplier[]> {
    const snapshot = await this.getRestaurantRef(restaurantId)
      .collection('suppliers').get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data() as Omit<Supplier, 'id'>,
    }));
  }

  /**
   * Retrieves a single supplier by id
   * @param {string} restaurantId - The id of the restaurant
   * @param {string} id - The id of the supplier to retrieve
   * @return {Promise<Supplier | null>} The supplier if found, null otherwise
   */
  async getSupplierDoc(
    restaurantId: string,
    id: string
  ): Promise<Supplier | null> {
    const doc = await this.getRestaurantRef(restaurantId)
      .collection('suppliers').doc(id).get();
    return doc.exists ?
      { id: doc.id, ...doc.data() as Omit<Supplier, 'id'> } :
      null;
  }

  /**
   * Adds a new supplier to the database
   * @param {string} restaurantId - The id of the restaurant
   * @param {NewSupplier} supplier - The supplier data to add
   * @return {Promise<Supplier>} The created supplier
   */
  async addSupplierDoc(
    restaurantId: string,
    supplier: NewSupplier
  ): Promise<Supplier> {
    // Check if supplier is valid.
    Validation.validateSupplier(restaurantId, supplier);

    const docRef = await this.getRestaurantRef(restaurantId)
      .collection('suppliers').add({
        name: supplier.name,
        dispatchTime: supplier.dispatchTime,
        contactMethod: supplier.contactMethod,
        daysOfDelivery: supplier.daysOfDelivery,
      });

    const newSupplier: Supplier = {
      id: docRef.id,
      ...supplier,
    };

    return newSupplier;
  }

  /**
   * Updates a supplier in the database
   * @param {string} restaurantId - The id of the restaurant
   * @param {string} id - The id of the supplier to update
   * @param {Partial<Supplier>} supplier - The partial supplier data to update
   * @return {Promise<void>}
   */
  async updateSupplierDoc(
    restaurantId: string,
    id: string,
    supplier: Partial<Supplier>
  ): Promise<void> {
    // Check if supplier is valid.
    Validation.validateSupplierPartial(restaurantId, supplier);

    await this.getRestaurantRef(restaurantId)
      .collection('suppliers').doc(id).update(supplier);
  }

  /**
   * Removes a supplier from the database
   * @param {string} restaurantId - The id of the restaurant
   * @param {string} id - The id of the supplier to remove
   * @return {Promise<void>}
   */
  async removeSupplierDoc(
    restaurantId: string,
    id: string
  ): Promise<void> {
    await this.getRestaurantRef(restaurantId)
      .collection('suppliers').doc(id).delete();
  }

  /**
   * Creates a new order in the database
   * @param {string} restaurantId - The id of the restaurant
   * @param {NewOrder} order - The order data to create
   * @return {Promise<Order>} The created order with generated id
   */
  async addOrderDoc(
    restaurantId: string,
    order: NewOrder
  ): Promise<Order> {
    const orderDoc = {
      ...order,
      status: 'pending' as OrderStatus,
      createdAt: new Date().toISOString(),
    };

    // Check if order is valid.
    Validation.validateOrder(restaurantId, orderDoc);

    const orderRef = this.getRestaurantRef(restaurantId)
      .collection('orders');
    const docRef = await orderRef.add(orderDoc);

    const newOrder: Order = {
      id: docRef.id,
      ...orderDoc,
    };

    return newOrder;
  }

  /**
   * Retrieves all orders sorted by creation date
   * @param {string} restaurantId - The id of the restaurant
   * @return {Promise<Order[]>} Array of all orders
   */
  async getAllOrderDocs(
    restaurantId: string
  ): Promise<Order[]> {
    const snapshot = await this.getRestaurantRef(restaurantId)
      .collection('orders')
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data() as Omit<Order, 'id'>,
    }));
  }

  /**
   * Retrieves a single order by id
   * @param {string} restaurantId - The id of the restaurant
   * @param {string} id - The id of the order to retrieve
   * @return {Promise<Order | null>} The order if found, null otherwise
   */
  async getOrderDoc(
    restaurantId: string,
    id: string
  ): Promise<Order | null> {
    const doc = await this.getRestaurantRef(restaurantId)
      .collection('orders').doc(id).get();
    return doc.exists ?
      { id: doc.id, ...doc.data() as Omit<Order, 'id'> } :
      null;
  }

  /**
   * Updates the status of an order
   * @param {string} restaurantId - The id of the restaurant
   * @param {string} id - The id of the order to update
   * @param {OrderStatus} status - The new status
   * @return {Promise<void>}
   */
  async updateOrderDocStatus(
    restaurantId: string,
    id: string,
    status: OrderStatus
  ): Promise<void> {
    // Check if order is valid.
    Validation.validateOrderStatus(status);

    await this.getRestaurantRef(restaurantId)
      .collection('orders').doc(id).update({
        status,
        lastUpdated: new Date().toISOString(),
      });
  }

  /**
   * Retrieves orders filtered by status
   * @param {string} restaurantId - The id of the restaurant
   * @param {OrderStatus} status - The status to filter orders by
   * @return {Promise<Order[]>} Array of orders with the specified status
   */
  async getOrderDocsByStatus(
    restaurantId: string,
    status: OrderStatus
  ): Promise<Order[]> {
    const snapshot = await this.getRestaurantRef(restaurantId)
      .collection('orders')
      .where('status', '==', status)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data() as Omit<Order, 'id'>,
    }));
  }

  /**
   * Retrieves orders filtered by item ID.
   *
   * @param {string} restaurantId - The id of the restaurant
   * @param {string} itemId - The ID of the item to filter orders by
   * @return {Promise<Order[]>} Array of orders with the specified item ID
   */
  async getOrderDocsByItemId(
    restaurantId: string,
    itemId: string
  ): Promise<Order[]> {
    // First get the item doc
    const itemDoc = await this.getRestaurantRef(restaurantId)
      .collection('inventory').doc(itemId).get();

    if (!itemDoc.exists) {
      throw new Error('Item not found');
    }

    const itemData = itemDoc.data() as InventoryItem;

    // Then get the orders that have the same supplier id
    const ordersSnapshot = await this.getRestaurantRef(restaurantId)
      .collection('orders')
      .where('supplierId', '==', itemData.supplier.id)
      .get();

    const orders = ordersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data() as Omit<Order, 'id'>,
    }));

    // Then filter the orders to only include the ones that contain the item
    const filteredOrders = orders.filter((order) =>
      order.items.some((item: OrderItem) => item.id === itemId)
    );

    return filteredOrders;
  }

  /**
   * Cancels an order
   * @param {string} restaurantId - The id of the restaurant
   * @param {string} orderId - The id of the order to cancel
   * @return {Promise<void>}
   */
  async cancelOrder(restaurantId: string, orderId: string): Promise<void> {
    const orderRef = this.getRestaurantRef(restaurantId)
      .collection('orders').doc(orderId);

    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
      throw new Error('Order not found');
    }

    const orderData = orderDoc.data();
    if (!orderData) {
      throw new Error('Order data not found');
    }

    // Check if order can be cancelled
    if (orderData.status === 'delivered' || orderData.status === 'cancelled') {
      throw new Error('Cannot cancel order that is already' +
        'delivered or cancelled');
    }

    // Update order status to cancelled
    await orderRef.update({
      status: 'cancelled' as OrderStatus,
      cancelledAt: new Date().toISOString(),
    });
  }

  /**
   * Updates an order
   * @param {string} restaurantId - The id of the restaurant
   * @param {string} orderId - The ID of the order to update
   * @param {Partial<Order>} updateData - The data to update
   * @return {Promise<void>}
   */
  async updateOrder(
    restaurantId: string,
    orderId: string,
    updateData: Partial<Order>
  ): Promise<void> {
    // Check if order is valid.
    Validation.validateOrderPartial(restaurantId, updateData);

    const orderRef = this.getRestaurantRef(restaurantId)
      .collection('orders').doc(orderId);
    await orderRef.update(updateData);
  }

  /**
   * Retrieves an email document by id
   * @param {string} id - The id of the email document to retrieve
   * @return {Promise<OrderEmail | null>} The email document if found,
   * null otherwise.
   */
  async getEmail(id: string): Promise<OrderEmail | EmailData | null> {
    const doc = await this.db.collection('emails').doc(id).get();
    return doc.exists ?
      { id: doc.id, ...doc.data() as Omit<OrderEmail, 'id'> } :
      null;
  }

  /**
   * Creates a generic email document
   * @param {Partial<EmailData | OrderEmail>} email - The email data including
   * recipients, subject, and message
   * @return {Partial<EmailData | OrderEmail>} The created email document
   * reference
   */
  async addEmailDoc(email: Partial<EmailData | OrderEmail>):
    Promise<Partial<EmailData | OrderEmail>> {
    const emailRef = this.db.collection('emails');
    const docRef = await emailRef.add({
      ...email,
    });

    const newEmail: Partial<EmailData | OrderEmail> = {
      id: docRef.id,
      ...email,
    };

    return newEmail;
  }

  /**
   * Retrieves all recipes from Firestore
   * @param {string} restaurantId - The id of the restaurant
   * @return {Promise<Recipe[]>} Array of recipes
   */
  async getAllRecipeDocs(restaurantId: string): Promise<Recipe[]> {
    try {
      const recipesSnapshot = await this.getRestaurantRef(restaurantId)
        .collection('recipes').get();
      return recipesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data() as Omit<Recipe, 'id'>,
      })) as Recipe[];
    } catch (error) {
      console.error('Error getting recipes:', error);
      throw error;
    }
  }

  /**
   * Creates a new recipe in Firestore
   * @param {string} restaurantId - The id of the restaurant
   * @param {NewRecipe} recipeData - The recipe data to create
   * @return {Promise<Recipe>} The created recipe with generated id
   */
  async addRecipeDoc(
    restaurantId: string,
    recipeData: NewRecipe
  ): Promise<Recipe> {
    try {
      const now = new Date().toISOString();
      const recipe: Omit<Recipe, 'id'> = {
        ...recipeData,
        createdAt: now,
        updatedAt: now,
      };

      // Check if recipe is valid.
      Validation.validateRecipe(restaurantId, recipe);

      const docRef = await this.getRestaurantRef(restaurantId)
        .collection('recipes').add(recipe);
      return {
        id: docRef.id,
        ...recipe,
      };
    } catch (error) {
      console.error('Error creating recipe:', error);
      throw error;
    }
  }

  /**
   * Retrieves a single recipe by id
   * @param {string} restaurantId - The id of the restaurant
   * @param {string} recipeId - The id of the recipe to retrieve
   * @return {Promise<Recipe>} The recipe if found, null otherwise
   */
  async getRecipeDoc(restaurantId: string, recipeId: string): Promise<Recipe> {
    try {
      const recipeDoc = await this.getRestaurantRef(restaurantId)
        .collection('recipes').doc(recipeId).get();
      if (!recipeDoc.exists) {
        throw new Error('Recipe not found');
      }
      return {
        id: recipeDoc.id,
        ...recipeDoc.data() as Omit<Recipe, 'id'>,
      } as Recipe;
    } catch (error) {
      console.error('Error getting recipe:', error);
      throw error;
    }
  }

  /**
   * Updates a recipe in Firestore
   * @param {string} restaurantId - The id of the restaurant
   * @param {Recipe} recipeData - The recipe data to update
   * @return {Promise<Recipe>} The updated recipe with generated id
   */
  async updateRecipeDoc(
    restaurantId: string,
    recipeData: Recipe
  ): Promise<void> {
    // Check if recipe is valid.
    Validation.validateRecipePartial(restaurantId, recipeData);

    await this.getRestaurantRef(restaurantId)
      .collection('recipes').doc(recipeData.id).update({
        ...recipeData,
      });
  }

  /**
   * Deletes a recipe in Firestore
   * @param {string} restaurantId - The id of the restaurant
   * @param {string} recipeId - The id of the recipe to delete
   * @return {Promise<void>}
   */
  async deleteRecipeDoc(restaurantId: string, recipeId: string): Promise<void> {
    await this.getRestaurantRef(restaurantId)
      .collection('recipes').doc(recipeId).delete();
  }

  /**
   * Creates a new sale record in Firestore
   * @param {Sale} sale - The sale data to create, including itemName, orderId,
   * orderDate, quantity, price and grossSales
   * @return {Promise<void>} A promise that resolves when the sale is created
   */
  async addSale(sale: Sale): Promise<void> {
    try {
      // console.log('CREATING SALE: ', sale);
      await this.db.collection('sales').add({
        ...sale,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error creating sale record:', error);
      throw error;
    }
  }
}
