import twilio from 'twilio';
import { TWILLIO_CONFIG } from '../config/twillio';

/**
 * Service class for handling Twilio messaging operations
 */
export class TwilioService {
  private client: twilio.Twilio;
  private fromNumber: string;

  /**
   * Initializes a new instance of TwilioService
   * @throws {Error} If any required Twilio configuration is missing
   */
  constructor() {
    // Get these from environment variables
    const accountSid = TWILLIO_CONFIG.SID;
    const authToken = TWILLIO_CONFIG.AUTH_TOKEN;
    this.fromNumber = TWILLIO_CONFIG.FROM_NUMBER ?? '';

    if (!accountSid || !authToken || this.fromNumber === '') {
      throw new Error('Missing Twilio configuration');
    }

    this.client = twilio(accountSid, authToken);
  }

  /**
   * Sends a WhatsApp message using Twilio
   * @param {string} to - The recipient's phone number
   * @param {string} message - The message to send
   * @return {Promise<void>}
   * @throws {Error} If the message fails to send
   */
  async sendWhatsAppMessage(to: string, message: string): Promise<void> {
    try {
      await this.client.messages.create({
        from: `whatsapp:${this.fromNumber}`,
        to: `whatsapp:${to}`,
        body: message,
      });
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw new Error('Failed to send WhatsApp message');
    }
  }
}
