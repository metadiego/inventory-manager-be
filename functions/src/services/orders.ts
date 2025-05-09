import { FirestoreService } from './firestore';
import { ReceivedItem, InventoryItem, OrderStatus, OrderItem } from '../types';
import { EmailService } from './email';

/**
 * Service class for managing orders, including sending orders
 * and recording deliveries.
 */
export class OrdersService {
  private readonly firestoreService: FirestoreService;
  private readonly emailService: EmailService;

  /**
   * Creates an instance of OrdersService
   */
  constructor() {
    this.firestoreService = new FirestoreService();
    this.emailService = new EmailService();
  }

  /**
   * Sends an order using the supplier's preferred communication method
   * @param {string} restaurantId - The ID of the restaurant
   * @param {string} orderId - The ID of the order to send
   * @return {Promise<void>}
   * @throws {Error} If order not found, already sent, or supplier not found
   */
  async sendOrder(
    restaurantId: string,
    orderId: string
  ): Promise<void> {
    const restaurant = await this.firestoreService.getRestaurantDoc(
      restaurantId
    );
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    const order = await this.firestoreService.getOrderDoc(
      restaurantId, orderId
    );
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'pending') {
      throw new Error('Only pending orders can be sent');
    }

    const supplier = await this.firestoreService.getSupplierDoc(
      restaurantId,
      order.supplierId
    );
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    // Send order based on supplier's preferred contact method
    if (supplier.contactMethod?.type === 'email') {
      await this.emailService.createOrderEmail(restaurant, order);
    } else {
      throw new Error('Invalid supplier contact method');
    }

    await this.firestoreService.updateOrderDocStatus(
      restaurantId,
      orderId,
      'sent'
    );
  }

  /**
   * Records the delivery of an order and updates inventory quantities
   * @param {string} restaurantId - The ID of the restaurant
   * @param {string} orderId - The ID of the order
   * @param {ReceivedItem[]} receivedItems - The items received in the delivery
   * @return {Promise<void>}
   * @throws {Error} If order not found or already delivered
   */
  async recordOrderDelivery(
    restaurantId: string,
    orderId: string,
    receivedItems: ReceivedItem[],
  ): Promise<void> {
    const order = await this.firestoreService.getOrderDoc(
      restaurantId, orderId
    );
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'delivered') {
      throw new Error('Order already delivered');
    }

    // Get the current inventory items
    const items: InventoryItem[] =
      await this.firestoreService.getAllInventoryDocs(restaurantId);
    const itemsById = items.reduce(
      (acc, item) => ({
        ...acc, [item.id]: item,
      }), {} as Record<string, InventoryItem>);

    // Create a map of received quantities
    const receivedQuantitiesById = receivedItems.reduce(
      (acc, item) => ({
        ...acc, [item.id]: item.quantity,
      }), {} as Record<string, number>);

    // Update order items with received quantities
    const updatedItems = order.items.map((item: OrderItem) => ({
      ...item,
      receivedQuantity: receivedQuantitiesById[item.id] || 0,
    }));

    // Update the order with received quantities
    await this.firestoreService.updateOrder(
      restaurantId,
      orderId,
      {
        items: updatedItems,
        status: 'delivered' as OrderStatus,
      }
    );

    // Update the inventory items with new quantities.
    await this.firestoreService.batchUpdateInventoryDocs(
      restaurantId,
      receivedItems.map((item) => ({
        id: item.id,
        currentQuantity: itemsById[item.id].currentQuantity + item.quantity,
        lastUpdated: new Date().toISOString(),
      })),
    );

    // Add history records for each item in the order
    await this.firestoreService.batchAddInventoryHistoryDocs(
      restaurantId,
      receivedItems.map((item) => ({
        itemId: item.id,
        record: {
          date: new Date().toISOString(),
          amount: item.quantity,
          type: 'receivedOrder',
        },
      })),
    );
  }
}
