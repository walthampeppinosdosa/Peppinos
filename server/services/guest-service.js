const User = require('../models/User');
const Cart = require('../models/Cart');
const crypto = require('crypto');

/**
 * Generate a unique session ID for guest users
 */
const generateSessionId = () => {
  return `guest_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
};

/**
 * Create or get a guest user by session ID
 */
const getOrCreateGuestUser = async (sessionId, guestInfo = {}) => {
  try {
    // Try to find existing guest user by session ID
    let guestUser = await User.findOne({ 
      role: 'guest', 
      sessionId: sessionId 
    });

    if (!guestUser) {
      // Create new guest user
      guestUser = new User({
        name: guestInfo.name || `Guest_${Date.now()}`,
        email: guestInfo.email || `guest_${Date.now()}@temp.com`,
        phoneNumber: guestInfo.phoneNumber || '',
        role: 'guest',
        sessionId: sessionId,
        isActive: true,
        isEmailVerified: false
      });

      await guestUser.save();
    } else if (guestInfo.name || guestInfo.email || guestInfo.phoneNumber) {
      // Update guest user info if provided
      if (guestInfo.name) guestUser.name = guestInfo.name;
      if (guestInfo.email) guestUser.email = guestInfo.email;
      if (guestInfo.phoneNumber) guestUser.phoneNumber = guestInfo.phoneNumber;
      
      await guestUser.save();
    }

    return guestUser;
  } catch (error) {
    console.error('Error creating/getting guest user:', error);
    throw error;
  }
};

/**
 * Get guest user by session ID
 */
const getGuestUserBySession = async (sessionId) => {
  try {
    return await User.findOne({ 
      role: 'guest', 
      sessionId: sessionId 
    });
  } catch (error) {
    console.error('Error getting guest user by session:', error);
    throw error;
  }
};

/**
 * Get guest user by email
 */
const getGuestUserByEmail = async (email) => {
  try {
    return await User.findOne({ 
      role: 'guest', 
      email: email 
    });
  } catch (error) {
    console.error('Error getting guest user by email:', error);
    throw error;
  }
};

/**
 * Update guest user information
 */
const updateGuestUser = async (sessionId, updateData) => {
  try {
    const guestUser = await User.findOneAndUpdate(
      { role: 'guest', sessionId: sessionId },
      updateData,
      { new: true, runValidators: true }
    );

    return guestUser;
  } catch (error) {
    console.error('Error updating guest user:', error);
    throw error;
  }
};

/**
 * Delete guest user and associated data
 */
const deleteGuestUser = async (sessionId) => {
  try {
    const guestUser = await User.findOne({ 
      role: 'guest', 
      sessionId: sessionId 
    });

    if (!guestUser) {
      return false;
    }

    // Delete associated cart
    await Cart.findOneAndDelete({ user: guestUser._id });

    // Delete guest user
    await User.findByIdAndDelete(guestUser._id);

    return true;
  } catch (error) {
    console.error('Error deleting guest user:', error);
    throw error;
  }
};

/**
 * Clean up old guest users and their data (older than 7 days)
 */
const cleanupOldGuestUsers = async () => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Find old guest users
    const oldGuestUsers = await User.find({
      role: 'guest',
      updatedAt: { $lt: sevenDaysAgo }
    }).select('_id');

    const oldGuestUserIds = oldGuestUsers.map(user => user._id);

    if (oldGuestUserIds.length === 0) {
      return { deletedUsers: 0, deletedCarts: 0 };
    }

    // Delete associated carts
    const cartResult = await Cart.deleteMany({ user: { $in: oldGuestUserIds } });

    // Delete guest users
    const userResult = await User.deleteMany({ _id: { $in: oldGuestUserIds } });

    return {
      deletedUsers: userResult.deletedCount,
      deletedCarts: cartResult.deletedCount
    };
  } catch (error) {
    console.error('Error cleaning up old guest users:', error);
    throw error;
  }
};

/**
 * Get guest user statistics
 */
const getGuestUserStats = async () => {
  try {
    const stats = await User.aggregate([
      { $match: { role: 'guest' } },
      {
        $group: {
          _id: null,
          totalGuestUsers: { $sum: 1 },
          activeToday: {
            $sum: {
              $cond: [
                { $gte: ['$updatedAt', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
                1,
                0
              ]
            }
          },
          activeThisWeek: {
            $sum: {
              $cond: [
                { $gte: ['$updatedAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    return stats[0] || {
      totalGuestUsers: 0,
      activeToday: 0,
      activeThisWeek: 0
    };
  } catch (error) {
    console.error('Error getting guest user stats:', error);
    throw error;
  }
};

/**
 * Convert guest user to regular customer
 */
const convertGuestToCustomer = async (sessionId, password) => {
  try {
    const guestUser = await User.findOne({ 
      role: 'guest', 
      sessionId: sessionId 
    });

    if (!guestUser) {
      throw new Error('Guest user not found');
    }

    // Update user to customer role and add password
    guestUser.role = 'customer';
    guestUser.password = password;
    guestUser.sessionId = undefined; // Remove session ID
    guestUser.isEmailVerified = false; // Will need to verify email

    await guestUser.save();

    return guestUser;
  } catch (error) {
    console.error('Error converting guest to customer:', error);
    throw error;
  }
};

module.exports = {
  generateSessionId,
  getOrCreateGuestUser,
  getGuestUserBySession,
  getGuestUserByEmail,
  updateGuestUser,
  deleteGuestUser,
  cleanupOldGuestUsers,
  getGuestUserStats,
  convertGuestToCustomer
};
