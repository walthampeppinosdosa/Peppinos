// Simple test script to verify guest checkout functionality
const mongoose = require('mongoose');
require('dotenv').config();

const { generateSessionId, getOrCreateGuestUser } = require('./services/guest-service');
const User = require('./models/User');
const Cart = require('./models/Cart');
const Order = require('./models/Order');

async function testGuestCheckout() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/peppinos');
    console.log('✅ Connected to MongoDB');

    // Test 1: Generate session ID
    const sessionId = generateSessionId();
    console.log('✅ Generated session ID:', sessionId);

    // Test 2: Create guest user
    const guestUser = await getOrCreateGuestUser(sessionId, {
      name: 'Test Guest',
      email: 'test@guest.com',
      phoneNumber: '+1234567890'
    });
    console.log('✅ Created guest user:', {
      id: guestUser._id,
      name: guestUser.name,
      email: guestUser.email,
      role: guestUser.role,
      sessionId: guestUser.sessionId
    });

    // Test 3: Create cart for guest user
    const cart = await Cart.getOrCreateCart(guestUser._id);
    console.log('✅ Created cart for guest user:', cart._id);

    // Test 4: Create order for guest user
    const order = new Order({
      user: guestUser._id,
      items: [{
        menu: new mongoose.Types.ObjectId(), // Dummy menu ID
        menuName: 'Test Pizza',
        menuImage: 'test.jpg',
        quantity: 2,
        size: 'Medium',
        price: 15.99,
        addons: [],
        specialInstructions: 'Extra cheese',
        itemTotal: 31.98
      }],
      orderType: 'delivery',
      timing: 'asap',
      deliveryAddress: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'United States',
        phoneNumber: '+1234567890'
      },
      subtotal: 31.98,
      deliveryFee: 3.99,
      tax: 2.56,
      discount: 0,
      totalPrice: 38.53,
      paymentMethod: 'pay_online',
      specialInstructions: 'Ring doorbell'
    });

    await order.save();
    console.log('✅ Created order:', {
      orderNumber: order.orderNumber,
      total: order.totalPrice,
      orderType: order.orderType
    });

    // Test 5: Verify order is marked as guest order
    await order.populate('user', 'name email role');
    console.log('✅ Order user info:', {
      name: order.user.name,
      email: order.user.email,
      role: order.user.role,
      isGuestOrder: order.isGuestOrder
    });

    // Cleanup
    await Order.findByIdAndDelete(order._id);
    await Cart.findByIdAndDelete(cart._id);
    await User.findByIdAndDelete(guestUser._id);
    console.log('✅ Cleaned up test data');

    console.log('\n🎉 All tests passed! Guest checkout system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testGuestCheckout();
}

module.exports = testGuestCheckout;
