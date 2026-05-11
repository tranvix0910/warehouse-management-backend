import RFIDReaderModel from '../app/models/RFIDReaderModel.js';
import EventEmitter from 'events';

/**
 * RFIDReaderService - Manages connections to RFID readers
 * 
 * This service handles:
 * - Connection management with connection pooling
 * - Reader status monitoring
 * - Scan event handling
 * - Connection configuration validation
 * 
 * Currently supports mock readers for testing. Can be extended for real hardware integration.
 */
class RFIDReaderService extends EventEmitter {
  constructor() {
    super();
    // Connection pool: Map of readerId -> connection object
    this.connections = new Map();
    // Connection status: Map of readerId -> status info
    this.connectionStatus = new Map();
    // Maximum connections in pool
    this.maxConnections = 50;
  }

  /**
   * Validate connection configuration
   * @param {Object} connectionConfig - Configuration object
   * @returns {Object} Validation result { valid: boolean, errors: string[] }
   */
  validateConnectionConfig(connectionConfig) {
    const errors = [];

    if (!connectionConfig) {
      errors.push('Connection configuration is required');
      return { valid: false, errors };
    }

    // Validate IP address format (IPv4)
    if (connectionConfig.ipAddress) {
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipv4Regex.test(connectionConfig.ipAddress)) {
        errors.push('Invalid IPv4 address format');
      } else {
        // Validate each octet is 0-255
        const octets = connectionConfig.ipAddress.split('.');
        const invalidOctet = octets.some(octet => {
          const num = parseInt(octet, 10);
          return num < 0 || num > 255;
        });
        if (invalidOctet) {
          errors.push('IP address octets must be between 0 and 255');
        }
      }
    }

    // Validate port number
    if (connectionConfig.port !== undefined) {
      const port = parseInt(connectionConfig.port, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        errors.push('Port must be between 1 and 65535');
      }
    }

    // Validate protocol
    if (connectionConfig.protocol) {
      const validProtocols = ['LLRP', 'TCP', 'UDP', 'HTTP', 'MOCK'];
      if (!validProtocols.includes(connectionConfig.protocol.toUpperCase())) {
        errors.push(`Protocol must be one of: ${validProtocols.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Connect to an RFID reader
   * @param {String} readerId - Unique identifier for the reader
   * @param {Object} connectionConfig - Connection configuration
   * @returns {Promise<Object>} Connection result
   */
  async connectReader(readerId, connectionConfig) {
    try {
      // Validate readerId
      if (!readerId || typeof readerId !== 'string') {
        throw new Error('Valid readerId is required');
      }

      // Check if already connected
      if (this.connections.has(readerId)) {
        console.log(`Reader ${readerId} is already connected`);
        return {
          success: true,
          message: 'Reader already connected',
          readerId,
          status: this.connectionStatus.get(readerId)
        };
      }

      // Check connection pool limit
      if (this.connections.size >= this.maxConnections) {
        throw new Error(`Connection pool limit reached (${this.maxConnections})`);
      }

      // Validate connection configuration
      const validation = this.validateConnectionConfig(connectionConfig);
      if (!validation.valid) {
        throw new Error(`Invalid connection configuration: ${validation.errors.join(', ')}`);
      }

      // Verify reader exists in database
      const reader = await RFIDReaderModel.findOne({ readerId });
      if (!reader) {
        throw new Error(`Reader ${readerId} not found in database`);
      }

      // Check if reader is active
      if (!reader.isActive) {
        throw new Error(`Reader ${readerId} is not active`);
      }

      // Create connection object (mock implementation)
      // In production, this would establish actual hardware connection
      const connection = this._createConnection(readerId, connectionConfig);

      // Store connection in pool
      this.connections.set(readerId, connection);

      // Update connection status
      const status = {
        readerId,
        connected: true,
        connectedAt: new Date(),
        lastActivity: new Date(),
        config: connectionConfig
      };
      this.connectionStatus.set(readerId, status);

      // Update reader in database
      await RFIDReaderModel.findOneAndUpdate(
        { readerId },
        {
          status: 'active',
          lastSeen: new Date(),
          connectionConfig
        }
      );

      console.log(`✅ Reader ${readerId} connected successfully`);

      // Emit connection event
      this.emit('readerConnected', { readerId, status });

      return {
        success: true,
        message: 'Reader connected successfully',
        readerId,
        status
      };

    } catch (error) {
      console.error(`❌ Failed to connect reader ${readerId}:`, error.message);

      // Update reader status to error in database
      try {
        await RFIDReaderModel.findOneAndUpdate(
          { readerId },
          { status: 'error', lastSeen: new Date() }
        );
      } catch (dbError) {
        console.error(`Failed to update reader status in database:`, dbError.message);
      }

      throw error;
    }
  }

  /**
   * Disconnect from an RFID reader
   * @param {String} readerId - Unique identifier for the reader
   * @returns {Promise<Object>} Disconnection result
   */
  async disconnectReader(readerId) {
    try {
      // Validate readerId
      if (!readerId || typeof readerId !== 'string') {
        throw new Error('Valid readerId is required');
      }

      // Check if reader is connected
      if (!this.connections.has(readerId)) {
        console.log(`Reader ${readerId} is not connected`);
        return {
          success: true,
          message: 'Reader not connected',
          readerId
        };
      }

      // Get connection
      const connection = this.connections.get(readerId);

      // Close connection (mock implementation)
      // In production, this would close actual hardware connection
      this._closeConnection(connection);

      // Remove from connection pool
      this.connections.delete(readerId);
      this.connectionStatus.delete(readerId);

      // Update reader in database
      await RFIDReaderModel.findOneAndUpdate(
        { readerId },
        {
          status: 'inactive',
          lastSeen: new Date()
        }
      );

      console.log(`✅ Reader ${readerId} disconnected successfully`);

      // Emit disconnection event
      this.emit('readerDisconnected', { readerId });

      return {
        success: true,
        message: 'Reader disconnected successfully',
        readerId
      };

    } catch (error) {
      console.error(`❌ Failed to disconnect reader ${readerId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get status of an RFID reader
   * @param {String} readerId - Unique identifier for the reader
   * @returns {Object} Reader status
   */
  getReaderStatus(readerId) {
    // Validate readerId
    if (!readerId || typeof readerId !== 'string') {
      throw new Error('Valid readerId is required');
    }

    // Check if reader is connected
    const isConnected = this.connections.has(readerId);
    const status = this.connectionStatus.get(readerId);

    if (!isConnected) {
      return {
        readerId,
        connected: false,
        message: 'Reader not connected'
      };
    }

    return {
      readerId,
      connected: true,
      ...status
    };
  }

  /**
   * Get status of all readers
   * @returns {Array} Array of reader statuses
   */
  getAllReaderStatuses() {
    const statuses = [];

    for (const [readerId, status] of this.connectionStatus.entries()) {
      statuses.push({
        readerId,
        connected: true,
        ...status
      });
    }

    return statuses;
  }

  /**
   * Create a connection object (mock implementation)
   * In production, this would establish actual hardware connection
   * @private
   */
  _createConnection(readerId, connectionConfig) {
    const protocol = connectionConfig.protocol?.toUpperCase() || 'MOCK';

    // Mock connection object
    const connection = {
      readerId,
      protocol,
      config: connectionConfig,
      createdAt: new Date(),
      // Mock methods for hardware interaction
      send: (data) => {
        console.log(`[${readerId}] Sending data:`, data);
        return Promise.resolve({ success: true });
      },
      receive: () => {
        console.log(`[${readerId}] Receiving data`);
        return Promise.resolve(null);
      },
      close: () => {
        console.log(`[${readerId}] Closing connection`);
        return Promise.resolve();
      }
    };

    return connection;
  }

  /**
   * Close a connection (mock implementation)
   * In production, this would close actual hardware connection
   * @private
   */
  _closeConnection(connection) {
    if (connection && typeof connection.close === 'function') {
      connection.close();
    }
  }

  /**
   * Validate scan event data format
   * @param {Object} scanData - Scan event data to validate
   * @returns {Object} Validation result { valid: boolean, errors: string[] }
   */
  validateScanEvent(scanData) {
    const errors = [];

    if (!scanData) {
      errors.push('Scan event data is required');
      return { valid: false, errors };
    }

    // Validate readerId
    if (!scanData.readerId || typeof scanData.readerId !== 'string') {
      errors.push('Valid readerId is required');
    } else if (scanData.readerId.length < 3 || scanData.readerId.length > 50) {
      errors.push('readerId must be between 3 and 50 characters');
    }

    // Validate tagId
    if (!scanData.tagId || typeof scanData.tagId !== 'string') {
      errors.push('Valid tagId is required');
    } else if (scanData.tagId.length < 4 || scanData.tagId.length > 100) {
      errors.push('tagId must be between 4 and 100 characters');
    }

    // Validate timestamp
    if (scanData.timestamp) {
      const timestamp = new Date(scanData.timestamp);
      if (isNaN(timestamp.getTime())) {
        errors.push('Invalid timestamp format');
      } else if (timestamp > new Date()) {
        errors.push('Timestamp cannot be in the future');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Process a scan event from RFID reader hardware
   * This method would be called by the actual RFID reader integration
   * @param {Object} scanData - Raw scan data from reader
   * @returns {Object} Processing result
   */
  processScanEvent(scanData) {
    try {
      // Validate scan event data format
      const validation = this.validateScanEvent(scanData);
      if (!validation.valid) {
        const error = new Error(`Invalid scan event data: ${validation.errors.join(', ')}`);
        console.error('❌ Scan event validation failed:', error.message);
        return {
          success: false,
          error: error.message,
          errors: validation.errors
        };
      }

      const { readerId, tagId, timestamp } = scanData;

      // Check if reader is connected
      if (!this.connections.has(readerId)) {
        const error = `Reader ${readerId} not connected`;
        console.warn(`⚠️ Cannot process scan: ${error}`);
        return {
          success: false,
          error,
          readerId,
          tagId
        };
      }

      // Update last activity
      const status = this.connectionStatus.get(readerId);
      if (status) {
        status.lastActivity = new Date();
      }

      // Create standardized scan event
      const scanEvent = {
        readerId,
        tagId,
        timestamp: timestamp ? new Date(timestamp) : new Date()
      };

      console.log(`📡 Scan event from reader ${readerId}: tag ${tagId}`);
      
      // Emit scan event to registered handlers
      this.emit('scanEvent', scanEvent);

      return {
        success: true,
        scanEvent
      };

    } catch (error) {
      console.error('❌ Error processing scan event:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Simulate a scan event (for testing purposes)
   * In production, this would be triggered by actual hardware
   * @param {String} readerId - Reader that detected the tag
   * @param {String} tagId - RFID tag identifier
   */
  simulateScan(readerId, tagId) {
    // Use processScanEvent for consistent handling
    return this.processScanEvent({
      readerId,
      tagId,
      timestamp: new Date()
    });
  }

  /**
   * Register a scan event handler
   * @param {Function} callback - Handler function (readerId, tagId, timestamp) => void
   */
  onScanEvent(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    this.on('scanEvent', (scanEvent) => {
      callback(scanEvent.readerId, scanEvent.tagId, scanEvent.timestamp);
    });
  }

  /**
   * Reconnect to a failed RFID reader with exponential backoff
   * @param {String} readerId - Unique identifier for the reader
   * @param {Object} connectionConfig - Connection configuration
   * @returns {Promise<Object>} Reconnection result
   */
  async reconnectReader(readerId, connectionConfig) {
    const maxAttempts = 10;
    const baseInterval = 30000; // 30 seconds

    console.log(`🔄 Starting reconnection attempts for reader ${readerId}`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔄 Reconnection attempt ${attempt}/${maxAttempts} for reader ${readerId}`);

        // Attempt to connect the reader
        const result = await this.connectReader(readerId, connectionConfig);

        console.log(`✅ Reader ${readerId} reconnected successfully on attempt ${attempt}`);

        return {
          success: true,
          message: `Reader reconnected successfully on attempt ${attempt}`,
          readerId,
          attempts: attempt
        };

      } catch (error) {
        console.warn(`⚠️ Reconnection attempt ${attempt}/${maxAttempts} failed for reader ${readerId}: ${error.message}`);

        // If this was the last attempt, send admin alert
        if (attempt === maxAttempts) {
          console.error(`❌ Reader ${readerId} failed to reconnect after ${maxAttempts} attempts`);

          // Send admin alert
          await this._sendAdminAlert(readerId, error.message);

          return {
            success: false,
            message: `Reader reconnection failed after ${maxAttempts} attempts`,
            readerId,
            attempts: maxAttempts,
            error: error.message
          };
        }

        // Wait before next attempt (30 seconds)
        console.log(`⏳ Waiting ${baseInterval / 1000} seconds before next reconnection attempt for reader ${readerId}`);
        await this._sleep(baseInterval);
      }
    }
  }

  /**
   * Send admin alert for reader reconnection failure
   * @param {String} readerId - Reader that failed to reconnect
   * @param {String} errorMessage - Error message from last attempt
   * @private
   */
  async _sendAdminAlert(readerId, errorMessage) {
    try {
      console.error(`🚨 ADMIN ALERT: Reader ${readerId} failed to reconnect`);
      console.error(`🚨 Error: ${errorMessage}`);
      console.error(`🚨 Action required: Check reader ${readerId} hardware and network connection`);

      // In production, this would integrate with email service, SMS, or notification system
      // For now, we emit an event that can be handled by external systems
      this.emit('readerReconnectionFailed', {
        readerId,
        errorMessage,
        timestamp: new Date(),
        severity: 'critical'
      });

      // TODO: Integrate with MailService for email notifications
      // await MailService.sendAdminAlert({
      //   subject: `RFID Reader Reconnection Failed: ${readerId}`,
      //   message: `Reader ${readerId} failed to reconnect after 10 attempts. Error: ${errorMessage}`,
      //   severity: 'critical'
      // });

    } catch (alertError) {
      console.error(`Failed to send admin alert for reader ${readerId}:`, alertError.message);
    }
  }

  /**
   * Sleep utility for reconnection delays
   * @param {Number} ms - Milliseconds to sleep
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Disconnect all readers and cleanup
   */
  async disconnectAll() {
    const readerIds = Array.from(this.connections.keys());
    const results = [];

    for (const readerId of readerIds) {
      try {
        const result = await this.disconnectReader(readerId);
        results.push(result);
      } catch (error) {
        console.error(`Failed to disconnect reader ${readerId}:`, error.message);
        results.push({
          success: false,
          readerId,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get connection pool statistics
   * @returns {Object} Pool statistics
   */
  getPoolStats() {
    return {
      activeConnections: this.connections.size,
      maxConnections: this.maxConnections,
      utilization: (this.connections.size / this.maxConnections * 100).toFixed(2) + '%',
      readers: Array.from(this.connections.keys())
    };
  }
}

// Export singleton instance
const rfidReaderService = new RFIDReaderService();
export default rfidReaderService;
