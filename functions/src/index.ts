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
  NewRecipe,
  Recipe,
} from './types';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { OrdersService } from './services/orders';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { InventoryMonitoringService } from './services/inventory-monitoring';
import { EmailService } from './services/email';
import { SalesService } from './services/sales';
import { StorageService } from './services/storage';
import { subHours, formatISO } from 'date-fns';
// import { SquareService } from './services/square';

// Initialize services
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: 'inventory-manager-be.firebasestorage.app',
  });
}

const firestoreService = new FirestoreService();
const ordersService = new OrdersService();
const emailService = new EmailService();
const salesService = new SalesService();
const storageService = new StorageService();

/**
 * Inventory monitoring service.
 * Checks for outdated inventory items and sends WhatsApp notifications.
 */
const inventoryMonitoringService = new InventoryMonitoringService(
  firestoreService,
  emailService
);

/** **************************************************************************
 * INVENTORY functions.
 *************************************************************************** */

/**
 * HTTP function to get a single inventory item by ID.
 */
export const getInventoryItem = onCall(async (request) => {
  try {
    const { itemId } = request.data;
    const item = await firestoreService.getInventoryDoc(itemId);
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

    const history = await firestoreService.getInventoryDocHistory(itemId);
    return { success: true, data: history };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to add a new inventory item.
 */
export const addInventoryItem = onCall(async (request) => {
  try {
    const item = request.data as Omit<InventoryItem, 'id'>;
    const newItem = await firestoreService.addInventoryDoc(item);
    return { success: true, data: newItem };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to remove an inventory item by ID.
 */
export const removeInventoryItem = onCall(async (request) => {
  try {
    const { id } = request.data;
    await firestoreService.removeInventoryDoc(id);
    return { success: true, data: { id } };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to update an inventory item by ID.
 */
export const updateInventoryItem = onCall(async (request) => {
  try {
    const { id, updateData } = request.data;
    await firestoreService.updateInventoryDoc(id, updateData);
    return { success: true, data: { id } };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to get all inventory items.
 */
export const getInventory = onCall(async () => {
  try {
    const items = await firestoreService.getAllInventoryDocs();
    return { success: true, data: items };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to take inventory.
 */
export const takeInventory = onCall(async (request) => {
  try {
    const takeInventoryData: Omit<TakeInventory, 'id'> = {
      timestamp: new Date().toISOString(),
      items: request.data.items,
    };

    const newTakeInventory = await firestoreService.addTakeInventoryDoc(
      takeInventoryData
    );

    // Update current quantities using the correct item ID
    for (const item of takeInventoryData.items) {
      await firestoreService.updateInventoryDoc(item.id, {
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

/**
 * HTTP function to get all inventory history.
 */
export const getInventoryHistory = onCall(async () => {
  try {
    const history = await firestoreService.getAllTakeInventoryDocs();
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

/** **************************************************************************
 * SUPPLIERS functions.
 *************************************************************************** */

/**
 * HTTP function to get a single supplier by ID.
 */
export const getSupplier = onCall(async (request) => {
  try {
    const { supplierId } = request.data;
    const supplier = await firestoreService.getSupplierDoc(supplierId);
    return { success: true, data: supplier };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to get all suppliers.
 */
export const getSuppliers = onCall(async () => {
  try {
    const suppliers = await firestoreService.getAllSupplierDocs();
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

    // Contact method is optional, but if it is provided, it must be valid
    if (supplierData.contactMethod) {
      if (!supplierData.contactMethod.type) {
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
    }

    const newSupplier = await firestoreService.addSupplierDoc(supplierData);
    return { success: true, data: newSupplier };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/** **************************************************************************
 * ORDERS functions.
 *************************************************************************** */


/**
 * HTTP function to get a single order by id.
 */
export const getOrder = onCall(async (request) => {
  try {
    const { orderId } = request.data;
    if (!orderId) {
      throw new Error('Order ID is required');
    }

    const order = await firestoreService.getOrderDoc(orderId);
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
 * HTTP function to get all orders.
 */
export const getOrders = onCall(async () => {
  try {
    const orders = await firestoreService.getAllOrderDocs();
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
    const orders = await firestoreService.getOrderDocsByStatus(orderStatus);
    return { success: true, data: orders };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to get all orders by item ID.
 */
export const getOrdersByItemId = onCall(async (request) => {
  try {
    const { itemId } = request.data;
    const orders = await firestoreService.getOrderDocsByItemId(itemId);
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

    const order = await firestoreService.addOrderDoc(orderData);
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
 * HTTP function to update the status of an order.
 */
export const updateOrderStatus = onCall(async (request) => {
  try {
    const { orderId, status } = request.data;

    // Order status can not be updated to 'delivered'
    // Delivery should be recorded using the recordOrderDelivery function.
    if (status === 'delivered') {
      throw new Error('Order status can not be updated to delivered');
    }

    await firestoreService.updateOrderDocStatus(orderId, status);
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

/** **************************************************************************
 * EMAILS functions.
 *************************************************************************** */

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
        await firestoreService.updateOrderDocStatus(
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


export const processSales = onCall(async () => {
  try {
    const now = new Date();
    const endAt = formatISO(now);
    const startAt = formatISO(subHours(now, 4));

    await salesService.processSales(startAt, endAt);
  } catch (error) {
    console.error('Error in processHourlySales:', error);
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * Scheduled function that runs hourly to fetch and process sales data
 * from Square API
 */
// export const processHourlySales = onSchedule({
//   schedule: '0 * * * *', // Runs at the start of every hour
//   timeZone: 'America/New_York',
// }, async () => {
//   try {
//     const now = new Date();
//     const endAt = formatISO(now);
//     const startAt = formatISO(subHours(now, 1));

//     await salesService.processSales(startAt, endAt);
//   } catch (error) {
//     console.error('Error in processHourlySales:', error);
//     const httpsError = errorHandler(error);
//     throw new Error(httpsError.message);
//   }
// });

/** **************************************************************************
 * RECIPES functions.
 *************************************************************************** */

export const getRecipes = onCall(async () => {
  try {
    const recipes = await firestoreService.getAllRecipeDocs();
    return { success: true, data: recipes };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

export const createRecipe = onCall(async (request) => {
  try {
    const recipeData = request.data as NewRecipe;

    // Validate the input
    if (!recipeData.name || recipeData.name.trim() === '') {
      throw new Error('Recipe name is required');
    }

    if (!recipeData.type) {
      throw new Error('Recipe type is required');
    }

    if (!recipeData.ingredients || recipeData.ingredients.length === 0) {
      throw new Error('Recipe must have at least one ingredient');
    }

    // Validate each ingredient
    for (const ingredient of recipeData.ingredients) {
      if (!ingredient.id) {
        throw new Error('Each ingredient must have an ID');
      }
      if (ingredient.quantity <= 0) {
        throw new Error('Ingredient quantities must be greater than 0');
      }
    }

    const recipe = await firestoreService.addRecipeDoc(recipeData);
    return { success: true, data: recipe };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

export const getRecipe = onCall(async (request) => {
  try {
    const { id } = request.data;
    if (!id) {
      throw new Error('Recipe ID is required');
    }

    const recipe = await firestoreService.getRecipeDoc(id);
    return { success: true, data: recipe };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

export const updateRecipe = onCall(async (request) => {
  try {
    const recipeData = request.data as Recipe;

    // Validate the input
    if (!recipeData.id) {
      throw new Error('Recipe ID is required');
    }

    const recipe = await firestoreService.updateRecipeDoc(recipeData);
    return { success: true, data: recipe };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});


/** **************************************************************************
 * STORAGE functions.
 *************************************************************************** */

/**
 * HTTP function to generate a signed URL for uploading an image.
 */
export const getImageUploadUrl = onCall(async (request) => {
  try {
    const {folderPath, fileName, contentType} = request.data;

    // Validate input
    if (!folderPath || !fileName || !contentType) {
      throw new Error('Missing required parameters');
    }

    // Only allow uploads to specific folders
    const allowedFolders = ['inventory-images', 'recipe-images'];
    if (!allowedFolders.includes(folderPath)) {
      throw new Error(`Upload to ${folderPath} is not allowed`);
    }

    const result = await storageService.generateUploadUrl(
      folderPath,
      fileName,
      contentType
    );

    return {success: true, data: result};
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to get a download URL for an image.
 */
export const getImageDownloadUrl = onCall(async (request) => {
  try {
    const {filePath} = request.data;

    // Validate input
    if (!filePath) {
      throw new Error('Missing required parameter: filePath');
    }

    const url = await storageService.generateDownloadUrl(filePath);

    return {success: true, data: {url}};
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to delete an image.
 */
export const deleteImage = onCall(async (request) => {
  try {
    const {filePath} = request.data;

    // Validate input
    if (!filePath) {
      throw new Error('Missing required parameter: filePath');
    }

    await storageService.deleteFile(filePath);

    return {success: true, data: {message: 'File deleted successfully'}};
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});
