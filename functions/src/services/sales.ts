import { FirestoreService } from './firestore';
import { SquareService } from './square';

/**
 * Service class for handling sales-related operations
 * Manages interactions between Square API and Firestore for sales data
 */
export class SalesService {
  private firestoreService: FirestoreService;
  private squareService: SquareService;

  /**
   * Initializes a new instance of SalesService
   * Creates instances of FirestoreService and SquareService for data operations
   */
  constructor() {
    this.firestoreService = new FirestoreService();
    this.squareService = new SquareService();
  }

  /**
   * Process sales data for a given time period.
   * @param {string} startAt - The start date for the sales data
   * @param {string} endAt - The end date for the sales data
   * @return {Promise<void>} A promise that resolves when the sales data
   * is processed
   */
  async processSales(startAt: string, endAt: string) {
    try {
      // Fetch orders from Square
      const orders = await this.squareService.fetchOrders(startAt, endAt);

      // Process each order
      for (const order of orders) {
        if (!order.lineItems?.length) continue;

        // Process each line item in the order
        for (const lineItem of order.lineItems) {
          const amount = lineItem.basePriceMoney?.amount;
          const grossAmount = lineItem.grossSalesMoney?.amount;

          if (!amount || !grossAmount) {
            console.warn(`Skipping line item in order ${order.id} `+
              'due to missing money data');
            continue;
          }

          await this.firestoreService.addSale({
            itemName: lineItem.name,
            itemId: lineItem.catalogObjectId,
            modifiers: lineItem.modifiers?.map((modifier) => ({
              id: modifier.uid,
              name: modifier.name,
              price: Number(modifier.totalPriceMoney.amount) / 100,
            })) ?? [],
            orderId: order.id,
            orderDate:
              order.closedAt ||
              order.createdAt ||
              new Date().toISOString(),
            quantity: parseFloat(lineItem.quantity),
            price: Number(amount) / 100, // Convert from cents to dollars
            grossSales: Number(grossAmount) / 100,
          });
        }
      }
    } catch (error) {
      console.error('Error processing sales:', error);
      throw error;
    }
  }
}
