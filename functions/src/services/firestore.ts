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
} from '../types';

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
   * Retrieves a single inventory item by id
   * @param {string} id - The id of the inventory item to retrieve
   * @return {Promise<InventoryItem | null>} The inventory item if found,
   * null otherwise.
   */
  async getInventoryDoc(id: string): Promise<InventoryItem | null> {
    const doc = await this.db.collection('inventory').doc(id).get();
    return doc.exists ?
      { id: doc.id, ...doc.data() as Omit<InventoryItem, 'id'> } :
      null;
  }

  /**
   * Retrieves all inventory items from the database
   * @return {Promise<InventoryItem[]>} Array of all inventory items
   */
  async getAllInventoryDocs(): Promise<InventoryItem[]> {
    const snapshot = await this.db.collection('inventory').get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data() as Omit<InventoryItem, 'id'>,
    }));
  }


  /**
   * Gets the history of a specific inventory item
   * @param {string} itemId - The ID of the item to get history for
   * @return {Promise<InventoryHistoryRecord[]>} Array of inventory history
   * records.
   */
  async getInventoryDocHistory(itemId: string):
    Promise<InventoryHistoryRecord[]> {
    const historySnapshot = await this.db
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
   * @param {Omit<InventoryItem, 'id'>} item - The inventory item to add
   * (without id).
   * @return {Promise<InventoryItem>} The created inventory item with
   * generated id
   */
  async addInventoryDoc(item: Omit<InventoryItem, 'id'>):
    Promise<InventoryItem> {
    const inventoryRef = this.db.collection('inventory');
    const docRef = await inventoryRef.add({
      ...item,
      lastUpdated: new Date().toISOString(),
    });

    const newItem: InventoryItem = {
      id: docRef.id,
      ...item,
      lastUpdated: new Date().toISOString(),
    };

    return newItem;
  }

  /**
   * Adds a history record to an inventory item's history subcollection
   * @param {string} itemId - The ID of the inventory item
   * @param {InventoryHistoryRecord} record - The history record to add
   */
  private async addInventoryHistoryDoc(
    itemId: string,
    record: InventoryHistoryRecord
  ): Promise<void> {
    await this.db
      .collection('inventory')
      .doc(itemId)
      .collection('history')
      .add(record);
  }

  /**
   * Batch adds history records to multiple inventory items
   * @param {Array<{itemId: string, record: InventoryHistoryRecord}>} items
   *  - The items to add history records to
   */
  async batchAddInventoryHistoryDocs(
    items: { itemId: string; record: InventoryHistoryRecord }[],
  ): Promise<void> {
    const batch = this.db.batch();
    for (const elem of items) {
      const docRef = this.db.collection('inventory')
        .doc(elem.itemId)
        .collection('history')
        .doc(); // Create new doc reference with auto-generated ID
      batch.set(docRef, elem.record);
    }
    await batch.commit();
  }

  /**
   * Removes an inventory item from the database
   * @param {string} id - The id of the inventory item to remove
   * @return {Promise<void>}
   */
  async removeInventoryDoc(id: string): Promise<void> {
    await this.db.collection('inventory').doc(id).delete();
  }

  /**
   * Updates an existing inventory item in the database
   * @param {string} id - The id of the inventory item to update
   * @param {Partial<InventoryItem>} item - The partial item data to update
   * @return {Promise<void>}
   */
  async updateInventoryDoc(id: string, item: Partial<InventoryItem>):
    Promise<void> {
    await this.db.collection('inventory').doc(id).update({
      ...item,
    });
  }

  /**
   * Batch updates multiple inventory items in the database
   * @param {Partial<InventoryItem>[]} items - The items to update
   * @return {Promise<void>}
   */
  async batchUpdateInventoryDocs(items: Partial<InventoryItem>[]):
    Promise<void> {
    const batch = this.db.batch();
    for (const item of items) {
      if (item.id) {
        batch.update(this.db.collection('inventory').doc(item.id), item);
      } else {
        throw new Error('Item ID is required');
      }
    }
    await batch.commit();
  }

  /**
   * Adds a new take inventory record to the database
   * @param {Omit<TakeInventory, 'id'>} takeInventory - The take inventory data
   * to add (without id).
   * @return {Promise<TakeInventory>} The created take inventory record with
   * generated id.
   */
  async addTakeInventoryDoc(takeInventory: Omit<TakeInventory, 'id'>):
    Promise<TakeInventory> {
    const batch = this.db.batch();
    const now = new Date().toISOString();

    // Create the take inventory record
    const takeInventoryRef = this.db.collection('takeInventory').doc();
    const newTakeInventory: TakeInventory = {
      id: takeInventoryRef.id,
      ...takeInventory,
      timestamp: now,
    };
    batch.set(takeInventoryRef, newTakeInventory);

    // Update each item's quantity and history
    for (const item of takeInventory.items) {
      const itemRef = this.db.collection('inventory').doc(item.id);
      batch.update(itemRef, {
        currentQuantity: item.quantity,
        lastUpdated: now,
      });

      // Add history record for inventory take
      await this.addInventoryHistoryDoc(item.id, {
        date: now,
        amount: item.quantity,
        type: 'tookInventory',
      });
    }

    await batch.commit();
    return newTakeInventory;
  }

  /**
   * Retrieves the take inventory history ordered by timestamp
   * @return {Promise<TakeInventory[]>} Array of take inventory records
   */
  async getAllTakeInventoryDocs(): Promise<TakeInventory[]> {
    const snapshot = await this.db.collection('takeInventory')
      .orderBy('timestamp', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data() as Omit<TakeInventory, 'id'>,
    }));
  }

  /**
   * Retrieves all suppliers from the database
   * @return {Promise<Supplier[]>} Array of all suppliers
   */
  async getAllSupplierDocs(): Promise<Supplier[]> {
    const snapshot = await this.db.collection('suppliers').get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data() as Omit<Supplier, 'id'>,
    }));
  }

  /**
   * Retrieves a single supplier by id
   * @param {string} id - The id of the supplier to retrieve
   * @return {Promise<Supplier | null>} The supplier if found, null otherwise
   */
  async getSupplierDoc(id: string): Promise<Supplier | null> {
    const doc = await this.db.collection('suppliers').doc(id).get();
    return doc.exists ?
      { id: doc.id, ...doc.data() as Omit<Supplier, 'id'> } :
      null;
  }

  /**
   * Adds a new supplier to the database
   * @param {NewSupplier} supplier - The supplier data to add
   * @return {Promise<Supplier>} The created supplier
   */
  async addSupplierDoc(supplier: NewSupplier): Promise<Supplier> {
    const docRef = await this.db.collection('suppliers').add({
      name: supplier.name,
      dispatchTime: supplier.dispatchTime,
      contactMethod: supplier.contactMethod,
      daysOfDelivery: supplier.daysOfDelivery,
    });

    const newSupplier: Supplier = {
      id: docRef.id,
      name: supplier.name,
      dispatchTime: supplier.dispatchTime,
      contactMethod: supplier.contactMethod,
      daysOfDelivery: supplier.daysOfDelivery,
    };

    return newSupplier;
  }

  /**
   * Creates a new order in the database
   * @param {NewOrder} order - The order data to create
   * @return {Promise<Order>} The created order with generated id
   */
  async addOrderDoc(order: NewOrder): Promise<Order> {
    const orderRef = this.db.collection('orders');
    const docRef = await orderRef.add({
      ...order,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    const newOrder: Order = {
      id: docRef.id,
      ...order,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    return newOrder;
  }

  /**
   * Retrieves all orders sorted by creation date
   * @return {Promise<Order[]>} Array of all orders
   */
  async getAllOrderDocs(): Promise<Order[]> {
    const snapshot = await this.db.collection('orders')
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data() as Omit<Order, 'id'>,
    }));
  }

  /**
   * Retrieves a single order by id
   * @param {string} id - The id of the order to retrieve
   * @return {Promise<Order | null>} The order if found, null otherwise
   */
  async getOrderDoc(id: string): Promise<Order | null> {
    const doc = await this.db.collection('orders').doc(id).get();
    return doc.exists ?
      { id: doc.id, ...doc.data() as Omit<Order, 'id'> } :
      null;
  }

  /**
   * Updates the status of an order
   * @param {string} id - The id of the order to update
   * @param {OrderStatus} status - The new status
   * @return {Promise<void>}
   */
  async updateOrderDocStatus(id: string, status: OrderStatus): Promise<void> {
    await this.db.collection('orders').doc(id).update({
      status,
      lastUpdated: new Date().toISOString(),
    });
  }

  /**
   * Retrieves orders filtered by status
   * @param {OrderStatus} status - The status to filter orders by
   * @return {Promise<Order[]>} Array of orders with the specified status
   */
  async getOrderDocsByStatus(status: OrderStatus): Promise<Order[]> {
    const snapshot = await this.db.collection('orders')
      .where('status', '==', status)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data() as Omit<Order, 'id'>,
    }));
  }

  /**
   * Retrieves orders filtered by item ID
   * @param {string} itemId - The ID of the item to filter orders by
   * @return {Promise<Order[]>} Array of orders with the specified item ID
   */
  async getOrderDocsByItemId(itemId: string): Promise<Order[]> {
    // First get the item doc
    const itemDoc = await this.db.collection('inventory').doc(itemId).get();
    if (!itemDoc.exists) {
      throw new Error('Item not found');
    }

    const itemData = itemDoc.data() as InventoryItem;

    // Then get the orders that have the same supplier id
    const ordersSnapshot = await this.db.collection('orders')
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
   * @param {string} orderId - The id of the order to cancel
   * @return {Promise<void>}
   */
  async cancelOrder(orderId: string): Promise<void> {
    const orderRef = this.db.collection('orders').doc(orderId);

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
   * @param {string} orderId - The ID of the order to update
   * @param {Partial<Order>} updateData - The data to update
   * @return {Promise<void>}
   */
  async updateOrder(
    orderId: string,
    updateData: Partial<Order>
  ): Promise<void> {
    const orderRef = this.db.collection('orders').doc(orderId);
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

  /**
   * Retrieves all recipes from Firestore
   * @return {Promise<Recipe[]>} Array of recipes
   */
  async getAllRecipeDocs(): Promise<Recipe[]> {
    try {
      const recipesSnapshot = await this.db.collection('recipes').get();
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
   * @param {NewRecipe} recipeData - The recipe data to create
   * @return {Promise<Recipe>} The created recipe with generated id
   */
  async addRecipeDoc(recipeData: NewRecipe): Promise<Recipe> {
    try {
      const now = new Date().toISOString();
      const recipe: Omit<Recipe, 'id'> = {
        ...recipeData,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await this.db.collection('recipes').add(recipe);
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
   * @param {string} recipeId - The id of the recipe to retrieve
   * @return {Promise<Recipe>} The recipe if found, null otherwise
   */
  async getRecipeDoc(recipeId: string): Promise<Recipe> {
    try {
      const recipeDoc = await this.db.collection('recipes').doc(recipeId).get();
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
}
