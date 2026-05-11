import mongoose from 'mongoose';
import ProductModel from '../../src/app/models/ProductModel.js';

describe('ProductModel - RFID Extension', () => {
  describe('Schema Validation', () => {
    it('should allow creating product without RFID fields (backward compatibility)', () => {
      const productData = {
        productName: 'Test Product',
        cost: '100',
        price: '150',
        SKU: 'TEST-001',
        category: 'Electronics',
        RAM: '8GB',
        date: '2024-01-01',
        GPU: 'Integrated',
        color: 'Black',
        processor: 'Intel i5',
        quantity: 10,
        image: 'https://example.com/image.jpg'
      };

      const product = new ProductModel(productData);
      const validationError = product.validateSync();
      
      expect(validationError).toBeUndefined();
      // RFID fields should be optional - they can be undefined or empty objects
      // This maintains backward compatibility with existing products
      if (product.rfidTag) {
        expect(product.rfidTag.tagId).toBeUndefined();
        expect(product.rfidTag.assignedAt).toBeUndefined();
      }
      if (product.currentLocation) {
        expect(product.currentLocation.locationId).toBeUndefined();
        expect(product.currentLocation.locationName).toBeUndefined();
      }
    });

    it('should allow creating product with rfidTag fields', () => {
      const productData = {
        productName: 'RFID Product',
        cost: '100',
        price: '150',
        SKU: 'RFID-001',
        category: 'Electronics',
        RAM: '8GB',
        date: '2024-01-01',
        GPU: 'Integrated',
        color: 'Black',
        processor: 'Intel i5',
        quantity: 10,
        image: 'https://example.com/image.jpg',
        rfidTag: {
          tagId: 'TAG-12345',
          assignedAt: new Date('2024-01-15')
        }
      };

      const product = new ProductModel(productData);
      const validationError = product.validateSync();
      
      expect(validationError).toBeUndefined();
      expect(product.rfidTag.tagId).toBe('TAG-12345');
      expect(product.rfidTag.assignedAt).toBeInstanceOf(Date);
    });

    it('should allow creating product with currentLocation fields', () => {
      const locationId = new mongoose.Types.ObjectId();
      const productData = {
        productName: 'Located Product',
        cost: '100',
        price: '150',
        SKU: 'LOC-001',
        category: 'Electronics',
        RAM: '8GB',
        date: '2024-01-01',
        GPU: 'Integrated',
        color: 'Black',
        processor: 'Intel i5',
        quantity: 10,
        image: 'https://example.com/image.jpg',
        currentLocation: {
          locationId: locationId,
          locationName: 'Warehouse A - Shelf 1',
          readerId: 'READER-001',
          updatedAt: new Date('2024-01-15T10:30:00Z')
        }
      };

      const product = new ProductModel(productData);
      const validationError = product.validateSync();
      
      expect(validationError).toBeUndefined();
      expect(product.currentLocation.locationId).toEqual(locationId);
      expect(product.currentLocation.locationName).toBe('Warehouse A - Shelf 1');
      expect(product.currentLocation.readerId).toBe('READER-001');
      expect(product.currentLocation.updatedAt).toBeInstanceOf(Date);
    });

    it('should allow creating product with both rfidTag and currentLocation', () => {
      const locationId = new mongoose.Types.ObjectId();
      const productData = {
        productName: 'Full RFID Product',
        cost: '100',
        price: '150',
        SKU: 'FULL-001',
        category: 'Electronics',
        RAM: '8GB',
        date: '2024-01-01',
        GPU: 'Integrated',
        color: 'Black',
        processor: 'Intel i5',
        quantity: 10,
        image: 'https://example.com/image.jpg',
        rfidTag: {
          tagId: 'TAG-67890',
          assignedAt: new Date('2024-01-10')
        },
        currentLocation: {
          locationId: locationId,
          locationName: 'Warehouse B - Shelf 2',
          readerId: 'READER-002',
          updatedAt: new Date('2024-01-15T14:45:00Z')
        }
      };

      const product = new ProductModel(productData);
      const validationError = product.validateSync();
      
      expect(validationError).toBeUndefined();
      expect(product.rfidTag.tagId).toBe('TAG-67890');
      expect(product.currentLocation.locationName).toBe('Warehouse B - Shelf 2');
    });

    it('should validate locationId as ObjectId type', () => {
      const productData = {
        productName: 'Invalid Location Product',
        cost: '100',
        price: '150',
        SKU: 'INV-001',
        category: 'Electronics',
        RAM: '8GB',
        date: '2024-01-01',
        GPU: 'Integrated',
        color: 'Black',
        processor: 'Intel i5',
        quantity: 10,
        image: 'https://example.com/image.jpg',
        currentLocation: {
          locationId: 'invalid-id', // Invalid ObjectId
          locationName: 'Test Location',
          readerId: 'READER-003',
          updatedAt: new Date()
        }
      };

      const product = new ProductModel(productData);
      const validationError = product.validateSync();
      
      expect(validationError).toBeDefined();
      expect(validationError.errors['currentLocation.locationId']).toBeDefined();
    });

    it('should allow partial rfidTag object (only tagId)', () => {
      const productData = {
        productName: 'Partial RFID Product',
        cost: '100',
        price: '150',
        SKU: 'PART-001',
        category: 'Electronics',
        RAM: '8GB',
        date: '2024-01-01',
        GPU: 'Integrated',
        color: 'Black',
        processor: 'Intel i5',
        quantity: 10,
        image: 'https://example.com/image.jpg',
        rfidTag: {
          tagId: 'TAG-PARTIAL'
        }
      };

      const product = new ProductModel(productData);
      const validationError = product.validateSync();
      
      expect(validationError).toBeUndefined();
      expect(product.rfidTag.tagId).toBe('TAG-PARTIAL');
      expect(product.rfidTag.assignedAt).toBeUndefined();
    });

    it('should allow partial currentLocation object', () => {
      const locationId = new mongoose.Types.ObjectId();
      const productData = {
        productName: 'Partial Location Product',
        cost: '100',
        price: '150',
        SKU: 'PARTLOC-001',
        category: 'Electronics',
        RAM: '8GB',
        date: '2024-01-01',
        GPU: 'Integrated',
        color: 'Black',
        processor: 'Intel i5',
        quantity: 10,
        image: 'https://example.com/image.jpg',
        currentLocation: {
          locationId: locationId,
          locationName: 'Partial Location'
        }
      };

      const product = new ProductModel(productData);
      const validationError = product.validateSync();
      
      expect(validationError).toBeUndefined();
      expect(product.currentLocation.locationId).toEqual(locationId);
      expect(product.currentLocation.locationName).toBe('Partial Location');
      expect(product.currentLocation.readerId).toBeUndefined();
      expect(product.currentLocation.updatedAt).toBeUndefined();
    });
  });

  describe('Field Types', () => {
    it('should store tagId as String', () => {
      const product = new ProductModel({
        productName: 'Type Test Product',
        cost: '100',
        price: '150',
        SKU: 'TYPE-001',
        category: 'Electronics',
        RAM: '8GB',
        date: '2024-01-01',
        GPU: 'Integrated',
        color: 'Black',
        processor: 'Intel i5',
        quantity: 10,
        image: 'https://example.com/image.jpg',
        rfidTag: {
          tagId: 'TAG-TYPE-TEST'
        }
      });

      expect(typeof product.rfidTag.tagId).toBe('string');
    });

    it('should store assignedAt as Date', () => {
      const testDate = new Date('2024-01-20');
      const product = new ProductModel({
        productName: 'Date Test Product',
        cost: '100',
        price: '150',
        SKU: 'DATE-001',
        category: 'Electronics',
        RAM: '8GB',
        date: '2024-01-01',
        GPU: 'Integrated',
        color: 'Black',
        processor: 'Intel i5',
        quantity: 10,
        image: 'https://example.com/image.jpg',
        rfidTag: {
          tagId: 'TAG-DATE-TEST',
          assignedAt: testDate
        }
      });

      expect(product.rfidTag.assignedAt).toBeInstanceOf(Date);
      expect(product.rfidTag.assignedAt.getTime()).toBe(testDate.getTime());
    });

    it('should store readerId as String', () => {
      const product = new ProductModel({
        productName: 'Reader Test Product',
        cost: '100',
        price: '150',
        SKU: 'READER-001',
        category: 'Electronics',
        RAM: '8GB',
        date: '2024-01-01',
        GPU: 'Integrated',
        color: 'Black',
        processor: 'Intel i5',
        quantity: 10,
        image: 'https://example.com/image.jpg',
        currentLocation: {
          readerId: 'READER-TYPE-TEST'
        }
      });

      expect(typeof product.currentLocation.readerId).toBe('string');
    });
  });

  describe('Requirements Validation', () => {
    it('should support Requirement 1.4 - retrieve product details including current location', () => {
      const locationId = new mongoose.Types.ObjectId();
      const product = new ProductModel({
        productName: 'Req 1.4 Product',
        cost: '100',
        price: '150',
        SKU: 'REQ14-001',
        category: 'Electronics',
        RAM: '8GB',
        date: '2024-01-01',
        GPU: 'Integrated',
        color: 'Black',
        processor: 'Intel i5',
        quantity: 10,
        image: 'https://example.com/image.jpg',
        currentLocation: {
          locationId: locationId,
          locationName: 'Test Location',
          readerId: 'READER-001',
          updatedAt: new Date()
        }
      });

      // Verify product details can be retrieved
      expect(product.productName).toBe('Req 1.4 Product');
      expect(product.SKU).toBe('REQ14-001');
      expect(product.currentLocation).toBeDefined();
      expect(product.currentLocation.locationName).toBe('Test Location');
    });

    it('should support Requirement 2.3 - associate product with new location', () => {
      const locationId = new mongoose.Types.ObjectId();
      const product = new ProductModel({
        productName: 'Req 2.3 Product',
        cost: '100',
        price: '150',
        SKU: 'REQ23-001',
        category: 'Electronics',
        RAM: '8GB',
        date: '2024-01-01',
        GPU: 'Integrated',
        color: 'Black',
        processor: 'Intel i5',
        quantity: 10,
        image: 'https://example.com/image.jpg'
      });

      // Associate with location
      product.currentLocation = {
        locationId: locationId,
        locationName: 'New Location',
        readerId: 'READER-002',
        updatedAt: new Date()
      };

      expect(product.currentLocation.locationId).toEqual(locationId);
      expect(product.currentLocation.locationName).toBe('New Location');
    });

    it('should support Requirement 3.1 - update product record with new location', () => {
      const oldLocationId = new mongoose.Types.ObjectId();
      const newLocationId = new mongoose.Types.ObjectId();
      
      const product = new ProductModel({
        productName: 'Req 3.1 Product',
        cost: '100',
        price: '150',
        SKU: 'REQ31-001',
        category: 'Electronics',
        RAM: '8GB',
        date: '2024-01-01',
        GPU: 'Integrated',
        color: 'Black',
        processor: 'Intel i5',
        quantity: 10,
        image: 'https://example.com/image.jpg',
        currentLocation: {
          locationId: oldLocationId,
          locationName: 'Old Location',
          readerId: 'READER-001',
          updatedAt: new Date('2024-01-10')
        }
      });

      // Update to new location
      product.currentLocation = {
        locationId: newLocationId,
        locationName: 'New Location',
        readerId: 'READER-002',
        updatedAt: new Date('2024-01-15')
      };

      expect(product.currentLocation.locationId).toEqual(newLocationId);
      expect(product.currentLocation.locationName).toBe('New Location');
      expect(product.currentLocation.readerId).toBe('READER-002');
    });
  });
});
