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
   * Adds a new inventory item to the database
   * @param {Omit<InventoryItem, 'id'>} item - The inventory item to add
   * (without id).
   * @return {Promise<InventoryItem>} The created inventory item with
   * generated id
   */
  async addInventoryItem(item: Omit<InventoryItem, 'id'>):
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
   * Removes an inventory item from the database
   * @param {string} id - The id of the inventory item to remove
   * @return {Promise<void>}
   */
  async removeInventoryItem(id: string): Promise<void> {
    await this.db.collection('inventory').doc(id).delete();
  }

  /**
   * Updates an existing inventory item in the database
   * @param {string} id - The id of the inventory item to update
   * @param {Partial<InventoryItem>} item - The partial item data to update
   * @return {Promise<void>}
   */
  async updateInventoryItem(id: string, item: Partial<InventoryItem>):
    Promise<void> {
    await this.db.collection('inventory').doc(id).update({
      ...item,
    });
  }

  /**
   * Retrieves a single inventory item by id
   * @param {string} id - The id of the inventory item to retrieve
   * @return {Promise<InventoryItem | null>} The inventory item if found,
   * null otherwise.
   */
  async getInventoryItem(id: string): Promise<InventoryItem | null> {
    const doc = await this.db.collection('inventory').doc(id).get();
    return doc.exists ?
      { id: doc.id, ...doc.data() as Omit<InventoryItem, 'id'> } :
      null;
  }

  /**
   * Retrieves all inventory items from the database
   * @return {Promise<InventoryItem[]>} Array of all inventory items
   */
  async getAllInventoryItems(): Promise<InventoryItem[]> {
    const snapshot = await this.db.collection('inventory').get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data() as Omit<InventoryItem, 'id'>,
    }));
  }

  /**
   * Adds a new take inventory record to the database
   * @param {Omit<TakeInventory, 'id'>} takeInventory - The take inventory data
   * to add (without id).
   * @return {Promise<TakeInventory>} The created take inventory record with
   * generated id.
   */
  async addTakeInventory(takeInventory: Omit<TakeInventory, 'id'>):
    Promise<TakeInventory> {
    const docRef = await this.db.collection('takeInventory').add(takeInventory);
    return {
      id: docRef.id,
      ...takeInventory,
    };
  }

  /**
   * Retrieves the take inventory history ordered by timestamp
   * @return {Promise<TakeInventory[]>} Array of take inventory records
   */
  async getTakeInventoryHistory(): Promise<TakeInventory[]> {
    const snapshot = await this.db.collection('takeInventory')
      .orderBy('timestamp', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data() as Omit<TakeInventory, 'id'>,
    }));
  }

  /**
   * Gets the history of a specific inventory item
   * @param {string} itemId - The ID of the item to get history for
   * @return {Promise<TakeInventory[]>} Array of inventory takes that
   * include this item.
   */
  async getItemHistory(itemId: string): Promise<TakeInventory[]> {
    const takeInventoryRef = this.db.collection('takeInventory');
    const snapshot = await takeInventoryRef
      .where('items', 'array-contains', { id: itemId })
      .orderBy('timestamp', 'desc')
      .get();

    const history: TakeInventory[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      history.push({
        id: doc.id,
        timestamp: data.timestamp,
        items: data.items,
      });
    });

    return history;
  }

  /**
   * Gets all inventory items
   * @return {Promise<InventoryItem[]>} Array of inventory items
   */
  async getInventory(): Promise<InventoryItem[]> {
    const inventoryRef = this.db.collection('inventory');
    const snapshot = await inventoryRef.get();

    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data() as Omit<InventoryItem, 'id'>,
    }));

    return items;
  }

  /**
   * Retrieves all suppliers from the database
   * @return {Promise<Supplier[]>} Array of all suppliers
   */
  async getSuppliers(): Promise<Supplier[]> {
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
  async getSupplier(id: string): Promise<Supplier | null> {
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
  async addSupplier(supplier: NewSupplier): Promise<Supplier> {
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
  async createOrder(order: NewOrder): Promise<Order> {
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
  async getOrders(): Promise<Order[]> {
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
  async getOrder(id: string): Promise<Order | null> {
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
  async updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
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
  async getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
    const snapshot = await this.db.collection('orders')
      .where('status', '==', status)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data() as Omit<Order, 'id'>,
    }));
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
  async createEmail(email: Partial<EmailData | OrderEmail>):
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
}
