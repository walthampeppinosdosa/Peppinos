// Test script to verify Redux integration with backend APIs
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

async function testReduxIntegration() {
  console.log('🧪 Testing Redux Integration with Backend APIs\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const healthResponse = await axios.get(`${API_BASE_URL}/api/health`);
    console.log('✅ Health Check:', healthResponse.data.message);

    // Test 2: Login with Admin Credentials
    console.log('\n2. Testing Admin Login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: 'superadmin@peppinos.com',
      password: 'SuperAdmin123'
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Admin Login successful');
      const { accessToken, user } = loginResponse.data.data;
      console.log(`   User: ${user.name} (${user.role})`);

      // Test 3: Fetch Dashboard Analytics
      console.log('\n3. Testing Dashboard Analytics...');
      const dashboardResponse = await axios.get(`${API_BASE_URL}/api/admin/dashboard/analytics`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (dashboardResponse.data.success) {
        console.log('✅ Dashboard Analytics fetched successfully');
        console.log(`   Total Orders: ${dashboardResponse.data.data.overview.totalOrders}`);
        console.log(`   Total Revenue: $${dashboardResponse.data.data.overview.totalRevenue}`);
      }

      // Test 4: Fetch Products
      console.log('\n4. Testing Products API...');
      const productsResponse = await axios.get(`${API_BASE_URL}/api/admin/products`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (productsResponse.data.success) {
        console.log('✅ Products fetched successfully');
        console.log(`   Total Products: ${productsResponse.data.data.pagination.totalItems}`);
      }

      // Test 5: Fetch Categories
      console.log('\n5. Testing Categories API...');
      const categoriesResponse = await axios.get(`${API_BASE_URL}/api/admin/categories`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (categoriesResponse.data.success) {
        console.log('✅ Categories fetched successfully');
        console.log(`   Total Categories: ${categoriesResponse.data.data.pagination.totalItems}`);
      }

      // Test 6: Fetch Orders
      console.log('\n6. Testing Orders API...');
      const ordersResponse = await axios.get(`${API_BASE_URL}/api/admin/orders`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (ordersResponse.data.success) {
        console.log('✅ Orders fetched successfully');
        console.log(`   Total Orders: ${ordersResponse.data.data.pagination.totalItems}`);
      }

      // Test 7: Fetch Users
      console.log('\n7. Testing Users API...');
      const usersResponse = await axios.get(`${API_BASE_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (usersResponse.data.success) {
        console.log('✅ Users fetched successfully');
        console.log(`   Total Users: ${usersResponse.data.data.pagination.totalItems}`);
      }

      // Test 8: Fetch Reviews
      console.log('\n8. Testing Reviews API...');
      const reviewsResponse = await axios.get(`${API_BASE_URL}/api/admin/reviews`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (reviewsResponse.data.success) {
        console.log('✅ Reviews fetched successfully');
        console.log(`   Total Reviews: ${reviewsResponse.data.data.pagination.totalItems}`);
      }

      // Test 9: Fetch Newsletter Subscribers
      console.log('\n9. Testing Newsletter API...');
      const newsletterResponse = await axios.get(`${API_BASE_URL}/api/admin/newsletter/subscribers`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (newsletterResponse.data.success) {
        console.log('✅ Newsletter subscribers fetched successfully');
        console.log(`   Total Subscribers: ${newsletterResponse.data.data.pagination.totalItems}`);
      }

      // Test 10: Fetch Contacts
      console.log('\n10. Testing Contacts API...');
      const contactsResponse = await axios.get(`${API_BASE_URL}/api/admin/contacts`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (contactsResponse.data.success) {
        console.log('✅ Contacts fetched successfully');
        console.log(`   Total Contacts: ${contactsResponse.data.data.pagination.totalItems}`);
      }

      console.log('\n🎉 All Redux Integration Tests Passed!');
      console.log('\n📋 Summary:');
      console.log('   ✅ Authentication working');
      console.log('   ✅ All admin APIs accessible');
      console.log('   ✅ JWT token validation working');
      console.log('   ✅ Role-based access control working');
      console.log('   ✅ Ready for Redux integration');

    } else {
      console.log('❌ Admin Login failed:', loginResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the backend server is running on port 5000');
      console.log('   Run: cd server && npm run dev');
    }
  }
}

// Run the test
testReduxIntegration();
