import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service class for Firebase Storage operations
 */
export class StorageService {
  private storage: admin.storage.Storage;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private bucket: any; // Using any temporarily due to type issues

  /**
   * Class constructor.
   */
  constructor() {
    this.storage = admin.storage();
    this.bucket = this.storage.bucket();
  }

  /**
   * Generates a signed URL for uploading a file directly to Firebase Storage.
   * @param {string} folderPath - The folder path where the file will be stored.
   * @param {string} fileName - The name of the file.
   * @param {string} contentType - The content type of the file.
   * @param {number} expirationMinutes - URL expiration time in minutes.
   * @return {Promise<{url: string, filePath: string}>} - URL and path.
   */
  async generateUploadUrl(
    folderPath: string,
    fileName: string,
    contentType: string,
    expirationMinutes = 15
  ): Promise<{url: string; filePath: string}> {
    // Generate a unique file name to prevent collisions
    const uniqueFileName = `${Date.now()}_${uuidv4()}_${fileName}`;
    const filePath = `${folderPath}/${uniqueFileName}`;
    const file = this.bucket.file(filePath);

    // Set expiration time
    const expiration = Date.now() + expirationMinutes * 60 * 1000;

    // Generate signed URL for uploading
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: expiration,
      contentType,
    });

    return {url, filePath};
  }

  /**
   * Generates a signed URL for downloading a file from Firebase Storage.
   * @param {string} filePath - The path to the file in storage.
   * @param {number} expirationMinutes - URL expiration time in minutes.
   * @return {Promise<string>} - The signed URL for downloading.
   */
  async generateDownloadUrl(
    filePath: string,
    expirationMinutes = 60
  ): Promise<string> {
    const file = this.bucket.file(filePath);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File ${filePath} does not exist`);
    }

    // Set expiration time
    const expiration = Date.now() + expirationMinutes * 60 * 1000;

    // Generate signed URL for downloading
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: expiration,
    });

    return url;
  }

  /**
   * Deletes a file from Firebase Storage.
   * @param {string} filePath - The path to the file in storage.
   * @return {Promise<void>}
   */
  async deleteFile(filePath: string): Promise<void> {
    const file = this.bucket.file(filePath);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File ${filePath} does not exist`);
    }

    // Delete the file
    await file.delete();
  }

  /**
   * Gets the public URL for a file in Firebase Storage.
   * @param {string} filePath - The path to the file in storage.
   * @return {string} - The public URL.
   */
  getPublicUrl(filePath: string): string {
    return `https://storage.googleapis.com/${this.bucket.name}/${filePath}`;
  }
}
