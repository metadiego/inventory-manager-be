import { EmailData, Order, OrderItem, Restaurant, Supplier } from '../types';
import { FirestoreService } from './firestore';

/**
 * Service class for handling email-related operations
 */
export class EmailService {
  private readonly firestoreService: FirestoreService;

  /**
   * Initializes a new instance of EmailService
   */
  constructor() {
    this.firestoreService = new FirestoreService();
  }

  /**
   * Generates the email content for an order
   * @param {Restaurant} restaurant - The restaurant details
   * @param {Order} order - The order details to include in the email
   * @param {Supplier} supplier - The supplier information for the order
   * @return {Promise<{subject: string, html: string}>} The subject and HTML.
   */
  async generateOrderEmailContent(
    restaurant: Restaurant,
    order: Order,
    supplier: Supplier
  ): Promise<{ subject: string, html: string }> {
    const itemsList = order.items
      .map((item: OrderItem) => `
        <tr>
          <td style="padding: 8px">${item.name}</td>
          <td style="padding: 8px">${item.orderQuantity} ${item.unit}</td>
        </tr>
      `)
      .join('');

    const html = `
      <h2><u>Nueva Orden de The Window</u></h2>
      <span><b>ID de Orden:</b> ${order.id}</span><br>
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px">
        <thead>
          <tr style="background-color: #f3f4f6">
            <th style="padding: 8px; text-align: left">Producto</th>
            <th style="padding: 8px; text-align: left">Cantidad</th>
          </tr>
        </thead>
        <tbody style="border: 1px solid #e5e7eb">
          ${itemsList}
        </tbody>
      </table>

      <h3><u>Datos de entrega:</u></h3>
      <span><b>Fecha de entrega:</b> 
        ${new Date(order.expectedDelivery).toLocaleDateString('en-GB')}
      </span><br>
      <span><b>Hora de entrega:</b> a partir de las 12:15 AM.</span><br>
      <span><b>
        Dirección:</b> ${restaurant.address}
      </span><br>
      <span><b>Contacto:</b> Diego Olalde +34 635 235 632</span><br>

      <h3><u>Datos de Facturación:</u></h3>
      <span><b>CIF:</b> B56514680</span><br>
      <span><b>Razón Social:</b> The Window Foods SL</span><br>
      <span><b>Domicilio Fiscal:</b> 
        Calle Principe de Vergara 11, Apt. 4C. Madrid, 28001
      </span><br>

      <p>Gracias y saludos!</p>
      <p>The Window</p>
    `;

    return {
      subject:
        `${restaurant.name} - Pedido - 
        ${supplier.name} - 
        ${new Date().toLocaleDateString('en-GB')} - 
        ${order.id}
      `,
      html,
    };
  }

  /**
   * Creates a generic email document in Firestore
   * @param {Omit<EmailData, 'id' | 'delivery'>} emailData - The email data
   * including recipients, subject, and message
   * @return {Promise<string>} The ID of the created email document
   * @throws {Error} If the email document creation fails
   */
  async createEmail(emailData: Omit<EmailData, 'id' | 'delivery'>):
    Promise<string> {
    const emailDoc = await this.firestoreService.addEmailDoc({
      ...emailData,
    });

    if (!emailDoc.id) {
      throw new Error('Failed to create email document');
    }

    return emailDoc.id;
  }

  /**
   * Creates an email document for a specific order
   * @param {Restaurant} restaurant - The restaurant details
   * @param {Order} order - The order details
   * @return {Promise<string>} The ID of the created email document
   * @throws {Error} If the supplier does not have a valid email contact method
   */
  async createOrderEmail(
    restaurant: Restaurant,
    order: Order
  ): Promise<string> {
    const supplier = await this.firestoreService.getSupplierDoc(
      order.restaurantId,
      order.supplierId
    );
    if (!supplier || !supplier.contactMethod ||
      supplier.contactMethod.type !== 'email' ||
      !supplier.contactMethod.emails?.length) {
      throw new Error('Supplier does not have email contact method');
    }

    const emailData = {
      to: 'diegoolalde@gmail.com',
      cc: ['diegoolalde@gmail.com', 'lucia_88@live.com'],
      message: await this.generateOrderEmailContent(
        restaurant, order, supplier
      ),
      orderId: order.id,
    };

    return this.createEmail(emailData);
  }
}
