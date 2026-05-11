import RFIDReaderService from '../../src/services/RFIDReaderService.js';

describe('RFIDReaderService', () => {
  let service;

  beforeEach(() => {
    const RFIDReaderServiceClass = RFIDReaderService.constructor;
    service = new RFIDReaderServiceClass();
  });

  afterEach(async () => {
    // Manually clear connections without database operations
    service.connections.clear();
    service.connectionStatus.clear();
  });

  describe('validateConnectionConfig', () => {
    it('should accept valid connection configuration', () => {
      const config = {
        ipAddress: '192.168.1.100',
        port: 5084,
        protocol: 'LLRP'
      };

      const result = service.validateConnectionConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing configuration', () => {
      const result = service.validateConnectionConfig(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Connection configuration is required');
    });

    it('should reject invalid IP address format', () => {
      const config = {
        ipAddress: '999.999.999.999',
        port: 5084,
        protocol: 'LLRP'
      };

      const result = service.validateConnectionConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('IP address'))).toBe(true);
    });

    it('should reject invalid port number', () => {
      const config = {
        ipAddress: '192.168.1.100',
        port: 99999,
        protocol: 'LLRP'
      };

      const result = service.validateConnectionConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Port must be between 1 and 65535');
    });

    it('should reject port below valid range', () => {
      const config = {
        ipAddress: '192.168.1.100',
        port: 0,
        protocol: 'LLRP'
      };

      const result = service.validateConnectionConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Port must be between 1 and 65535');
    });

    it('should reject invalid protocol', () => {
      const config = {
        ipAddress: '192.168.1.100',
        port: 5084,
        protocol: 'INVALID'
      };

      const result = service.validateConnectionConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Protocol'))).toBe(true);
    });

    it('should accept valid protocols', () => {
      const validProtocols = ['LLRP', 'TCP', 'UDP', 'HTTP', 'MOCK'];

      validProtocols.forEach(protocol => {
        const config = {
          ipAddress: '192.168.1.100',
          port: 5084,
          protocol
        };

        const result = service.validateConnectionConfig(config);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('getReaderStatus', () => {
    it('should return not connected for disconnected reader', () => {
      const status = service.getReaderStatus('READER-999');

      expect(status.readerId).toBe('READER-999');
      expect(status.connected).toBe(false);
      expect(status.message).toBe('Reader not connected');
    });

    it('should reject status check without readerId', () => {
      expect(() => service.getReaderStatus(null))
        .toThrow('Valid readerId is required');
    });
  });

  describe('getAllReaderStatuses', () => {
    it('should return empty array when no readers connected', () => {
      const statuses = service.getAllReaderStatuses();

      expect(statuses).toEqual([]);
    });
  });

  describe('validateScanEvent', () => {
    it('should accept valid scan event data', () => {
      const scanData = {
        readerId: 'READER-001',
        tagId: 'TAG-12345',
        timestamp: new Date()
      };

      const result = service.validateScanEvent(scanData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing scan data', () => {
      const result = service.validateScanEvent(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Scan event data is required');
    });

    it('should reject missing readerId', () => {
      const scanData = {
        tagId: 'TAG-12345',
        timestamp: new Date()
      };

      const result = service.validateScanEvent(scanData);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('readerId'))).toBe(true);
    });

    it('should reject invalid readerId type', () => {
      const scanData = {
        readerId: 123,
        tagId: 'TAG-12345',
        timestamp: new Date()
      };

      const result = service.validateScanEvent(scanData);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('readerId'))).toBe(true);
    });

    it('should reject readerId that is too short', () => {
      const scanData = {
        readerId: 'AB',
        tagId: 'TAG-12345',
        timestamp: new Date()
      };

      const result = service.validateScanEvent(scanData);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('readerId'))).toBe(true);
    });

    it('should reject readerId that is too long', () => {
      const scanData = {
        readerId: 'A'.repeat(51),
        tagId: 'TAG-12345',
        timestamp: new Date()
      };

      const result = service.validateScanEvent(scanData);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('readerId'))).toBe(true);
    });

    it('should reject missing tagId', () => {
      const scanData = {
        readerId: 'READER-001',
        timestamp: new Date()
      };

      const result = service.validateScanEvent(scanData);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('tagId'))).toBe(true);
    });

    it('should reject invalid tagId type', () => {
      const scanData = {
        readerId: 'READER-001',
        tagId: 12345,
        timestamp: new Date()
      };

      const result = service.validateScanEvent(scanData);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('tagId'))).toBe(true);
    });

    it('should reject tagId that is too short', () => {
      const scanData = {
        readerId: 'READER-001',
        tagId: 'ABC',
        timestamp: new Date()
      };

      const result = service.validateScanEvent(scanData);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('tagId'))).toBe(true);
    });

    it('should reject tagId that is too long', () => {
      const scanData = {
        readerId: 'READER-001',
        tagId: 'A'.repeat(101),
        timestamp: new Date()
      };

      const result = service.validateScanEvent(scanData);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('tagId'))).toBe(true);
    });

    it('should reject invalid timestamp format', () => {
      const scanData = {
        readerId: 'READER-001',
        tagId: 'TAG-12345',
        timestamp: 'invalid-date'
      };

      const result = service.validateScanEvent(scanData);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('timestamp'))).toBe(true);
    });

    it('should reject future timestamp', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const scanData = {
        readerId: 'READER-001',
        tagId: 'TAG-12345',
        timestamp: futureDate
      };

      const result = service.validateScanEvent(scanData);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('future'))).toBe(true);
    });

    it('should accept scan data without timestamp', () => {
      const scanData = {
        readerId: 'READER-001',
        tagId: 'TAG-12345'
      };

      const result = service.validateScanEvent(scanData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect multiple validation errors', () => {
      const scanData = {
        readerId: 'AB',
        tagId: 'XYZ',
        timestamp: 'invalid'
      };

      const result = service.validateScanEvent(scanData);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('processScanEvent', () => {
    it('should process valid scan event successfully', () => {
      service.connections.set('READER-001', { readerId: 'READER-001' });
      service.connectionStatus.set('READER-001', { lastActivity: new Date() });

      const scanData = {
        readerId: 'READER-001',
        tagId: 'TAG-12345',
        timestamp: new Date()
      };

      const result = service.processScanEvent(scanData);

      expect(result.success).toBe(true);
      expect(result.scanEvent).toBeDefined();
      expect(result.scanEvent.readerId).toBe('READER-001');
      expect(result.scanEvent.tagId).toBe('TAG-12345');
      expect(result.scanEvent.timestamp).toBeInstanceOf(Date);
    });

    it('should reject invalid scan event data', () => {
      const scanData = {
        readerId: 'AB',
        tagId: 'TAG-12345'
      };

      const result = service.processScanEvent(scanData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.errors).toBeDefined();
    });

    it('should reject scan from disconnected reader', () => {
      const scanData = {
        readerId: 'READER-999',
        tagId: 'TAG-12345',
        timestamp: new Date()
      };

      const result = service.processScanEvent(scanData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not connected');
      expect(result.readerId).toBe('READER-999');
      expect(result.tagId).toBe('TAG-12345');
    });

    it('should update last activity timestamp', () => {
      service.connections.set('READER-001', { readerId: 'READER-001' });
      const initialTime = new Date('2024-01-01T00:00:00Z');
      service.connectionStatus.set('READER-001', { lastActivity: initialTime });

      const scanData = {
        readerId: 'READER-001',
        tagId: 'TAG-12345',
        timestamp: new Date()
      };

      service.processScanEvent(scanData);

      const status = service.connectionStatus.get('READER-001');
      expect(status.lastActivity.getTime()).toBeGreaterThan(initialTime.getTime());
    });

    it('should emit scan event to registered handlers', () => {
      let eventEmitted = false;
      let capturedReaderId = null;
      let capturedTagId = null;

      service.connections.set('READER-001', { readerId: 'READER-001' });
      service.connectionStatus.set('READER-001', { lastActivity: new Date() });

      service.onScanEvent((readerId, tagId, timestamp) => {
        eventEmitted = true;
        capturedReaderId = readerId;
        capturedTagId = tagId;
      });

      const scanData = {
        readerId: 'READER-001',
        tagId: 'TAG-12345',
        timestamp: new Date()
      };

      service.processScanEvent(scanData);

      expect(eventEmitted).toBe(true);
      expect(capturedReaderId).toBe('READER-001');
      expect(capturedTagId).toBe('TAG-12345');
    });

    it('should use current time if timestamp not provided', () => {
      service.connections.set('READER-001', { readerId: 'READER-001' });
      service.connectionStatus.set('READER-001', { lastActivity: new Date() });

      const scanData = {
        readerId: 'READER-001',
        tagId: 'TAG-12345'
      };

      const beforeTime = new Date();
      const result = service.processScanEvent(scanData);
      const afterTime = new Date();

      expect(result.success).toBe(true);
      expect(result.scanEvent.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.scanEvent.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should handle errors gracefully', () => {
      // Force an error by passing invalid data that passes validation but fails processing
      service.connections.set('READER-001', { readerId: 'READER-001' });
      service.connectionStatus.set('READER-001', null); // This will cause an error

      const scanData = {
        readerId: 'READER-001',
        tagId: 'TAG-12345',
        timestamp: new Date()
      };

      const result = service.processScanEvent(scanData);

      // Should still return a result object even if there's an error
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  describe('onScanEvent', () => {
    it('should register scan event handler', () => {
      let called = false;
      let capturedReaderId = null;
      let capturedTagId = null;
      let capturedTimestamp = null;

      const handler = (readerId, tagId, timestamp) => {
        called = true;
        capturedReaderId = readerId;
        capturedTagId = tagId;
        capturedTimestamp = timestamp;
      };

      service.onScanEvent(handler);
      
      service.connections.set('READER-001', { readerId: 'READER-001' });
      service.connectionStatus.set('READER-001', { lastActivity: new Date() });
      
      service.simulateScan('READER-001', 'TAG-123');

      expect(called).toBe(true);
      expect(capturedReaderId).toBe('READER-001');
      expect(capturedTagId).toBe('TAG-123');
      expect(capturedTimestamp).toBeInstanceOf(Date);
    });

    it('should reject non-function callback', () => {
      expect(() => service.onScanEvent('not a function'))
        .toThrow('Callback must be a function');
    });

    it('should support multiple event handlers', () => {
      let handler1Called = false;
      let handler2Called = false;

      const handler1 = () => { handler1Called = true; };
      const handler2 = () => { handler2Called = true; };

      service.onScanEvent(handler1);
      service.onScanEvent(handler2);
      
      service.connections.set('READER-001', { readerId: 'READER-001' });
      service.connectionStatus.set('READER-001', { lastActivity: new Date() });
      
      service.simulateScan('READER-001', 'TAG-123');

      expect(handler1Called).toBe(true);
      expect(handler2Called).toBe(true);
    });
  });

  describe('simulateScan', () => {
    it('should process scan event successfully for connected reader', () => {
      service.connections.set('READER-001', { readerId: 'READER-001' });
      service.connectionStatus.set('READER-001', { lastActivity: new Date() });

      const result = service.simulateScan('READER-001', 'TAG-123');

      expect(result.success).toBe(true);
      expect(result.scanEvent).toBeDefined();
      expect(result.scanEvent.readerId).toBe('READER-001');
      expect(result.scanEvent.tagId).toBe('TAG-123');
    });

    it('should return error for disconnected reader', () => {
      const result = service.simulateScan('READER-999', 'TAG-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not connected');
    });

    it('should emit scan event to registered handlers', () => {
      let called = false;
      const handler = () => { called = true; };
      
      service.connections.set('READER-001', { readerId: 'READER-001' });
      service.connectionStatus.set('READER-001', { lastActivity: new Date() });
      
      service.onScanEvent(handler);
      service.simulateScan('READER-001', 'TAG-123');

      expect(called).toBe(true);
    });

    it('should update last activity timestamp when scanning', () => {
      service.connections.set('READER-001', { readerId: 'READER-001' });
      const initialTime = new Date('2024-01-01T00:00:00Z');
      service.connectionStatus.set('READER-001', { lastActivity: initialTime });

      service.simulateScan('READER-001', 'TAG-123');

      const status = service.connectionStatus.get('READER-001');
      expect(status.lastActivity.getTime()).toBeGreaterThan(initialTime.getTime());
    });

    it('should create timestamp automatically', () => {
      service.connections.set('READER-001', { readerId: 'READER-001' });
      service.connectionStatus.set('READER-001', { lastActivity: new Date() });

      const beforeTime = new Date();
      const result = service.simulateScan('READER-001', 'TAG-123');
      const afterTime = new Date();

      expect(result.success).toBe(true);
      expect(result.scanEvent.timestamp).toBeInstanceOf(Date);
      expect(result.scanEvent.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.scanEvent.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('disconnectAll', () => {
    it('should return empty array when no readers connected', async () => {
      const results = await service.disconnectAll();

      expect(results).toEqual([]);
    });
  });

  describe('getPoolStats', () => {
    it('should return pool statistics with zero connections', () => {
      const stats = service.getPoolStats();

      expect(stats.activeConnections).toBe(0);
      expect(stats.maxConnections).toBe(50);
      expect(stats.utilization).toBe('0.00%');
      expect(stats.readers).toEqual([]);
    });

    it('should calculate utilization percentage correctly', () => {
      service.connections.set('READER-001', { readerId: 'READER-001' });
      service.connections.set('READER-002', { readerId: 'READER-002' });

      const stats = service.getPoolStats();

      expect(stats.activeConnections).toBe(2);
      expect(stats.utilization).toBe('4.00%');
      expect(stats.readers).toContain('READER-001');
      expect(stats.readers).toContain('READER-002');
    });
  });

  describe('_createConnection', () => {
    it('should create a mock connection object', () => {
      const config = {
        ipAddress: '192.168.1.100',
        port: 5084,
        protocol: 'MOCK'
      };

      const connection = service._createConnection('READER-001', config);

      expect(connection.readerId).toBe('READER-001');
      expect(connection.protocol).toBe('MOCK');
      expect(connection.config).toEqual(config);
      expect(typeof connection.send).toBe('function');
      expect(typeof connection.receive).toBe('function');
      expect(typeof connection.close).toBe('function');
    });
  });

  describe('reconnectReader', () => {
    let originalSleep;
    let originalSendAdminAlert;
    let originalConnectReader;
    let sleepCalls;
    let alertCalls;
    let connectCalls;

    beforeEach(() => {
      // Save original methods
      originalSleep = service._sleep;
      originalSendAdminAlert = service._sendAdminAlert;
      originalConnectReader = service.connectReader;
      
      // Track calls
      sleepCalls = [];
      alertCalls = [];
      connectCalls = [];
      
      // Mock sleep to speed up tests
      service._sleep = async (ms) => {
        sleepCalls.push(ms);
        return Promise.resolve();
      };
      
      // Mock sendAdminAlert
      service._sendAdminAlert = async (readerId, errorMessage) => {
        alertCalls.push({ readerId, errorMessage });
        return Promise.resolve();
      };
    });

    afterEach(() => {
      // Restore original methods
      service._sleep = originalSleep;
      service._sendAdminAlert = originalSendAdminAlert;
      service.connectReader = originalConnectReader;
    });

    it('should reconnect successfully on first attempt', async () => {
      // Mock connectReader to succeed
      service.connectReader = async (readerId, config) => {
        connectCalls.push({ readerId, config });
        return {
          success: true,
          message: 'Reader connected successfully',
          readerId
        };
      };

      const config = {
        ipAddress: '192.168.1.100',
        port: 5084,
        protocol: 'MOCK'
      };

      const result = await service.reconnectReader('READER-001', config);

      expect(result.success).toBe(true);
      expect(result.readerId).toBe('READER-001');
      expect(result.attempts).toBe(1);
      expect(connectCalls.length).toBe(1);
      expect(sleepCalls.length).toBe(0);
      expect(alertCalls.length).toBe(0);
    });

    it('should retry connection up to 10 times', async () => {
      // Mock connectReader to always fail
      service.connectReader = async () => {
        connectCalls.push({});
        throw new Error('Connection failed');
      };

      const config = {
        ipAddress: '192.168.1.100',
        port: 5084,
        protocol: 'MOCK'
      };

      const result = await service.reconnectReader('READER-001', config);

      expect(result.success).toBe(false);
      expect(result.readerId).toBe('READER-001');
      expect(result.attempts).toBe(10);
      expect(connectCalls.length).toBe(10);
      expect(sleepCalls.length).toBe(9); // 9 waits between 10 attempts
      expect(alertCalls.length).toBe(1);
    });

    it('should wait 30 seconds between reconnection attempts', async () => {
      let attemptCount = 0;
      
      // Mock connectReader to fail twice then succeed
      service.connectReader = async (readerId) => {
        attemptCount++;
        connectCalls.push({ readerId, attempt: attemptCount });
        
        if (attemptCount < 3) {
          throw new Error('Connection failed');
        }
        
        return {
          success: true,
          message: 'Reader connected successfully',
          readerId
        };
      };

      const config = {
        ipAddress: '192.168.1.100',
        port: 5084,
        protocol: 'MOCK'
      };

      const result = await service.reconnectReader('READER-001', config);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(sleepCalls.length).toBe(2);
      expect(sleepCalls[0]).toBe(30000); // 30 seconds
      expect(sleepCalls[1]).toBe(30000); // 30 seconds
    });

    it('should send admin alert after max attempts', async () => {
      const errorMessage = 'Connection timeout';
      
      // Mock connectReader to always fail
      service.connectReader = async () => {
        connectCalls.push({});
        throw new Error(errorMessage);
      };

      const config = {
        ipAddress: '192.168.1.100',
        port: 5084,
        protocol: 'MOCK'
      };

      const result = await service.reconnectReader('READER-001', config);

      expect(result.success).toBe(false);
      expect(alertCalls.length).toBe(1);
      expect(alertCalls[0].readerId).toBe('READER-001');
      expect(alertCalls[0].errorMessage).toBe(errorMessage);
    });

    it('should reconnect successfully on third attempt', async () => {
      let attemptCount = 0;
      
      // Mock connectReader to fail twice then succeed
      service.connectReader = async (readerId) => {
        attemptCount++;
        connectCalls.push({ readerId, attempt: attemptCount });
        
        if (attemptCount < 3) {
          throw new Error('Connection failed');
        }
        
        return {
          success: true,
          message: 'Reader connected successfully',
          readerId
        };
      };

      const config = {
        ipAddress: '192.168.1.100',
        port: 5084,
        protocol: 'MOCK'
      };

      const result = await service.reconnectReader('READER-001', config);

      expect(result.success).toBe(true);
      expect(result.readerId).toBe('READER-001');
      expect(result.attempts).toBe(3);
      expect(connectCalls.length).toBe(3);
      expect(sleepCalls.length).toBe(2);
      expect(alertCalls.length).toBe(0);
    });

    it('should return error message after max attempts', async () => {
      const errorMessage = 'Network unreachable';
      
      service.connectReader = async () => {
        connectCalls.push({});
        throw new Error(errorMessage);
      };

      const config = {
        ipAddress: '192.168.1.100',
        port: 5084,
        protocol: 'MOCK'
      };

      const result = await service.reconnectReader('READER-001', config);

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
      expect(result.message).toContain('failed after 10 attempts');
    });
  });

  describe('_sendAdminAlert', () => {
    it('should emit readerReconnectionFailed event', async () => {
      let eventEmitted = false;
      let capturedData = null;

      service.on('readerReconnectionFailed', (data) => {
        eventEmitted = true;
        capturedData = data;
      });

      await service._sendAdminAlert('READER-001', 'Connection timeout');

      expect(eventEmitted).toBe(true);
      expect(capturedData.readerId).toBe('READER-001');
      expect(capturedData.errorMessage).toBe('Connection timeout');
      expect(capturedData.severity).toBe('critical');
      expect(capturedData.timestamp).toBeInstanceOf(Date);
    });

    it('should handle errors gracefully', async () => {
      // Save original emit
      const originalEmit = service.emit;
      
      // Force an error by making emit throw
      service.emit = () => {
        throw new Error('Event emission failed');
      };

      // Should not throw
      await expect(service._sendAdminAlert('READER-001', 'Test error')).resolves.not.toThrow();
      
      // Restore original emit
      service.emit = originalEmit;
    });
  });

  describe('_sleep', () => {
    it('should resolve after specified milliseconds', async () => {
      const startTime = Date.now();
      await service._sleep(100);
      const endTime = Date.now();

      const elapsed = endTime - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some tolerance
      expect(elapsed).toBeLessThan(200);
    });

    it('should return a promise', () => {
      const result = service._sleep(10);
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
