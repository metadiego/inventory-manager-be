import { FirestoreService } from './firestore';
import { ReceivedItem, InventoryItem, OrderStatus } from '../types';
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
   * @param {string} orderId - The ID of the order to send
   * @return {Promise<void>}
   * @throws {Error} If order not found, already sent, or supplier not found
   */
  async sendOrder(orderId: string): Promise<void> {
    const order = await this.firestoreService.getOrder(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'pending') {
      throw new Error('Only pending orders can be sent');
    }

    const supplier = await this.firestoreService.getSupplier(order.supplierId);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    // Send order based on supplier's preferred contact method
    if (supplier.contactMethod.type === 'email') {
      await this.emailService.createOrderEmail(order);
    } else {
      throw new Error('Invalid supplier contact method');
    }

    await this.firestoreService.updateOrderStatus(orderId, 'sent');
  }

  /**
   * Records the delivery of an order and updates inventory quantities
   * @param {string} orderId - The ID of the order
   * @param {ReceivedItem[]} receivedItems - The items received in the delivery
   * @return {Promise<void>}
   * @throws {Error} If order not found or already delivered
   */
  async recordOrderDelivery(
    orderId: string,
    receivedItems: ReceivedItem[],
  ): Promise<void> {
    const order = await this.firestoreService.getOrder(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'delivered') {
      throw new Error('Order already delivered');
    }

    // Get the current inventory items
    const items: InventoryItem[] = await this.firestoreService.getInventory();
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
    const updatedItems = order.items.map((item) => ({
      ...item,
      receivedQuantity: receivedQuantitiesById[item.id] || 0,
    }));

    // Update the order with received quantities
    await this.firestoreService.updateOrder(orderId, {
      items: updatedItems,
      status: 'delivered' as OrderStatus,
    });

    // Update the inventory items with a take inventory
    await this.firestoreService.addTakeInventory({
      timestamp: new Date().toISOString(),
      items: receivedItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: itemsById[item.id].currentQuantity + item.quantity,
      })),
    });

    // Update current quantities using the correct item ID
    for (const item of receivedItems) {
      await this.firestoreService.updateInventoryItem(item.id, {
        currentQuantity: itemsById[item.id].currentQuantity + item.quantity,
        lastUpdated: new Date().toISOString(),
      });
    }
  }
}
