import { SquareClient } from 'square';
import { SquareOrder } from '../types/square';

/**
 * Service class for interacting with the Square API
 * Manages Square client initialization and order fetching
 */
export class SquareService {
  // private client: SquareClient;
  // private locationId: string;


  /**
   * Initializes a new instance of SquareService.
   */
  constructor() {

    // if (!accessToken || !locationId) {
    //   throw new Error('Access token and location ID are required');
    // }

    // Initialize Square client
    // this.client = new SquareClient({
    //   token: accessToken
    // });
    // this.locationId = locationId;
  }

  /**
   * Fetches orders from Square API within a specified time range
   * @param {string} startAt - The start date for the sales data
   * @param {string} endAt - The end date for the sales data
   * @return {Promise<SquareOrder[]>} A promise that resolves to an array of
   * Square orders.
   */
  async fetchOrders(startAt: string, endAt: string): Promise<SquareOrder[]> {
    try {
      const client = new SquareClient({
        token: process.env.SQUARE_ACCESS_TOKEN || '',
      });

      const response = await client.orders.search({
        locationIds: [process.env.SQUARE_LOCATION_ID || ''],
        query: {
          filter: {
            dateTimeFilter: {
              createdAt: {
                startAt,
                endAt,
              },
            },
            stateFilter: {
              states: ['COMPLETED'],
            },
          },
          sort: {
            sortField: 'CLOSED_AT',
            sortOrder: 'DESC',
          },
        },
      });

      // Type assertion since we know the response matches our type
      const orders = response.orders as unknown as SquareOrder[];

      if (!orders?.length) {
        return [];
      }
      return orders;
    } catch (error) {
      console.error('Error fetching orders from Square:', error);
      throw error;
    }
  }
}
