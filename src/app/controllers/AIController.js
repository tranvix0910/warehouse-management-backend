import { getGeminiModel } from '../../utils/gemini.js';
import ProductModel from '../models/ProductModel.js';
import TransactionModel from '../models/TransactionModel.js';
import CustomerModel from '../models/CustomerModel.js';
import SupplierModel from '../models/SupplierModel.js';
import UserModel from '../models/UserModel.js';

// ============================================================
// Helper: Lấy context data từ database cho AI
// ============================================================
const getWarehouseContext = async () => {
    // 1) Thống kê sản phẩm
    const totalProducts = await ProductModel.countDocuments();
    const outOfStock = await ProductModel.countDocuments({ quantity: 0 });
    const lowStock = await ProductModel.countDocuments({
        quantity: { $gt: 0, $lt: 10 },
    });
    const products = await ProductModel.find()
        .select('productName SKU category quantity cost price RAM GPU color processor')
        .sort({ quantity: 1 })
        .limit(50);

    // 2) Thống kê transactions
    const totalTransactions = await TransactionModel.countDocuments();
    const totalStockIn = await TransactionModel.countDocuments({ type: 'stock_in' });
    const totalStockOut = await TransactionModel.countDocuments({ type: 'stock_out' });

    // 3) Transactions gần đây (7 ngày)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentTransactions = await TransactionModel.find({
        date: { $gte: sevenDaysAgo },
    })
        .populate('items.product', 'productName SKU quantity price')
        .sort({ date: -1 })
        .limit(20);

    // 4) Transactions 30 ngày
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyStockIn = await TransactionModel.countDocuments({
        type: 'stock_in',
        date: { $gte: thirtyDaysAgo },
    });
    const monthlyStockOut = await TransactionModel.countDocuments({
        type: 'stock_out',
        date: { $gte: thirtyDaysAgo },
    });

    // 5) Top sản phẩm xuất kho nhiều nhất (30 ngày)
    const topSellingProducts = await TransactionModel.aggregate([
        { $match: { type: 'stock_out', date: { $gte: thirtyDaysAgo } } },
        { $unwind: '$items' },
        {
            $group: {
                _id: '$items.product',
                totalQuantity: { $sum: '$items.quantity' },
            },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'product',
            },
        },
        { $unwind: '$product' },
        {
            $project: {
                productName: '$product.productName',
                totalQuantity: 1,
                currentStock: '$product.quantity',
                price: '$product.price',
            },
        },
    ]);

    // 6) Customers & Suppliers count
    const totalCustomers = await CustomerModel.countDocuments();
    const totalSuppliers = await SupplierModel.countDocuments();
    const customers = await CustomerModel.find()
        .select('name email phone')
        .limit(20);
    const suppliers = await SupplierModel.find()
        .select('name email phone')
        .limit(20);

    return {
        summary: {
            totalProducts,
            outOfStock,
            lowStock,
            inStock: totalProducts - outOfStock,
            totalTransactions,
            totalStockIn,
            totalStockOut,
            monthlyStockIn,
            monthlyStockOut,
            totalCustomers,
            totalSuppliers,
        },
        products: products.map((p) => p.toObject()),
        recentTransactions: recentTransactions.map((t) => ({
            type: t.type,
            quantity: t.quantity,
            date: t.date,
            supplier: t.supplier,
            customer: t.customer,
            note: t.note,
            items: t.items.map((item) => ({
                productName: item.product?.productName || 'Unknown',
                quantity: item.quantity,
            })),
        })),
        topSellingProducts,
        customers: customers.map((c) => c.toObject()),
        suppliers: suppliers.map((s) => s.toObject()),
    };
};

// ============================================================
// 1. AI CHATBOT - Hỏi đáp ngôn ngữ tự nhiên
// ============================================================
export const aiChat = async (req, res) => {
    const userId = req.user._id;
    const { message } = req.body;

    try {
        // Validate user
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!message || message.trim() === '') {
            return res
                .status(400)
                .json({ success: false, message: 'Message is required' });
        }

        // Lấy context data từ database
        const context = await getWarehouseContext();

        // Tạo prompt cho Gemini
        const prompt = `
Bạn là trợ lý AI thông minh cho hệ thống quản lý kho hàng "Nagav Inventory". 
Bạn giúp người dùng tra cứu thông tin về sản phẩm, giao dịch nhập/xuất kho, khách hàng, nhà cung cấp.

RULES:
- Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng
- Sử dụng emoji phù hợp để trả lời thân thiện
- Nếu không có dữ liệu, hãy trả lời rõ ràng là không tìm thấy  
- Có thể trả lời dạng danh sách, bảng nếu phù hợp
- Format markdown cho dễ đọc
- Nếu câu hỏi không liên quan đến kho hàng, vui lòng từ chối lịch sự và gợi ý hỏi về kho hàng
- Khi liệt kê sản phẩm, bao gồm tên, SKU, số lượng tồn kho
- Đơn vị tiền tệ là VND

DỮ LIỆU KHO HÀNG HIỆN TẠI:
${JSON.stringify(context, null, 2)}

NGÀY HIỆN TẠI: ${new Date().toLocaleDateString('vi-VN')}

CÂU HỎI CỦA NGƯỜI DÙNG: ${message}
`;

        const model = await getGeminiModel();
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        return res.status(200).json({
            success: true,
            message: 'AI response generated successfully',
            data: {
                answer: text,
                timestamp: new Date(),
            },
        });
    } catch (error) {
        console.error('❌ AI Chat Error:', error);
        return res.status(500).json({
            success: false,
            message: 'AI service error: ' + error.message,
        });
    }
};

// ============================================================
// 2. AUTO-GENERATE REPORT - Báo cáo tự động
// ============================================================
export const aiGenerateReport = async (req, res) => {
    const userId = req.user._id;
    const { period = 'weekly' } = req.query; // 'weekly' hoặc 'monthly'

    try {
        // Validate user
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Tính khoảng thời gian
        const now = new Date();
        const startDate = new Date();
        if (period === 'monthly') {
            startDate.setDate(startDate.getDate() - 30);
        } else {
            startDate.setDate(startDate.getDate() - 7);
        }

        // Lấy dữ liệu cho báo cáo
        const periodTransactions = await TransactionModel.find({
            date: { $gte: startDate, $lte: now },
        })
            .populate('items.product', 'productName SKU quantity price cost')
            .sort({ date: -1 });

        const stockInTx = periodTransactions.filter((t) => t.type === 'stock_in');
        const stockOutTx = periodTransactions.filter((t) => t.type === 'stock_out');

        // Tính tổng số lượng nhập/xuất
        const totalStockInQty = stockInTx.reduce((sum, t) => sum + t.quantity, 0);
        const totalStockOutQty = stockOutTx.reduce((sum, t) => sum + t.quantity, 0);

        // Tính doanh thu ước tính (stock_out * price)
        let estimatedRevenue = 0;
        for (const tx of stockOutTx) {
            for (const item of tx.items) {
                if (item.product && item.product.price) {
                    estimatedRevenue += item.quantity * parseFloat(item.product.price);
                }
            }
        }

        // Tính chi phí nhập hàng ước tính (stock_in * cost)
        let estimatedCost = 0;
        for (const tx of stockInTx) {
            for (const item of tx.items) {
                if (item.product && item.product.cost) {
                    estimatedCost += item.quantity * parseFloat(item.product.cost);
                }
            }
        }

        // Top sản phẩm xuất kho
        const productOutMap = {};
        for (const tx of stockOutTx) {
            for (const item of tx.items) {
                const pName = item.product?.productName || 'Unknown';
                if (!productOutMap[pName]) {
                    productOutMap[pName] = { quantity: 0, revenue: 0 };
                }
                productOutMap[pName].quantity += item.quantity;
                productOutMap[pName].revenue +=
                    item.quantity * parseFloat(item.product?.price || 0);
            }
        }
        const topProducts = Object.entries(productOutMap)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        // Tồn kho hiện tại
        const currentStock = await ProductModel.find()
            .select('productName quantity price cost')
            .sort({ quantity: 1 });
        const outOfStock = currentStock.filter((p) => p.quantity === 0);
        const lowStock = currentStock.filter((p) => p.quantity > 0 && p.quantity < 10);

        // Danh sách suppliers/customers liên quan
        const involvedSuppliers = [...new Set(stockInTx.map((t) => t.supplier).filter(Boolean))];
        const involvedCustomers = [...new Set(stockOutTx.map((t) => t.customer).filter(Boolean))];

        const reportData = {
            period: period === 'monthly' ? '30 ngày' : '7 ngày',
            dateRange: {
                from: startDate.toLocaleDateString('vi-VN'),
                to: now.toLocaleDateString('vi-VN'),
            },
            transactions: {
                total: periodTransactions.length,
                stockIn: stockInTx.length,
                stockOut: stockOutTx.length,
                totalStockInQty,
                totalStockOutQty,
            },
            financial: {
                estimatedRevenue,
                estimatedCost,
                estimatedProfit: estimatedRevenue - estimatedCost,
            },
            topProducts,
            inventory: {
                totalProducts: currentStock.length,
                outOfStock: outOfStock.map((p) => p.productName),
                lowStock: lowStock.map((p) => ({
                    name: p.productName,
                    qty: p.quantity,
                })),
            },
            involvedSuppliers,
            involvedCustomers,
        };

        // Tạo prompt cho Gemini
        const prompt = `
Bạn là chuyên gia phân tích kinh doanh cho hệ thống quản lý kho hàng "Nagav Inventory".
Hãy tạo một BÁO CÁO ${period === 'monthly' ? 'THÁNG' : 'TUẦN'} chi tiết, chuyên nghiệp.

RULES:
- Viết bằng tiếng Việt
- Format markdown cho đẹp và dễ đọc
- Sử dụng emoji phù hợp cho các mục
- Bao gồm các section: Tổng quan, Hoạt động nhập/xuất kho, Tài chính, Sản phẩm bán chạy, Cảnh báo tồn kho, Nhận xét & Đề xuất
- Đơn vị tiền tệ VND (format có dấu chấm phân cách hàng nghìn, ví dụ: 1.500.000 VND)
- Đưa ra nhận xét thông minh và đề xuất cải thiện dựa trên dữ liệu
- Nếu dữ liệu cho thấy vấn đề (hết hàng, tồn kho thấp), hãy cảnh báo rõ ràng
- Nếu không có giao dịch trong kỳ, vẫn báo cáo tình trạng kho hiện tại

DỮ LIỆU BÁO CÁO:
${JSON.stringify(reportData, null, 2)}

NGÀY TẠO BÁO CÁO: ${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN')}

Hãy tạo báo cáo ngay:
`;

        const model = await getGeminiModel();
        const result = await model.generateContent(prompt);
        const response = result.response;
        const reportText = response.text();

        return res.status(200).json({
            success: true,
            message: 'Report generated successfully',
            data: {
                report: reportText,
                rawData: reportData,
                generatedAt: now,
                period,
            },
        });
    } catch (error) {
        console.error('❌ AI Report Error:', error);
        return res.status(500).json({
            success: false,
            message: 'AI service error: ' + error.message,
        });
    }
};
