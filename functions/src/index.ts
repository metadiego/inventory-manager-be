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
 * RESTAURANT functions.
  *************************************************************************** */

/**
 * HTTP function to get all restaurants for a user.
 */
export const getUserRestaurants = onCall(async () => {
  try {
    const restaurants = await firestoreService.getAllRestaurants();
    return { success: true, data: restaurants };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to get a single restaurant by ID.
 */
export const getRestaurant = onCall(async (request) => {
  try {
    const { restaurantId } = request.data;

    if (!restaurantId) {
      throw new Error('Restaurant ID is required');
    }

    const restaurant = await firestoreService.getRestaurantDoc(restaurantId);
    return { success: true, data: restaurant };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/** **************************************************************************
 * INVENTORY functions.
 *************************************************************************** */

/**
 * HTTP function to get a single inventory item by ID.
 */
export const getInventoryItem = onCall(async (request) => {
  try {
    const { restaurantId, itemId } = request.data;

    const item = await firestoreService.getInventoryDoc(
      restaurantId,
      itemId
    );
    return { success: true, data: item };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

export const getItemHistory = onCall(async (request) => {
  try {
    const { restaurantId, itemId } = request.data;

    if (!itemId) {
      throw new Error('Item ID is required');
    }

    const history = await firestoreService.getInventoryDocHistory(
      restaurantId,
      itemId
    );
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
    const { restaurantId, item } = request.data;

    const newItem = await firestoreService.addInventoryDoc(
      restaurantId,
      item as Omit<InventoryItem, 'id'>
    );
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
    const { restaurantId, id } = request.data;

    await firestoreService.removeInventoryDoc(restaurantId, id);
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
    const { restaurantId, id, updateData } = request.data;

    await firestoreService.updateInventoryDoc(restaurantId, id, updateData);
    return { success: true, data: { id } };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to get all inventory items.
 */
export const getInventory = onCall(async (request) => {
  try {
    const { restaurantId } = request.data;

    const items = await firestoreService.getAllInventoryDocs(restaurantId);
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
    const { restaurantId, items } = request.data;

    const takeInventoryData: Omit<TakeInventory, 'id'> = {
      timestamp: new Date().toISOString(),
      items,
    };

    const newTakeInventory = await firestoreService.addTakeInventoryDoc(
      restaurantId,
      takeInventoryData
    );

    // Update current quantities using the correct item ID
    for (const item of takeInventoryData.items) {
      await firestoreService.updateInventoryDoc(restaurantId, item.id, {
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
export const getInventoryHistory = onCall(async (request) => {
  try {
    const { restaurantId } = request.data;

    const history = await firestoreService.getAllTakeInventoryDocs(
      restaurantId
    );
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
    const { restaurantId, supplierId } = request.data;

    const supplier = await firestoreService.getSupplierDoc(
      restaurantId, supplierId
    );
    return { success: true, data: supplier };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

/**
 * HTTP function to get all suppliers.
 */
export const getSuppliers = onCall(async (request) => {
  try {
    const { restaurantId } = request.data;

    const suppliers = await firestoreService.getAllSupplierDocs(restaurantId);
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
    const { restaurantId } = request.data;
    const supplierData = request.data.supplier as NewSupplier;

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

    const newSupplier = await firestoreService.addSupplierDoc(
      restaurantId,
      supplierData
    );
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
    const { restaurantId, orderId } = request.data;

    if (!orderId) {
      throw new Error('Order ID is required');
    }

    const order = await firestoreService.getOrderDoc(restaurantId, orderId);
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
export const getOrders = onCall(async (request) => {
  try {
    const { restaurantId } = request.data;

    const orders = await firestoreService.getAllOrderDocs(restaurantId);
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
    const { restaurantId, orderStatus } = request.data;

    const orders = await firestoreService.getOrderDocsByStatus(
      restaurantId,
      orderStatus
    );
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
    const { restaurantId, itemId } = request.data;

    const orders = await firestoreService.getOrderDocsByItemId(
      restaurantId,
      itemId
    );
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
    const { restaurantId } = request.data;
    const orderData = request.data.order as NewOrder;

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

    const order = await firestoreService.addOrderDoc(
      restaurantId,
      orderData
    );
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
    const { restaurantId, orderId } = request.data;

    await firestoreService.cancelOrder(restaurantId, orderId);
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
    const { restaurantId, orderId } = request.data;

    if (!orderId) {
      throw new Error('Order ID is required');
    }

    await ordersService.sendOrder(restaurantId, orderId);
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
    const { restaurantId, orderId, status } = request.data;

    // Order status can not be updated to 'delivered'
    // Delivery should be recorded using the recordOrderDelivery function.
    if (status === 'delivered') {
      throw new Error('Order status can not be updated to delivered');
    }

    await firestoreService.updateOrderDocStatus(
      restaurantId,
      orderId,
      status
    );
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
    const { restaurantId, orderId, receivedItems } = request.data;

    await ordersService.recordOrderDelivery(
      restaurantId, orderId, receivedItems
    );
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
      const email = await firestoreService.getEmail(
        event.params.emailId
      ) as OrderEmail;
      if (email?.delivery?.state === 'SUCCESS' &&
        email?.restaurantId &&
        email?.orderId) {
        await firestoreService.updateOrderDocStatus(
          email.restaurantId,
          email.orderId,
          'confirmed'
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

export const getRecipes = onCall(async (request) => {
  try {
    const { restaurantId } = request.data;

    const recipes = await firestoreService.getAllRecipeDocs(restaurantId);
    return { success: true, data: recipes };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

export const createRecipe = onCall(async (request) => {
  try {
    const { restaurantId } = request.data;
    const recipeData = request.data.recipe as NewRecipe;

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

    const recipe = await firestoreService.addRecipeDoc(
      restaurantId, recipeData
    );
    return { success: true, data: recipe };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

export const getRecipe = onCall(async (request) => {
  try {
    const { restaurantId, id } = request.data;

    if (!id) {
      throw new Error('Recipe ID is required');
    }

    const recipe = await firestoreService.getRecipeDoc(restaurantId, id);
    return { success: true, data: recipe };
  } catch (error) {
    const httpsError = errorHandler(error);
    throw new Error(httpsError.message);
  }
});

export const updateRecipe = onCall(async (request) => {
  try {
    const { restaurantId } = request.data;
    const recipeData = request.data as Recipe;

    // Validate the input
    if (!recipeData.id) {
      throw new Error('Recipe ID is required');
    }

    const recipe = await firestoreService.updateRecipeDoc(
      restaurantId, recipeData
    );
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

/** **************************************************************************
 * MIGRATION functions - no longer used.
 *************************************************************************** */

/**
 * HTTP function to migrate all collections into a restaurant's subcollections.
 * This function copies all data from the top-level collections into the
 * specified restaurant document's subcollections.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// const migrateToRestaurant = onCall(async (request) => {
//   try {
//     const restaurantId = '0fMJ4D3W5JhE9q7Fh38j';
//     if (!restaurantId) {
//       throw new Error('Restaurant ID is required');
//     }

//     const db = admin.firestore();
//     const batch = db.batch();

//     // Create restaurant document if it doesn't exist
//     const restaurantRef = db.collection('restaurants').doc(restaurantId);
//     const restaurantDoc = await restaurantRef.get();
//     if (!restaurantDoc.exists) {
//       batch.set(restaurantRef, {
//         createdAt: new Date().toISOString(),
//         updatedAt: new Date().toISOString(),
//       });
//     }

//     // Migrate inventory collection
//     const inventorySnapshot = await db.collection('inventory').get();
//     for (const doc of inventorySnapshot.docs) {
//       const inventoryData = doc.data();
//       const newInventoryRef = restaurantRef
//         .collection('inventory')
//         .doc(doc.id);
//       batch.set(newInventoryRef, inventoryData);

//       // Migrate inventory history subcollection
//       const historySnapshot = await doc.ref.collection('history').get();
//       for (const historyDoc of historySnapshot.docs) {
//         const historyData = historyDoc.data();
//         const newHistoryRef = newInventoryRef
//           .collection('history')
//           .doc(historyDoc.id);
//         batch.set(newHistoryRef, historyData);
//       }
//     }

//     console.log('MIGRATED INVENTORY');

//     // Migrate orders collection
//     const ordersSnapshot = await db.collection('orders').get();
//     for (const doc of ordersSnapshot.docs) {
//       const orderData = doc.data();
//       const newOrderRef = restaurantRef
//         .collection('orders')
//         .doc(doc.id);
//       batch.set(newOrderRef, orderData);
//     }

//     console.log('MIGRATED ORDERS');

//     // Migrate suppliers collection
//     const suppliersSnapshot = await db.collection('suppliers').get();
//     console.log('suppliersSnapshot', suppliersSnapshot.size);
//     for (const doc of suppliersSnapshot.docs) {
//       const supplierData = doc.data();
//       const newSupplierRef = restaurantRef
//         .collection('suppliers')
//         .doc(doc.id);
//       batch.set(newSupplierRef, supplierData);
//     }

//     console.log('MIGRATED SUPPLIERS');

//     // Migrate takeInventory collection
//     const takeInventorySnapshot = await db.collection('takeInventory').get();
//     console.log('takeInventorySnapshot', takeInventorySnapshot.size);
//     for (const doc of takeInventorySnapshot.docs) {
//       const takeInventoryData = doc.data();
//       const newTakeInventoryRef = restaurantRef
//         .collection('takeInventory')
//         .doc(doc.id);
//       batch.set(newTakeInventoryRef, takeInventoryData);
//     }

//     console.log('MIGRATED TAKE INVENTORY');

//     // Commit all changes
//     await batch.commit();

//     return {
//       success: true,
//       data: {
//         message: 'Migration completed successfully',
//         restaurantId,
//         inventoryCount: inventorySnapshot.size,
//         ordersCount: ordersSnapshot.size,
//         suppliersCount: suppliersSnapshot.size,
//         takeInventoryCount: takeInventorySnapshot.size,
//       },
//     };
//   } catch (error) {
//     console.error('Error in migrateToRestaurant:', error);
//     const httpsError = errorHandler(error);
//     throw new Error(httpsError.message);
//   }
// });
