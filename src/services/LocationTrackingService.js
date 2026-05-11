import RFIDTagModel from '../app/models/RFIDTagModel.js';
import RFIDReaderModel from '../app/models/RFIDReaderModel.js';
import ProductModel from '../app/models/ProductModel.js';
import LocationModel from '../app/models/LocationModel.js';
import LocationHistoryModel from '../app/models/LocationHistoryModel.js';

/**
 * LocationTrackingService - Processes RFID scan events and manages product location tracking
 * 
 * This service handles:
 * - Processing scan events from RFID readers
 * - Updating product locations in the database
 * - Creating location history records for audit trails
 * - Implementing deduplication logic to prevent duplicate updates
 * - Error handling with retry logic
 * 
 * Requirements: 1.2, 1.3, 2.3, 3.1, 3.4
 */
class LocationTrackingService {
  constructor() {
    // Deduplication cache: Map of "productId:locationId" -> timestamp
    this.recentUpdates = new Map();
    // Deduplication window: 10 seconds (Requirement 5.4)
    this.deduplicationWindow = 10000;
  }

  /**
   * Process a scan event from RFID reader
   * Identifies product from tag ID and determines location from reader ID
   * 
   * @param {String} readerId - RFID reader identifier
   * @param {String} tagId - RFID tag identifier
   * @param {Date} timestamp - Scan timestamp
   * @returns {Promise<Object>} Processing result
   * 
   * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4
   */
  async processScanEvent(readerId, tagId, timestamp) {
    try {
      console.log(`📡 Processing scan event: Reader=${readerId}, Tag=${tagId}`);

      // Validate inputs
      if (!readerId || typeof readerId !== 'string') {
        throw new Error('Valid readerId is required');
      }
      if (!tagId || typeof tagId !== 'string') {
        throw new Error('Valid tagId is required');
      }

      const scanTimestamp = timestamp || new Date();

      // Step 1: Retrieve Tag_ID and identify Product (Requirement 1.1, 1.2)
      const rfidTag = await RFIDTagModel.findOne({ tagId, isActive: true });
      
      if (!rfidTag) {
        // Requirement 1.3: Log error if Tag_ID does not exist
        const error = `Tag ${tagId} not found in database or is inactive`;
        console.error(`❌ ${error} (Reader: ${readerId})`);
        return {
          success: false,
          error,
          errorCode: 'TAG_NOT_FOUND',
          readerId,
          tagId
        };
      }

      if (!rfidTag.productId) {
        const error = `Tag ${tagId} is not associated with any product`;
        console.error(`❌ ${error} (Reader: ${readerId})`);
        return {
          success: false,
          error,
          errorCode: 'TAG_NOT_ASSIGNED',
          readerId,
          tagId
        };
      }

      // Step 2: Retrieve Product details (Requirement 1.4)
      const product = await ProductModel.findById(rfidTag.productId);
      
      if (!product) {
        const error = `Product not found for tag ${tagId}`;
        console.error(`❌ ${error}`);
        return {
          success: false,
          error,
          errorCode: 'PRODUCT_NOT_FOUND',
          readerId,
          tagId,
          productId: rfidTag.productId
        };
      }

      console.log(`✅ Product identified: ${product.productName} (SKU: ${product.SKU})`);

      // Step 3: Determine Location from Reader_ID (Requirement 2.1, 2.2)
      const reader = await RFIDReaderModel.findOne({ readerId, isActive: true });
      
      if (!reader) {
        // Requirement 2.4: Log error if Reader_ID does not have mapped Location
        const error = `Reader ${readerId} not found or is inactive`;
        console.error(`❌ ${error}`);
        return {
          success: false,
          error,
          errorCode: 'READER_NOT_FOUND',
          readerId,
          tagId,
          productId: product._id
        };
      }

      if (!reader.locationId) {
        // Requirement 2.4: Log error if Reader_ID does not have mapped Location
        const error = `Reader ${readerId} does not have a mapped location`;
        console.error(`❌ ${error}`);
        return {
          success: false,
          error,
          errorCode: 'LOCATION_NOT_MAPPED',
          readerId,
          tagId,
          productId: product._id
        };
      }

      // Verify location exists and is active
      const location = await LocationModel.findById(reader.locationId);
      
      if (!location || !location.isActive) {
        const error = `Location for reader ${readerId} not found or is inactive`;
        console.error(`❌ ${error}`);
        return {
          success: false,
          error,
          errorCode: 'LOCATION_NOT_FOUND',
          readerId,
          tagId,
          productId: product._id,
          locationId: reader.locationId
        };
      }

      console.log(`✅ Location determined: ${location.locationName}`);

      // Step 4: Check deduplication (Requirement 5.4)
      if (this.shouldDeduplicateUpdate(product._id, location._id, scanTimestamp)) {
        console.log(`⏭️  Skipping duplicate update for product ${product.productName} at ${location.locationName}`);
        return {
          success: true,
          deduplicated: true,
          message: 'Update skipped - duplicate scan within 10 seconds',
          productId: product._id,
          productName: product.productName,
          locationId: location._id,
          locationName: location.locationName
        };
      }

      // Step 5: Update product location (Requirement 2.3, 3.1, 3.2)
      const updateResult = await this.updateProductLocation(
        product._id,
        location._id,
        location.locationName,
        readerId,
        scanTimestamp
      );

      if (!updateResult.success) {
        return updateResult;
      }

      // Step 6: Update RFID tag last scanned info
      await RFIDTagModel.findOneAndUpdate(
        { tagId },
        {
          lastScannedAt: scanTimestamp,
          lastScannedBy: readerId
        }
      );

      // Step 7: Update deduplication cache
      const cacheKey = `${product._id}:${location._id}`;
      this.recentUpdates.set(cacheKey, scanTimestamp.getTime());

      console.log(`✅ Scan event processed successfully for ${product.productName}`);

      return {
        success: true,
        message: 'Scan event processed successfully',
        product: {
          id: product._id,
          name: product.productName,
          sku: product.SKU
        },
        location: {
          id: location._id,
          name: location.locationName
        },
        readerId,
        timestamp: scanTimestamp
      };

    } catch (error) {
      console.error('❌ Error processing scan event:', error.message);
      return {
        success: false,
        error: error.message,
        errorCode: 'PROCESSING_ERROR',
        readerId,
        tagId
      };
    }
  }

  /**
   * Update product location in database with retry logic
   * 
   * @param {ObjectId} productId - Product identifier
   * @param {ObjectId} locationId - New location identifier
   * @param {String} locationName - New location name
   * @param {String} readerId - Reader that detected the scan
   * @param {Date} timestamp - Scan timestamp
   * @returns {Promise<Object>} Update result
   * 
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  async updateProductLocation(productId, locationId, locationName, readerId, timestamp) {
    const maxRetries = 3; // Requirement 3.4: Retry up to 3 times
    const baseDelay = 100; // Base delay for exponential backoff (100ms)

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Updating product location (attempt ${attempt}/${maxRetries})`);

        // Get current product state for history
        const product = await ProductModel.findById(productId);
        
        if (!product) {
          throw new Error(`Product ${productId} not found`);
        }

        const previousLocation = product.currentLocation ? {
          locationId: product.currentLocation.locationId,
          locationName: product.currentLocation.locationName
        } : null;

        // Requirement 3.1: Update Product record with new Location
        // Requirement 3.2: Record timestamp of location update
        const updatedProduct = await ProductModel.findByIdAndUpdate(
          productId,
          {
            currentLocation: {
              locationId,
              locationName,
              readerId,
              updatedAt: timestamp
            }
          },
          { new: true }
        );

        if (!updatedProduct) {
          throw new Error(`Failed to update product ${productId}`);
        }

        console.log(`✅ Product location updated: ${updatedProduct.productName} -> ${locationName}`);

        // Requirement 6.1, 6.2: Create location history record
        await this.createLocationHistory(
          productId,
          product.productName,
          product.SKU,
          previousLocation,
          { locationId, locationName },
          readerId,
          timestamp
        );

        return {
          success: true,
          message: 'Product location updated successfully',
          productId,
          locationId,
          locationName,
          previousLocation,
          timestamp
        };

      } catch (error) {
        console.error(`❌ Update attempt ${attempt} failed:`, error.message);

        // If this was the last attempt, return error
        if (attempt === maxRetries) {
          console.error(`❌ Failed to update product location after ${maxRetries} attempts`);
          return {
            success: false,
            error: `Database update failed after ${maxRetries} attempts: ${error.message}`,
            errorCode: 'DB_UPDATE_FAILED',
            productId,
            locationId,
            attempts: maxRetries
          };
        }

        // Exponential backoff: 200ms, 400ms, 800ms
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await this._sleep(delay);
      }
    }
  }

  /**
   * Create location history record for audit trail
   * 
   * @param {ObjectId} productId - Product identifier
   * @param {String} productName - Product name
   * @param {String} productSKU - Product SKU
   * @param {Object} previousLocation - Previous location object
   * @param {Object} newLocation - New location object
   * @param {String} readerId - Reader that detected the scan
   * @param {Date} timestamp - Scan timestamp
   * @returns {Promise<Object>} Creation result
   * 
   * Requirements: 6.1, 6.2
   */
  async createLocationHistory(productId, productName, productSKU, previousLocation, newLocation, readerId, timestamp) {
    try {
      console.log(`📝 Creating location history record for ${productName}`);

      // Requirement 6.2: Location_History record contains all required fields
      const historyRecord = await LocationHistoryModel.create({
        productId,
        productName,
        productSKU,
        previousLocation: previousLocation || {},
        newLocation: {
          locationId: newLocation.locationId,
          locationName: newLocation.locationName
        },
        readerId,
        timestamp
      });

      console.log(`✅ Location history record created: ${historyRecord._id}`);

      return {
        success: true,
        historyId: historyRecord._id
      };

    } catch (error) {
      // Log error but don't fail the entire operation
      // Location history is important but not critical for real-time tracking
      console.error('❌ Failed to create location history:', error.message);
      return {
        success: false,
        error: error.message,
        errorCode: 'HISTORY_CREATION_FAILED'
      };
    }
  }

  /**
   * Check if update should be deduplicated
   * Prevents duplicate updates when same product is scanned at same location within 10 seconds
   * 
   * @param {ObjectId} productId - Product identifier
   * @param {ObjectId} locationId - Location identifier
   * @param {Date} timestamp - Current scan timestamp
   * @returns {Boolean} True if update should be skipped
   * 
   * Requirements: 5.4
   */
  shouldDeduplicateUpdate(productId, locationId, timestamp) {
    const cacheKey = `${productId}:${locationId}`;
    const lastUpdate = this.recentUpdates.get(cacheKey);

    if (!lastUpdate) {
      return false;
    }

    const timeSinceLastUpdate = timestamp.getTime() - lastUpdate;
    
    // Requirement 5.4: Deduplicate if within 10 seconds (10000ms)
    if (timeSinceLastUpdate < this.deduplicationWindow) {
      return true;
    }

    return false;
  }

  /**
   * Get current location of a product
   * 
   * @param {ObjectId} productId - Product identifier
   * @returns {Promise<Object>} Current location information
   * 
   * Requirements: 10.1, 10.2, 10.4
   */
  async getCurrentLocation(productId) {
    try {
      const product = await ProductModel.findById(productId);

      if (!product) {
        return {
          success: false,
          error: 'Product not found',
          errorCode: 'PRODUCT_NOT_FOUND'
        };
      }

      // Requirement 10.4: Return response indicating product has not been scanned
      if (!product.currentLocation || !product.currentLocation.locationId) {
        return {
          success: true,
          hasLocation: false,
          message: 'Product has not been scanned',
          product: {
            id: product._id,
            name: product.productName,
            sku: product.SKU
          }
        };
      }

      // Requirement 10.2: Return location name, timestamp, and reader ID
      return {
        success: true,
        hasLocation: true,
        product: {
          id: product._id,
          name: product.productName,
          sku: product.SKU
        },
        location: {
          id: product.currentLocation.locationId,
          name: product.currentLocation.locationName,
          readerId: product.currentLocation.readerId,
          updatedAt: product.currentLocation.updatedAt
        }
      };

    } catch (error) {
      console.error('❌ Error getting current location:', error.message);
      return {
        success: false,
        error: error.message,
        errorCode: 'QUERY_FAILED'
      };
    }
  }

  /**
   * Get all products at a specific location
   * 
   * @param {ObjectId} locationId - Location identifier
   * @param {Object} filters - Optional filters (category, SKU, dateRange)
   * @param {Object} pagination - Pagination options (page, pageSize)
   * @returns {Promise<Object>} List of products at location
   * 
   * Requirements: 11.1, 11.2, 11.3, 11.4
   */
  async getProductsAtLocation(locationId, filters = {}, pagination = {}) {
    try {
      // Build query
      const query = {
        'currentLocation.locationId': locationId
      };

      // Requirement 11.4: Filter by category
      if (filters.category) {
        query.category = filters.category;
      }

      // Requirement 11.4: Filter by SKU
      if (filters.sku) {
        query.SKU = new RegExp(filters.sku, 'i'); // Case-insensitive partial match
      }

      // Requirement 11.4: Filter by date range
      if (filters.startDate || filters.endDate) {
        query['currentLocation.updatedAt'] = {};
        if (filters.startDate) {
          query['currentLocation.updatedAt'].$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query['currentLocation.updatedAt'].$lte = new Date(filters.endDate);
        }
      }

      // Requirement 11.3: Support pagination
      const page = parseInt(pagination.page) || 1;
      const pageSize = parseInt(pagination.pageSize) || 20;
      const skip = (page - 1) * pageSize;

      // Execute query with pagination
      const products = await ProductModel.find(query)
        .select('productName SKU category currentLocation image quantity')
        .skip(skip)
        .limit(pageSize)
        .lean();

      // Get total count for pagination
      const totalCount = await ProductModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pageSize);

      // Requirement 11.2: Return product details and timestamp of last scan
      const productsWithDetails = products.map(product => ({
        id: product._id,
        name: product.productName,
        sku: product.SKU,
        category: product.category,
        quantity: product.quantity,
        image: product.image,
        lastScanned: product.currentLocation?.updatedAt,
        readerId: product.currentLocation?.readerId
      }));

      return {
        success: true,
        products: productsWithDetails,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };

    } catch (error) {
      console.error('❌ Error getting products at location:', error.message);
      return {
        success: false,
        error: error.message,
        errorCode: 'QUERY_FAILED'
      };
    }
  }

  /**
   * Get location history for a product
   * 
   * @param {ObjectId} productId - Product identifier
   * @param {Object} filters - Optional filters (startDate, endDate, locationId)
   * @param {Object} pagination - Pagination options (page, pageSize)
   * @returns {Promise<Object>} Location history records
   * 
   * Requirements: 6.4
   */
  async getLocationHistory(productId, filters = {}, pagination = {}) {
    try {
      // Build query
      const query = { productId };

      // Filter by location
      if (filters.locationId) {
        query['newLocation.locationId'] = filters.locationId;
      }

      // Filter by date range
      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) {
          query.timestamp.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.timestamp.$lte = new Date(filters.endDate);
        }
      }

      // Pagination
      const page = parseInt(pagination.page) || 1;
      const pageSize = parseInt(pagination.pageSize) || 50;
      const skip = (page - 1) * pageSize;

      // Execute query
      const history = await LocationHistoryModel.find(query)
        .sort({ timestamp: -1 }) // Most recent first
        .skip(skip)
        .limit(pageSize)
        .lean();

      const totalCount = await LocationHistoryModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        success: true,
        history,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };

    } catch (error) {
      console.error('❌ Error getting location history:', error.message);
      return {
        success: false,
        error: error.message,
        errorCode: 'QUERY_FAILED'
      };
    }
  }

  /**
   * Clear old entries from deduplication cache
   * Should be called periodically to prevent memory leaks
   */
  clearOldCacheEntries() {
    const now = Date.now();
    const entriesToDelete = [];

    for (const [key, timestamp] of this.recentUpdates.entries()) {
      if (now - timestamp > this.deduplicationWindow) {
        entriesToDelete.push(key);
      }
    }

    entriesToDelete.forEach(key => this.recentUpdates.delete(key));

    if (entriesToDelete.length > 0) {
      console.log(`🧹 Cleared ${entriesToDelete.length} old cache entries`);
    }
  }

  /**
   * Sleep utility for retry delays
   * @param {Number} ms - Milliseconds to sleep
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
const locationTrackingService = new LocationTrackingService();

// Set up periodic cache cleanup (every 30 seconds)
setInterval(() => {
  locationTrackingService.clearOldCacheEntries();
}, 30000);

export default locationTrackingService;
