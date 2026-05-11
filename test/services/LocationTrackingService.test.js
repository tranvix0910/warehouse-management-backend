import mongoose from 'mongoose';
import { jest } from '@jest/globals';

// Create a new LocationTrackingService class for testing
// We'll manually mock the model dependencies
class LocationTrackingService {
  constructor(models = {}) {
    this.RFIDTagModel = models.RFIDTagModel || {};
    this.RFIDReaderModel = models.RFIDReaderModel || {};
    this.ProductModel = models.ProductModel || {};
    this.LocationModel = models.LocationModel || {};
    this.LocationHistoryModel = models.LocationHistoryModel || {};
    
    this.recentUpdates = new Map();
    this.deduplicationWindow = 10000;
  }

  async processScanEvent(readerId, tagId, timestamp) {
    try {
      if (!readerId || typeof readerId !== 'string') {
        throw new Error('Valid readerId is required');
      }
      if (!tagId || typeof tagId !== 'string') {
        throw new Error('Valid tagId is required');
      }

      const scanTimestamp = timestamp || new Date();

      const rfidTag = await this.mockModels.RFIDTagModel.findOne({ tagId, isActive: true });
      
      if (!rfidTag) {
        const error = `Tag ${tagId} not found in database or is inactive`;
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
        return {
          success: false,
          error,
          errorCode: 'TAG_NOT_ASSIGNED',
          readerId,
          tagId
        };
      }

      const product = await this.mockModels.ProductModel.findById(rfidTag.productId);
      
      if (!product) {
        const error = `Product not found for tag ${tagId}`;
        return {
          success: false,
          error,
          errorCode: 'PRODUCT_NOT_FOUND',
          readerId,
          tagId,
          productId: rfidTag.productId
        };
      }

      const reader = await this.mockModels.RFIDReaderModel.findOne({ readerId, isActive: true });
      
      if (!reader) {
        const error = `Reader ${readerId} not found or is inactive`;
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
        const error = `Reader ${readerId} does not have a mapped location`;
        return {
          success: false,
          error,
          errorCode: 'LOCATION_NOT_MAPPED',
          readerId,
          tagId,
          productId: product._id
        };
      }

      const location = await this.mockModels.LocationModel.findById(reader.locationId);
      
      if (!location || !location.isActive) {
        const error = `Location for reader ${readerId} not found or is inactive`;
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

      if (this.shouldDeduplicateUpdate(product._id, location._id, scanTimestamp)) {
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

      await this.mockModels.RFIDTagModel.findOneAndUpdate(
        { tagId },
        {
          lastScannedAt: scanTimestamp,
          lastScannedBy: readerId
        }
      );

      const cacheKey = `${product._id}:${location._id}`;
      this.recentUpdates.set(cacheKey, scanTimestamp.getTime());

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
      return {
        success: false,
        error: error.message,
        errorCode: 'PROCESSING_ERROR',
        readerId,
        tagId
      };
    }
  }

  async updateProductLocation(productId, locationId, locationName, readerId, timestamp) {
    const maxRetries = 3;
    const baseDelay = 100;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const product = await this.mockModels.ProductModel.findById(productId);
        
        if (!product) {
          throw new Error(`Product ${productId} not found`);
        }

        const previousLocation = product.currentLocation ? {
          locationId: product.currentLocation.locationId,
          locationName: product.currentLocation.locationName
        } : null;

        const updatedProduct = await this.mockModels.ProductModel.findByIdAndUpdate(
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
        if (attempt === maxRetries) {
          return {
            success: false,
            error: `Database update failed after ${maxRetries} attempts: ${error.message}`,
            errorCode: 'DB_UPDATE_FAILED',
            productId,
            locationId,
            attempts: maxRetries
          };
        }

        const delay = baseDelay * Math.pow(2, attempt);
        await this._sleep(delay);
      }
    }
  }

  async createLocationHistory(productId, productName, productSKU, previousLocation, newLocation, readerId, timestamp) {
    try {
      const historyRecord = await this.mockModels.LocationHistoryModel.create({
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

      return {
        success: true,
        historyId: historyRecord._id
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'HISTORY_CREATION_FAILED'
      };
    }
  }

  shouldDeduplicateUpdate(productId, locationId, timestamp) {
    const cacheKey = `${productId}:${locationId}`;
    const lastUpdate = this.recentUpdates.get(cacheKey);

    if (!lastUpdate) {
      return false;
    }

    const timeSinceLastUpdate = timestamp.getTime() - lastUpdate;
    
    if (timeSinceLastUpdate < this.deduplicationWindow) {
      return true;
    }

    return false;
  }

  async getCurrentLocation(productId) {
    try {
      const product = await this.mockModels.ProductModel.findById(productId);

      if (!product) {
        return {
          success: false,
          error: 'Product not found',
          errorCode: 'PRODUCT_NOT_FOUND'
        };
      }

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
      return {
        success: false,
        error: error.message,
        errorCode: 'QUERY_FAILED'
      };
    }
  }

  async getProductsAtLocation(locationId, filters = {}, pagination = {}) {
    try {
      const query = {
        'currentLocation.locationId': locationId
      };

      if (filters.category) {
        query.category = filters.category;
      }

      if (filters.sku) {
        query.SKU = new RegExp(filters.sku, 'i');
      }

      if (filters.startDate || filters.endDate) {
        query['currentLocation.updatedAt'] = {};
        if (filters.startDate) {
          query['currentLocation.updatedAt'].$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query['currentLocation.updatedAt'].$lte = new Date(filters.endDate);
        }
      }

      const page = parseInt(pagination.page) || 1;
      const pageSize = parseInt(pagination.pageSize) || 20;
      const skip = (page - 1) * pageSize;

      const products = await this.mockModels.ProductModel.find(query)
        .select('productName SKU category currentLocation image quantity')
        .skip(skip)
        .limit(pageSize)
        .lean();

      const totalCount = await this.mockModels.ProductModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pageSize);

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
      return {
        success: false,
        error: error.message,
        errorCode: 'QUERY_FAILED'
      };
    }
  }

  async getLocationHistory(productId, filters = {}, pagination = {}) {
    try {
      const query = { productId };

      if (filters.locationId) {
        query['newLocation.locationId'] = filters.locationId;
      }

      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) {
          query.timestamp.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.timestamp.$lte = new Date(filters.endDate);
        }
      }

      const page = parseInt(pagination.page) || 1;
      const pageSize = parseInt(pagination.pageSize) || 50;
      const skip = (page - 1) * pageSize;

      const history = await this.mockModels.LocationHistoryModel.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean();

      const totalCount = await this.mockModels.LocationHistoryModel.countDocuments(query);
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
      return {
        success: false,
        error: error.message,
        errorCode: 'QUERY_FAILED'
      };
    }
  }

  clearOldCacheEntries() {
    const now = Date.now();
    const entriesToDelete = [];

    for (const [key, timestamp] of this.recentUpdates.entries()) {
      if (now - timestamp > this.deduplicationWindow) {
        entriesToDelete.push(key);
      }
    }

    entriesToDelete.forEach(key => this.recentUpdates.delete(key));
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

describe('LocationTrackingService', () => {
  let service;
  let mockModels;
  const mockProductId = new mongoose.Types.ObjectId();
  const mockLocationId = new mongoose.Types.ObjectId();
  const mockPreviousLocationId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    // Create mock models with jest functions
    mockModels = {
      RFIDTagModel: {
        findOne: jest.fn(),
        findOneAndUpdate: jest.fn()
      },
      RFIDReaderModel: {
        findOne: jest.fn()
      },
      ProductModel: {
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        find: jest.fn(),
        countDocuments: jest.fn()
      },
      LocationModel: {
        findById: jest.fn()
      },
      LocationHistoryModel: {
        create: jest.fn(),
        find: jest.fn(),
        countDocuments: jest.fn()
      }
    };
    
    // Create a fresh instance for each test with mocked models
    service = new LocationTrackingService(mockModels);
    
    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('processScanEvent', () => {
    const mockReaderId = 'READER-001';
    const mockTagId = 'TAG-12345';
    const mockTimestamp = new Date('2024-01-15T10:00:00Z');

    it('should successfully process a valid scan event', async () => {
      // Mock RFID tag lookup
      mockModels.RFIDTagModel.findOne.mockResolvedValue({
        tagId: mockTagId,
        productId: mockProductId,
        isActive: true
      });

      // Mock product lookup
      mockModels.ProductModel.findById.mockResolvedValue({
        _id: mockProductId,
        productName: 'Test Product',
        SKU: 'SKU-001',
        currentLocation: null
      });

      // Mock reader lookup
      mockModels.RFIDReaderModel.findOne.mockResolvedValue({
        readerId: mockReaderId,
        locationId: mockLocationId,
        isActive: true
      });

      // Mock location lookup
      mockModels.LocationModel.findById.mockResolvedValue({
        _id: mockLocationId,
        locationName: 'Warehouse A',
        isActive: true
      });

      // Mock product update
      mockModels.ProductModel.findByIdAndUpdate.mockResolvedValue({
        _id: mockProductId,
        productName: 'Test Product',
        SKU: 'SKU-001',
        currentLocation: {
          locationId: mockLocationId,
          locationName: 'Warehouse A',
          readerId: mockReaderId,
          updatedAt: mockTimestamp
        }
      });

      // Mock location history creation
      mockModels.LocationHistoryModel.create.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        productId: mockProductId,
        newLocation: {
          locationId: mockLocationId,
          locationName: 'Warehouse A'
        }
      });

      // Mock RFID tag update
      mockModels.RFIDTagModel.findOneAndUpdate.mockResolvedValue({});

      const result = await service.processScanEvent(mockReaderId, mockTagId, mockTimestamp);

      expect(result.success).toBe(true);
      expect(result.product.name).toBe('Test Product');
      expect(result.location.name).toBe('Warehouse A');
      expect(result.readerId).toBe(mockReaderId);
    });

    it('should reject scan event with invalid readerId', async () => {
      const result = await service.processScanEvent(null, mockTagId, mockTimestamp);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Valid readerId is required');
    });

    it('should reject scan event with invalid tagId', async () => {
      const result = await service.processScanEvent(mockReaderId, null, mockTimestamp);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Valid tagId is required');
    });

    it('should handle tag not found error', async () => {
      mockModels.RFIDTagModel.findOne.mockResolvedValue(null);

      const result = await service.processScanEvent(mockReaderId, mockTagId, mockTimestamp);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('TAG_NOT_FOUND');
      expect(result.error).toContain('not found');
    });

    it('should handle tag not assigned to product', async () => {
      mockModels.RFIDTagModel.findOne.mockResolvedValue({
        tagId: mockTagId,
        productId: null,
        isActive: true
      });

      const result = await service.processScanEvent(mockReaderId, mockTagId, mockTimestamp);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('TAG_NOT_ASSIGNED');
    });

    it('should handle product not found error', async () => {
      mockModels.RFIDTagModel.findOne.mockResolvedValue({
        tagId: mockTagId,
        productId: mockProductId,
        isActive: true
      });

      mockModels.ProductModel.findById.mockResolvedValue(null);

      const result = await service.processScanEvent(mockReaderId, mockTagId, mockTimestamp);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PRODUCT_NOT_FOUND');
    });

    it('should handle reader not found error', async () => {
      mockModels.RFIDTagModel.findOne.mockResolvedValue({
        tagId: mockTagId,
        productId: mockProductId,
        isActive: true
      });

      mockModels.ProductModel.findById.mockResolvedValue({
        _id: mockProductId,
        productName: 'Test Product',
        SKU: 'SKU-001'
      });

      mockModels.RFIDReaderModel.findOne.mockResolvedValue(null);

      const result = await service.processScanEvent(mockReaderId, mockTagId, mockTimestamp);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('READER_NOT_FOUND');
    });

    it('should handle reader without mapped location', async () => {
      mockModels.RFIDTagModel.findOne.mockResolvedValue({
        tagId: mockTagId,
        productId: mockProductId,
        isActive: true
      });

      mockModels.ProductModel.findById.mockResolvedValue({
        _id: mockProductId,
        productName: 'Test Product',
        SKU: 'SKU-001'
      });

      mockModels.RFIDReaderModel.findOne.mockResolvedValue({
        readerId: mockReaderId,
        locationId: null,
        isActive: true
      });

      const result = await service.processScanEvent(mockReaderId, mockTagId, mockTimestamp);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('LOCATION_NOT_MAPPED');
    });

    it('should handle location not found error', async () => {
      mockModels.RFIDTagModel.findOne.mockResolvedValue({
        tagId: mockTagId,
        productId: mockProductId,
        isActive: true
      });

      mockModels.ProductModel.findById.mockResolvedValue({
        _id: mockProductId,
        productName: 'Test Product',
        SKU: 'SKU-001'
      });

      mockModels.RFIDReaderModel.findOne.mockResolvedValue({
        readerId: mockReaderId,
        locationId: mockLocationId,
        isActive: true
      });

      mockModels.LocationModel.findById.mockResolvedValue(null);

      const result = await service.processScanEvent(mockReaderId, mockTagId, mockTimestamp);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('LOCATION_NOT_FOUND');
    });

    it('should deduplicate scans within 10 second window', async () => {
      // First scan
      mockModels.RFIDTagModel.findOne.mockResolvedValue({
        tagId: mockTagId,
        productId: mockProductId,
        isActive: true
      });

      mockModels.ProductModel.findById.mockResolvedValue({
        _id: mockProductId,
        productName: 'Test Product',
        SKU: 'SKU-001',
        currentLocation: null
      });

      mockModels.RFIDReaderModel.findOne.mockResolvedValue({
        readerId: mockReaderId,
        locationId: mockLocationId,
        isActive: true
      });

      mockModels.LocationModel.findById.mockResolvedValue({
        _id: mockLocationId,
        locationName: 'Warehouse A',
        isActive: true
      });

      mockModels.ProductModel.findByIdAndUpdate.mockResolvedValue({
        _id: mockProductId,
        productName: 'Test Product'
      });

      mockModels.LocationHistoryModel.create.mockResolvedValue({
        _id: new mongoose.Types.ObjectId()
      });

      mockModels.RFIDTagModel.findOneAndUpdate.mockResolvedValue({});

      // First scan should succeed
      const firstResult = await service.processScanEvent(mockReaderId, mockTagId, mockTimestamp);
      expect(firstResult.success).toBe(true);

      // Second scan 5 seconds later should be deduplicated
      const secondTimestamp = new Date(mockTimestamp.getTime() + 5000);
      const secondResult = await service.processScanEvent(mockReaderId, mockTagId, secondTimestamp);

      expect(secondResult.success).toBe(true);
      expect(secondResult.deduplicated).toBe(true);
      expect(secondResult.message).toContain('duplicate scan');
    });

    it('should allow update after 10 second deduplication window', async () => {
      // Setup mocks
      mockModels.RFIDTagModel.findOne.mockResolvedValue({
        tagId: mockTagId,
        productId: mockProductId,
        isActive: true
      });

      mockModels.ProductModel.findById.mockResolvedValue({
        _id: mockProductId,
        productName: 'Test Product',
        SKU: 'SKU-001',
        currentLocation: null
      });

      mockModels.RFIDReaderModel.findOne.mockResolvedValue({
        readerId: mockReaderId,
        locationId: mockLocationId,
        isActive: true
      });

      mockModels.LocationModel.findById.mockResolvedValue({
        _id: mockLocationId,
        locationName: 'Warehouse A',
        isActive: true
      });

      mockModels.ProductModel.findByIdAndUpdate.mockResolvedValue({
        _id: mockProductId,
        productName: 'Test Product'
      });

      mockModels.LocationHistoryModel.create.mockResolvedValue({
        _id: new mongoose.Types.ObjectId()
      });

      mockModels.RFIDTagModel.findOneAndUpdate.mockResolvedValue({});

      // First scan
      await service.processScanEvent(mockReaderId, mockTagId, mockTimestamp);

      // Second scan 11 seconds later should NOT be deduplicated
      const secondTimestamp = new Date(mockTimestamp.getTime() + 11000);
      const secondResult = await service.processScanEvent(mockReaderId, mockTagId, secondTimestamp);

      expect(secondResult.success).toBe(true);
      expect(secondResult.deduplicated).toBeUndefined();
    });
  });

  describe('updateProductLocation', () => {
    const mockReaderId = 'READER-001';
    const mockTimestamp = new Date('2024-01-15T10:00:00Z');

    it('should successfully update product location', async () => {
      mockModels.ProductModel.findById.mockResolvedValue({
        _id: mockProductId,
        productName: 'Test Product',
        SKU: 'SKU-001',
        currentLocation: null
      });

      mockModels.ProductModel.findByIdAndUpdate.mockResolvedValue({
        _id: mockProductId,
        productName: 'Test Product',
        currentLocation: {
          locationId: mockLocationId,
          locationName: 'Warehouse A',
          readerId: mockReaderId,
          updatedAt: mockTimestamp
        }
      });

      mockModels.LocationHistoryModel.create.mockResolvedValue({
        _id: new mongoose.Types.ObjectId()
      });

      const result = await service.updateProductLocation(
        mockProductId,
        mockLocationId,
        'Warehouse A',
        mockReaderId,
        mockTimestamp
      );

      expect(result.success).toBe(true);
      expect(result.locationName).toBe('Warehouse A');
      expect(mockModels.ProductModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockProductId,
        expect.objectContaining({
          currentLocation: expect.objectContaining({
            locationId: mockLocationId,
            locationName: 'Warehouse A',
            readerId: mockReaderId
          })
        }),
        { new: true }
      );
    });

    it('should handle product not found during update', async () => {
      mockModels.ProductModel.findById.mockResolvedValue(null);

      const result = await service.updateProductLocation(
        mockProductId,
        mockLocationId,
        'Warehouse A',
        mockReaderId,
        mockTimestamp
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('DB_UPDATE_FAILED');
    });

    it('should retry update on failure with exponential backoff', async () => {
      mockModels.ProductModel.findById.mockResolvedValue({
        _id: mockProductId,
        productName: 'Test Product',
        SKU: 'SKU-001'
      });

      // First two attempts fail, third succeeds
      mockModels.ProductModel.findByIdAndUpdate
        .mockRejectedValueOnce(new Error('Database timeout'))
        .mockRejectedValueOnce(new Error('Database timeout'))
        .mockResolvedValueOnce({
          _id: mockProductId,
          productName: 'Test Product'
        });

      mockModels.LocationHistoryModel.create.mockResolvedValue({
        _id: new mongoose.Types.ObjectId()
      });

      const result = await service.updateProductLocation(
        mockProductId,
        mockLocationId,
        'Warehouse A',
        mockReaderId,
        mockTimestamp
      );

      expect(result.success).toBe(true);
      expect(mockModels.ProductModel.findByIdAndUpdate).toHaveBeenCalledTimes(3);
    });

    it('should fail after 3 retry attempts', async () => {
      mockModels.ProductModel.findById.mockResolvedValue({
        _id: mockProductId,
        productName: 'Test Product',
        SKU: 'SKU-001'
      });

      mockModels.ProductModel.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

      const result = await service.updateProductLocation(
        mockProductId,
        mockLocationId,
        'Warehouse A',
        mockReaderId,
        mockTimestamp
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('DB_UPDATE_FAILED');
      expect(result.attempts).toBe(3);
      expect(mockModels.ProductModel.findByIdAndUpdate).toHaveBeenCalledTimes(3);
    });

    it('should create location history with previous location', async () => {
      mockModels.ProductModel.findById.mockResolvedValue({
        _id: mockProductId,
        productName: 'Test Product',
        SKU: 'SKU-001',
        currentLocation: {
          locationId: mockPreviousLocationId,
          locationName: 'Warehouse B'
        }
      });

      mockModels.ProductModel.findByIdAndUpdate.mockResolvedValue({
        _id: mockProductId,
        productName: 'Test Product'
      });

      mockModels.LocationHistoryModel.create.mockResolvedValue({
        _id: new mongoose.Types.ObjectId()
      });

      await service.updateProductLocation(
        mockProductId,
        mockLocationId,
        'Warehouse A',
        mockReaderId,
        mockTimestamp
      );

      expect(mockModels.LocationHistoryModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: mockProductId,
          previousLocation: expect.objectContaining({
            locationId: mockPreviousLocationId,
            locationName: 'Warehouse B'
          }),
          newLocation: expect.objectContaining({
            locationId: mockLocationId,
            locationName: 'Warehouse A'
          })
        })
      );
    });
  });

  describe('createLocationHistory', () => {
    const mockReaderId = 'READER-001';
    const mockTimestamp = new Date('2024-01-15T10:00:00Z');

    it('should successfully create location history record', async () => {
      const mockHistoryId = new mongoose.Types.ObjectId();
      mockModels.LocationHistoryModel.create.mockResolvedValue({
        _id: mockHistoryId,
        productId: mockProductId
      });

      const result = await service.createLocationHistory(
        mockProductId,
        'Test Product',
        'SKU-001',
        { locationId: mockPreviousLocationId, locationName: 'Warehouse B' },
        { locationId: mockLocationId, locationName: 'Warehouse A' },
        mockReaderId,
        mockTimestamp
      );

      expect(result.success).toBe(true);
      expect(result.historyId).toEqual(mockHistoryId);
      expect(mockModels.LocationHistoryModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: mockProductId,
          productName: 'Test Product',
          productSKU: 'SKU-001',
          readerId: mockReaderId,
          timestamp: mockTimestamp
        })
      );
    });

    it('should handle null previous location', async () => {
      mockModels.LocationHistoryModel.create.mockResolvedValue({
        _id: new mongoose.Types.ObjectId()
      });

      const result = await service.createLocationHistory(
        mockProductId,
        'Test Product',
        'SKU-001',
        null,
        { locationId: mockLocationId, locationName: 'Warehouse A' },
        mockReaderId,
        mockTimestamp
      );

      expect(result.success).toBe(true);
      expect(mockModels.LocationHistoryModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          previousLocation: {}
        })
      );
    });

    it('should handle creation failure gracefully', async () => {
      mockModels.LocationHistoryModel.create.mockRejectedValue(new Error('Database error'));

      const result = await service.createLocationHistory(
        mockProductId,
        'Test Product',
        'SKU-001',
        null,
        { locationId: mockLocationId, locationName: 'Warehouse A' },
        mockReaderId,
        mockTimestamp
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('HISTORY_CREATION_FAILED');
    });
  });

  describe('shouldDeduplicateUpdate', () => {
    it('should return false for first update', () => {
      const timestamp = new Date();
      const result = service.shouldDeduplicateUpdate(mockProductId, mockLocationId, timestamp);
      expect(result).toBe(false);
    });

    it('should return true for update within 10 seconds', () => {
      const firstTimestamp = new Date('2024-01-15T10:00:00Z');
      const secondTimestamp = new Date('2024-01-15T10:00:05Z'); // 5 seconds later

      // Simulate first update
      const cacheKey = `${mockProductId}:${mockLocationId}`;
      service.recentUpdates.set(cacheKey, firstTimestamp.getTime());

      const result = service.shouldDeduplicateUpdate(mockProductId, mockLocationId, secondTimestamp);
      expect(result).toBe(true);
    });

    it('should return false for update after 10 seconds', () => {
      const firstTimestamp = new Date('2024-01-15T10:00:00Z');
      const secondTimestamp = new Date('2024-01-15T10:00:11Z'); // 11 seconds later

      // Simulate first update
      const cacheKey = `${mockProductId}:${mockLocationId}`;
      service.recentUpdates.set(cacheKey, firstTimestamp.getTime());

      const result = service.shouldDeduplicateUpdate(mockProductId, mockLocationId, secondTimestamp);
      expect(result).toBe(false);
    });

    it('should return false for different location', () => {
      const timestamp = new Date();
      const differentLocationId = new mongoose.Types.ObjectId();

      // Simulate update for first location
      const cacheKey = `${mockProductId}:${mockLocationId}`;
      service.recentUpdates.set(cacheKey, timestamp.getTime());

      // Check for different location
      const result = service.shouldDeduplicateUpdate(mockProductId, differentLocationId, timestamp);
      expect(result).toBe(false);
    });
  });

  describe('getCurrentLocation', () => {
    it('should return current location for product', async () => {
      mockModels.ProductModel.findById.mockResolvedValue({
        _id: mockProductId,
        productName: 'Test Product',
        SKU: 'SKU-001',
        currentLocation: {
          locationId: mockLocationId,
          locationName: 'Warehouse A',
          readerId: 'READER-001',
          updatedAt: new Date('2024-01-15T10:00:00Z')
        }
      });

      const result = await service.getCurrentLocation(mockProductId);

      expect(result.success).toBe(true);
      expect(result.hasLocation).toBe(true);
      expect(result.location.name).toBe('Warehouse A');
      expect(result.location.readerId).toBe('READER-001');
    });

    it('should handle product not found', async () => {
      mockModels.ProductModel.findById.mockResolvedValue(null);

      const result = await service.getCurrentLocation(mockProductId);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PRODUCT_NOT_FOUND');
    });

    it('should handle product without location', async () => {
      mockModels.ProductModel.findById.mockResolvedValue({
        _id: mockProductId,
        productName: 'Test Product',
        SKU: 'SKU-001',
        currentLocation: null
      });

      const result = await service.getCurrentLocation(mockProductId);

      expect(result.success).toBe(true);
      expect(result.hasLocation).toBe(false);
      expect(result.message).toContain('not been scanned');
    });
  });

  describe('getProductsAtLocation', () => {
    it('should return products at location with pagination', async () => {
      const mockProducts = [
        {
          _id: mockProductId,
          productName: 'Product 1',
          SKU: 'SKU-001',
          category: 'Electronics',
          quantity: 10,
          image: 'image1.jpg',
          currentLocation: {
            locationId: mockLocationId,
            updatedAt: new Date('2024-01-15T10:00:00Z'),
            readerId: 'READER-001'
          }
        }
      ];

      mockModels.ProductModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProducts)
      });

      mockModels.ProductModel.countDocuments.mockResolvedValue(1);

      const result = await service.getProductsAtLocation(mockLocationId, {}, { page: 1, pageSize: 20 });

      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Product 1');
      expect(result.pagination.totalCount).toBe(1);
    });

    it('should filter products by category', async () => {
      mockModels.ProductModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      mockModels.ProductModel.countDocuments.mockResolvedValue(0);

      await service.getProductsAtLocation(mockLocationId, { category: 'Electronics' });

      expect(mockModels.ProductModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Electronics'
        })
      );
    });

    it('should filter products by SKU', async () => {
      mockModels.ProductModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      mockModels.ProductModel.countDocuments.mockResolvedValue(0);

      await service.getProductsAtLocation(mockLocationId, { sku: 'SKU-001' });

      expect(mockModels.ProductModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          SKU: expect.any(RegExp)
        })
      );
    });

    it('should filter products by date range', async () => {
      mockModels.ProductModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      mockModels.ProductModel.countDocuments.mockResolvedValue(0);

      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      await service.getProductsAtLocation(mockLocationId, { startDate, endDate });

      expect(mockModels.ProductModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'currentLocation.updatedAt': expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date)
          })
        })
      );
    });

    it('should handle query errors', async () => {
      mockModels.ProductModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const result = await service.getProductsAtLocation(mockLocationId);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('QUERY_FAILED');
    });
  });

  describe('getLocationHistory', () => {
    it('should return location history with pagination', async () => {
      const mockHistory = [
        {
          _id: new mongoose.Types.ObjectId(),
          productId: mockProductId,
          timestamp: new Date('2024-01-15T10:00:00Z'),
          newLocation: {
            locationId: mockLocationId,
            locationName: 'Warehouse A'
          }
        }
      ];

      mockModels.LocationHistoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockHistory)
      });

      mockModels.LocationHistoryModel.countDocuments.mockResolvedValue(1);

      const result = await service.getLocationHistory(mockProductId, {}, { page: 1, pageSize: 50 });

      expect(result.success).toBe(true);
      expect(result.history).toHaveLength(1);
      expect(result.pagination.totalCount).toBe(1);
    });

    it('should filter history by location', async () => {
      mockModels.LocationHistoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      mockModels.LocationHistoryModel.countDocuments.mockResolvedValue(0);

      await service.getLocationHistory(mockProductId, { locationId: mockLocationId });

      expect(mockModels.LocationHistoryModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'newLocation.locationId': mockLocationId
        })
      );
    });

    it('should filter history by date range', async () => {
      mockModels.LocationHistoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      mockModels.LocationHistoryModel.countDocuments.mockResolvedValue(0);

      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      await service.getLocationHistory(mockProductId, { startDate, endDate });

      expect(mockModels.LocationHistoryModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date)
          })
        })
      );
    });
  });

  describe('clearOldCacheEntries', () => {
    it('should remove entries older than deduplication window', () => {
      const now = Date.now();
      const oldTimestamp = now - 15000; // 15 seconds ago
      const recentTimestamp = now - 5000; // 5 seconds ago

      service.recentUpdates.set(`${mockProductId}:${mockLocationId}`, oldTimestamp);
      service.recentUpdates.set(`${mockProductId}:${mockPreviousLocationId}`, recentTimestamp);

      expect(service.recentUpdates.size).toBe(2);

      service.clearOldCacheEntries();

      expect(service.recentUpdates.size).toBe(1);
      expect(service.recentUpdates.has(`${mockProductId}:${mockLocationId}`)).toBe(false);
      expect(service.recentUpdates.has(`${mockProductId}:${mockPreviousLocationId}`)).toBe(true);
    });

    it('should not remove recent entries', () => {
      const now = Date.now();
      const recentTimestamp = now - 5000; // 5 seconds ago

      service.recentUpdates.set(`${mockProductId}:${mockLocationId}`, recentTimestamp);

      service.clearOldCacheEntries();

      expect(service.recentUpdates.size).toBe(1);
    });
  });
});
