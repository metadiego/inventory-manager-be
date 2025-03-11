import * as admin from 'firebase-admin';
import { Bucket } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

interface SignedUploadUrlResponse {
  url: string;
  filePath: string;
  fields?: Record<string, string>;
}

/**
 * Service class for Firebase Storage operations
 */
export class StorageService {
  private bucket: Bucket;

  /**
   * Class constructor.
   */
  constructor() {
    this.bucket = admin.storage().bucket();
  }

  /**
   * Generates a signed URL for uploading a file directly to Firebase Storage.
   * @param {string} folderPath - The folder path where the file will be stored.
   * @param {string} fileName - The name of the file.
   * @param {string} contentType - The content type of the file.
   * @param {number} expirationMinutes - URL expiration time in minutes.
   * @return {Promise<SignedUploadUrlResponse>} - URL and path.
   */
  async generateUploadUrl(
    folderPath: string,
    fileName: string,
    contentType: string,
    expirationMinutes = 15
  ): Promise<SignedUploadUrlResponse> {
    try {
      // Generate a unique file name to prevent collisions
      const uniqueFileName = `${Date.now()}_${uuidv4()}_${fileName}`;
      const filePath = `${folderPath}/${uniqueFileName}`;
      const file = this.bucket.file(filePath);

      // Set expiration time
      const expiration = Date.now() + expirationMinutes * 60 * 1000;

      // Generate signed URL for uploading
      const [url] = await file.generateSignedPostPolicyV4({
        expires: expiration,
        conditions: [
          ['content-type', contentType],
          ['content-length-range', 0, 10 * 1024 * 1024], // 10MB max
        ],
        fields: {
          'content-type': contentType,
        },
      });

      return {
        url: url.url,
        filePath,
        fields: url.fields,
      };
    } catch (error) {
      console.error('Error generating upload URL:', error);
      throw error;
    }
  }

  /**
   * Generates a signed URL for downloading a file from Firebase Storage.
   * @param {string} filePath - The path to the file in storage.
   * @param {number} expirationMinutes - URL expiration time in minutes.
   * @return {Promise<string>} - The signed URL.
   */
  async generateDownloadUrl(
    filePath: string,
    expirationMinutes = 60
  ): Promise<string> {
    try {
      const file = this.bucket.file(filePath);
      const expiration = Date.now() + expirationMinutes * 60 * 1000;

      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: expiration,
      });

      return url;
    } catch (error) {
      console.error('Error generating download URL:', error);
      throw error;
    }
  }

  /**
   * Deletes a file from Firebase Storage.
   * @param {string} filePath - The path to the file in storage.
   * @return {Promise<void>}
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const file = this.bucket.file(filePath);
      await file.delete();
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
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
