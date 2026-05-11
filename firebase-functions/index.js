// Firebase Cloud Function để forward RFID data từ Firebase sang Backend API
const functions = require('firebase-functions');
const axios = require('axios');

// Trigger khi có thay đổi trong /sensors/uid_1 hoặc /sensors/uid_2
exports.onRFIDScan = functions.database.ref('/sensors')
  .onUpdate(async (change, context) => {
    const before = change.before.val();
    const after = change.after.val();
    
    // Kiểm tra xem có RFID mới không
    const uid1Changed = after.uid_1 && after.uid_1 !== before.uid_1 && after.uid_1 !== 'null';
    const uid2Changed = after.uid_2 && after.uid_2 !== before.uid_2 && after.uid_2 !== 'null';
    
    if (!uid1Changed && !uid2Changed) {
      console.log('No RFID change detected');
      return null;
    }
    
    // Lấy tagId từ uid_1 hoặc uid_2
    const tagId = uid1Changed ? after.uid_1 : after.uid_2;
    const readerId = process.env.READER_ID || 'READER-ESP32-01'; // Cấu hình reader ID
    
    console.log(`RFID detected: ${tagId} from reader: ${readerId}`);
    
    try {
      // Gửi scan event đến backend API
      const response = await axios.post(
        `${process.env.BACKEND_URL}/api/v1/rfid/scan-event`,
        {
          readerId: readerId,
          tagId: tagId,
          timestamp: new Date().toISOString()
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.BACKEND_API_KEY}`
          },
          timeout: 5000
        }
      );
      
      console.log('Scan event sent to backend:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('Error sending scan event to backend:', error.message);
      
      // Retry logic
      if (error.response && error.response.status >= 500) {
        console.log('Server error, will retry...');
        // Firebase Functions tự động retry
        throw error;
      }
      
      return null;
    }
  });

// Health check endpoint
exports.healthCheck = functions.https.onRequest((req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
