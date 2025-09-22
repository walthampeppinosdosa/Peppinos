const axios = require('axios');

// Configuration
const API_BASE_URL = 'https://peppinos-backend.vercel.app';
const SUPER_ADMIN_CREDENTIALS = {
  email: 'superadmin@peppinos.com',
  password: 'Superadmin1@peppinos.com'
};
const NEW_QUANTITY = 50;

// Global variables
let accessToken = null;

// Helper function to make authenticated API calls
const makeAuthenticatedRequest = async (method, endpoint, data = null) => {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error making ${method} request to ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
};

// Function to login as super admin
const loginAsSuperAdmin = async () => {
  try {
    console.log('🔐 Logging in as Super Admin...');
    
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, SUPER_ADMIN_CREDENTIALS, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      accessToken = response.data.data.accessToken;
      console.log('✅ Successfully logged in as Super Admin');
      console.log(`👤 User: ${response.data.data.user.name} (${response.data.data.user.role})`);
      return true;
    } else {
      console.error('❌ Login failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.response?.data?.message || error.message);
    return false;
  }
};

// Function to get all menu items
const getAllMenuItems = async () => {
  try {
    console.log('📋 Fetching all menu items...');
    
    // Get total count first
    const firstPage = await makeAuthenticatedRequest('GET', '/api/admin/menu?page=1&limit=1');
    const totalItems = firstPage.data.pagination.totalItems;
    
    console.log(`📊 Total menu items found: ${totalItems}`);
    
    if (totalItems === 0) {
      console.log('⚠️ No menu items found');
      return [];
    }

    // Fetch all items in one request
    const allItems = await makeAuthenticatedRequest('GET', `/api/admin/menu?page=1&limit=${totalItems}`);
    
    return allItems.data.menuItems;
  } catch (error) {
    console.error('❌ Error fetching menu items:', error.message);
    throw error;
  }
};

// Function to update a single menu item's quantity
const updateMenuItemQuantity = async (menuItem) => {
  try {
    const updateData = {
      name: menuItem.name,
      description: menuItem.description,
      category: menuItem.category._id,
      mrp: menuItem.mrp,
      discountedPrice: menuItem.discountedPrice,
      quantity: NEW_QUANTITY,
      sizes: menuItem.sizes,
      preparationTime: menuItem.preparationTime,
      specialInstructions: menuItem.specialInstructions,
      tags: menuItem.tags,
      addons: menuItem.addons,
      isVegetarian: menuItem.isVegetarian,
      isActive: menuItem.isActive,
      existingImages: menuItem.images.map(img => img.url)
    };

    // Add optional fields if they exist
    if (menuItem.spicyLevel && menuItem.spicyLevel.length > 0) {
      updateData.spicyLevel = menuItem.spicyLevel.map(level => level._id);
    }

    if (menuItem.preparations && menuItem.preparations.length > 0) {
      updateData.preparation = JSON.stringify(menuItem.preparations.map(prep => prep._id));
    }

    const response = await makeAuthenticatedRequest('PUT', `/api/admin/menu/${menuItem._id}`, updateData);
    
    if (response.success) {
      console.log(`✅ Updated "${menuItem.name}" - Quantity: ${menuItem.quantity} → ${NEW_QUANTITY}`);
      return true;
    } else {
      console.error(`❌ Failed to update "${menuItem.name}":`, response.message);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating "${menuItem.name}":`, error.response?.data?.message || error.message);
    return false;
  }
};

// Function to update all menu items' quantities
const updateAllMenuQuantities = async () => {
  try {
    const menuItems = await getAllMenuItems();
    
    if (menuItems.length === 0) {
      console.log('⚠️ No menu items to update');
      return;
    }

    console.log(`🔄 Starting to update ${menuItems.length} menu items...`);
    console.log(`🎯 Target quantity: ${NEW_QUANTITY}`);
    
    let successCount = 0;
    let failureCount = 0;

    // Update items one by one to avoid overwhelming the server
    for (let i = 0; i < menuItems.length; i++) {
      const menuItem = menuItems[i];
      console.log(`\n📝 Processing ${i + 1}/${menuItems.length}: "${menuItem.name}"`);
      console.log(`   Current quantity: ${menuItem.quantity}`);
      
      if (menuItem.quantity === NEW_QUANTITY) {
        console.log(`   ⏭️ Skipping - already has quantity ${NEW_QUANTITY}`);
        successCount++;
        continue;
      }

      const success = await updateMenuItemQuantity(menuItem);
      
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }

      // Add a small delay to avoid rate limiting
      if (i < menuItems.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('\n🎉 Update process completed!');
    console.log(`✅ Successfully updated: ${successCount} items`);
    console.log(`❌ Failed to update: ${failureCount} items`);
    console.log(`📊 Total processed: ${successCount + failureCount} items`);

  } catch (error) {
    console.error('❌ Error in update process:', error.message);
  }
};

// Main function
const main = async () => {
  console.log('🚀 Starting Menu Quantity Update Script');
  console.log(`🌐 API Base URL: ${API_BASE_URL}`);
  console.log(`📧 Super Admin Email: ${SUPER_ADMIN_CREDENTIALS.email}`);
  console.log(`🔢 Target Quantity: ${NEW_QUANTITY}`);
  console.log('=' .repeat(50));

  try {
    // Step 1: Login as super admin
    const loginSuccess = await loginAsSuperAdmin();
    if (!loginSuccess) {
      console.log('❌ Script terminated due to login failure');
      process.exit(1);
    }

    console.log('=' .repeat(50));

    // Step 2: Update all menu quantities
    await updateAllMenuQuantities();

    console.log('\n' + '=' .repeat(50));
    console.log('🎯 Script execution completed successfully!');

  } catch (error) {
    console.error('\n❌ Script failed with error:', error.message);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  main,
  loginAsSuperAdmin,
  getAllMenuItems,
  updateMenuItemQuantity,
  updateAllMenuQuantities
};
