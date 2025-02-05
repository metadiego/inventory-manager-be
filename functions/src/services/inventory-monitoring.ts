import { FirestoreService } from './firestore';
import { InventoryItem, UpdateFrequency } from '../types';
import { EmailService } from './email';

/**
 * Service class for monitoring inventory items and sending updates
 */
export class InventoryMonitoringService {
  /**
   * Initializes a new instance of InventoryMonitoringService
   * @param {FirestoreService} firestoreService - The Firestore service
   * @param {EmailService} emailService - The email service
   */
  constructor(
    private firestoreService: FirestoreService,
    private emailService: EmailService
  ) {}

  /**
   * Converts the update frequency to the number of days
   * @param {UpdateFrequency} frequency - The update frequency
   * @return {number} The number of days
   */
  private getFrequencyInDays(frequency: UpdateFrequency): number {
    switch (frequency) {
    case 'daily':
      return 1;
    case 'weekly':
      return 7;
    case 'monthly':
      return 30;
    default:
      return 1;
    }
  }

  /**
   * Checks for outdated inventory items and sends an email if any are found
   * @return {Promise<void>}
   */
  async checkOutdatedItems(): Promise<void> {
    try {
      // Get all inventory items
      const items = await this.firestoreService.getInventory();

      // Filter out items that have not been updated or have no
      // update frequency.
      const outdatedItems = items.filter((item) => {
        if (!item.lastUpdated || !item.updateFrequency) return false;

        const lastUpdate = new Date(item.lastUpdated);
        const now = new Date();
        const daysSinceUpdate = Math.floor((now.getTime() -
          lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

        const requiredFrequency = this.getFrequencyInDays(item.updateFrequency);

        return requiredFrequency <= daysSinceUpdate;
      });

      if (outdatedItems.length > 0) {
        const message = this.createOutdatedItemsMessage(outdatedItems);
        await this.emailService.createEmail({
          to: 'diegoolalde@gmail.com',
          cc: [],
          message: {
            subject: 'The Window - Inventory Update Reminder',
            html: message,
          },
        });
      }
    } catch (error) {
      console.error('Error checking outdated items:', error);
      throw error;
    }
  }

  /**
   * Creates a message for outdated inventory items
   * @param {InventoryItem[]} items - The inventory items
   * @return {string} The message
   */
  private createOutdatedItemsMessage(items: InventoryItem[]): string {
    return `
      <h3>⚠️ The following items need to be updated:</h3>
      <br/>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f3f4f6">
            <th style="padding: 8px; text-align: left">Item Name</th>
            <th style="padding: 8px; text-align: left">Last Updated</th>
            <th style="padding: 8px; text-align: left">Required Frequency</th>
          </tr>
        </thead>
        <tbody style="border: 1px solid #e5e7eb">
          ${items.map((item) => `
            <tr>
              <td style="padding: 8px"><strong>${item.name}</strong></td>
              <td style="padding: 8px">
                ${new Date(item.lastUpdated).toLocaleDateString()}
              </td>
              <td style="padding: 8px">${item.updateFrequency}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}
