/**
 * Import function triggers from their respective submodules
 */
import {onCall} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FirestoreService } from './services/firestore';
import { errorHandler } from './utils/error-handler';
import {
  InventoryItem,
  TakeInventory,
  NewSupplier,
  NewOrder,
  OrderEmail,
} from './types';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { OrdersService } from './services/orders';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { InventoryMonitoringService } from './services/inventory-monitoring';
import { EmailService } from './services/email';

// Initialize services
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const firestoreService = new FirestoreService();
const ordersService = new OrdersService();
const emailService = new EmailService();

const inventoryMonitoringService = new InventoryMonitoringService(
  firestoreService,
  emailService
);

export const getInventoryItem = onCall(async (request) => {
  try {
    const { itemId } = request.data;
    const item = await firestoreService.getInventoryItem(itemId);
    return { success: true, data: item };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

export const getItemHistory = onCall(async (request) => {
  try {
    const { itemId } = request.data;
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    const history = await firestoreService.getItemHistory(itemId);
    return { success: true, data: history };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

export const addInventoryItem = onCall(async (request) => {
  try {
    const item = request.data as Omit<InventoryItem, 'id'>;
    const newItem = await firestoreService.addInventoryItem(item);
    return { success: true, data: newItem };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

export const removeInventoryItem = onCall(async (request) => {
  try {
    const { id } = request.data;
    await firestoreService.removeInventoryItem(id);
    return { success: true, data: { id } };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

export const updateInventoryItem = onCall(async (request) => {
  try {
    const { id, updateData } = request.data;
    await firestoreService.updateInventoryItem(id, updateData);
    return { success: true, data: { id } };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

export const getInventory = onCall(async () => {
  try {
    const items = await firestoreService.getInventory();
    return { success: true, data: items };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

export const takeInventory = onCall(async (request) => {
  try {
    const takeInventoryData: Omit<TakeInventory, 'id'> = {
      timestamp: new Date().toISOString(),
      items: request.data.items,
    };

    const newTakeInventory = await firestoreService.addTakeInventory(
      takeInventoryData
    );

    // Update current quantities using the correct item ID
    for (const item of takeInventoryData.items) {
      await firestoreService.updateInventoryItem(item.id, {
        currentQuantity: item.quantity,
        lastUpdated: takeInventoryData.timestamp,
      });
    }

    return { success: true, data: newTakeInventory };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

export const getInventoryHistory = onCall(async () => {
  try {
    const history = await firestoreService.getTakeInventoryHistory();
    return { success: true, data: history };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to check for outdated inventory items.
 */
export const checkInventory = onCall(async () => {
  try {
    await inventoryMonitoringService.checkOutdatedItems();
    return { success: true, data: { } };
  } catch (error) {
    console.error('Error in checkInventoryUpdateFrequency:', error);
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to get all suppliers.
 */
export const getSuppliers = onCall(async () => {
  try {
    const suppliers = await firestoreService.getSuppliers();
    return { success: true, data: suppliers };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to add a new supplier.
 */
export const addSupplier = onCall(async (request) => {
  try {
    const supplierData = request.data as NewSupplier;

    // Validate the input
    if (!supplierData.name || supplierData.name.trim() === '') {
      throw new Error('Supplier name is required');
    }

    if (typeof supplierData.dispatchTime !== 'number' ||
        supplierData.dispatchTime < 0) {
      throw new Error('Dispatch time must be a positive number');
    }

    if (!supplierData.contactMethod || !supplierData.contactMethod.type) {
      throw new Error('Contact method type is required');
    }

    if (supplierData.contactMethod.type === 'email') {
      if (!supplierData.contactMethod.emails ||
          !supplierData.contactMethod.emails.length ||
          !supplierData.contactMethod.emails[0].trim()) {
        throw new Error('At least one email address is required');
      }
    }

    if (supplierData.contactMethod.type === 'phone') {
      if (!supplierData.contactMethod.phone ||
          !supplierData.contactMethod.phone.trim()) {
        throw new Error('Phone number is required');
      }
    }

    const newSupplier = await firestoreService.addSupplier(supplierData);
    return { success: true, data: newSupplier };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to get all orders.
 */
export const getOrders = onCall(async () => {
  try {
    const orders = await firestoreService.getOrders();
    return { success: true, data: orders };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to get all orders by status.
 */
export const getOrdersByStatus = onCall(async (request) => {
  try {
    const { orderStatus } = request.data;
    const orders = await firestoreService.getOrdersByStatus(orderStatus);
    return { success: true, data: orders };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to create a new order.
 */
export const createOrder = onCall(async (request) => {
  try {
    const orderData = request.data as NewOrder;

    // Validate the input
    if (!orderData.supplierId || !orderData.supplierName) {
      throw new Error('Supplier information is required');
    }

    if (!orderData.items || orderData.items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    if (!orderData.expectedDelivery) {
      throw new Error('Expected delivery date is required');
    }

    const order = await firestoreService.createOrder(orderData);
    return { success: true, data: order };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to get a single order by id.
 */
export const getOrder = onCall(async (request) => {
  try {
    const { orderId } = request.data;
    if (!orderId) {
      throw new Error('Order ID is required');
    }

    const order = await firestoreService.getOrder(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    return { success: true, data: order };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to cancel an order.
 */
export const cancelOrder = onCall(async (request) => {
  try {
    const { orderId } = request.data;
    await firestoreService.cancelOrder(orderId);
    return { success: true, data: { id: orderId } };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to send an order.
 */
export const sendOrder = onCall(async (request) => {
  try {
    const { orderId } = request.data;
    if (!orderId) {
      throw new Error('Order ID is required');
    }

    await ordersService.sendOrder(orderId);
    return { success: true, data: { id: orderId } };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to record the delivery of an order.
 */
export const recordOrderDelivery = onCall(async (request) => {
  try {
    const { orderId, receivedItems } = request.data;
    await ordersService.recordOrderDelivery(orderId, receivedItems);
    return { success: true, data: { id: orderId } };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * Firebase Function triggered when an email document is created or updated.
 * Monitors the delivery status of order emails and updates the corresponding
 * order status.
 *
 * @param {DocumentWrittenEvent} event - The event object containing the email
 * document data.
 * @returns {Promise<void>}
 */
export const onEmailDeliveryStatusUpdate = onDocumentWritten(
  'emails/{emailId}', async (event) => {
    try {
      const email = await firestoreService.getEmail(event.params.emailId);
      if (email?.delivery?.state === 'SUCCESS' &&
        (email as OrderEmail).orderId) {
        await firestoreService.updateOrderStatus(
          (email as OrderEmail).orderId, 'confirmed'
        );
      }
    } catch (error) {
      console.error('Error in onEmailDeliveryStatusUpdate:', error);
      const httpsError = errorHandler(error);
      throw new Error(httpsError.message);
    }
  });


/** **************************************************************************
 * Scheduled functions.
 *************************************************************************** */

/**
 * Scheduled function that runs daily to check for inventory items
 * that haven't been updated within their required frequency period.
 * Sends WhatsApp notifications for outdated items.
 */
export const checkInventoryUpdateFrequency = onSchedule({
  schedule: '0 14 * * *', // Runs at 2 PM every day
  timeZone: 'America/New_York', // Specify your timezone
}, async () => {
  try {
    await inventoryMonitoringService.checkOutdatedItems();
  } catch (error) {
    console.error('Error in checkInventoryUpdateFrequency:', error);
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});
