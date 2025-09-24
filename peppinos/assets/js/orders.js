import { isAuthenticated } from './auth.js';
import { httpClient } from './api.js';

class OrdersPage {
  constructor() {
    this.orders = [];
    this.filteredOrders = [];
    this.currentFilters = {
      status: '',
      date: '',
      search: ''
    };
    this.init();
  }

  async init() {
    try {
      // Check if user is authenticated
      if (!isAuthenticated()) {
        window.location.href = './login.html';
        return;
      }

      // Load orders
      await this.loadOrders();
      
      // Set up event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Error initializing orders page:', error);
      this.showError('Failed to load orders');
    }
  }

  setupEventListeners() {
    // Filter listeners
    document.getElementById('statusFilter').addEventListener('change', (e) => {
      this.currentFilters.status = e.target.value;
      this.applyFilters();
    });

    document.getElementById('dateFilter').addEventListener('change', (e) => {
      this.currentFilters.date = e.target.value;
      this.applyFilters();
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.currentFilters.search = e.target.value;
      this.applyFilters();
    });
  }

  async loadOrders() {
    try {
      this.showLoading();
      
      const response = await httpClient.get('/api/shop/orders/user');
      
      if (response.success) {
        this.orders = response.data.orders || [];
        this.filteredOrders = [...this.orders];
        this.renderOrders();
      } else {
        throw new Error(response.message || 'Failed to load orders');
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      this.showError('Failed to load orders');
    }
  }

  applyFilters() {
    this.filteredOrders = this.orders.filter(order => {
      // Status filter
      if (this.currentFilters.status && order.deliveryStatus !== this.currentFilters.status) {
        return false;
      }

      // Date filter
      if (this.currentFilters.date) {
        const orderDate = new Date(order.createdAt);
        const now = new Date();
        
        switch (this.currentFilters.date) {
          case 'today':
            if (orderDate.toDateString() !== now.toDateString()) return false;
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (orderDate < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (orderDate < monthAgo) return false;
            break;
          case '3months':
            const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            if (orderDate < threeMonthsAgo) return false;
            break;
        }
      }

      // Search filter
      if (this.currentFilters.search) {
        const searchTerm = this.currentFilters.search.toLowerCase();
        const orderNumber = order.orderNumber?.toLowerCase() || '';
        const itemNames = order.items?.map(item => item.menuName?.toLowerCase() || '').join(' ') || '';
        
        if (!orderNumber.includes(searchTerm) && !itemNames.includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });

    this.renderOrders();
  }

  renderOrders() {
    const ordersList = document.getElementById('ordersList');
    
    if (this.filteredOrders.length === 0) {
      ordersList.innerHTML = this.renderEmptyState();
      return;
    }

    const ordersHTML = this.filteredOrders.map(order => this.renderOrder(order)).join('');
    ordersList.innerHTML = ordersHTML;
  }

  renderOrder(order) {
    const statusClass = `status-${order.deliveryStatus}`;
    const orderDate = new Date(order.createdAt).toLocaleDateString();
    const orderTime = new Date(order.createdAt).toLocaleTimeString();

    return `
      <div class="order-card">
        <div class="order-header">
          <div class="order-info">
            <div class="order-number">Order #${order.orderNumber || order._id.slice(-8)}</div>
            <div class="order-date">${orderDate} at ${orderTime}</div>
          </div>
          <div class="order-status ${statusClass}">
            ${this.formatStatus(order.deliveryStatus)}
          </div>
        </div>

        <div class="order-items">
          ${order.items.map(item => this.renderOrderItem(item)).join('')}
        </div>

        <div class="order-footer">
          <div class="order-total">
            Total: $${order.totalPrice.toFixed(2)}
          </div>
          <div class="order-actions">
            ${this.renderOrderActions(order)}
          </div>
        </div>
      </div>
    `;
  }

  renderOrderItem(item) {
    const imageUrl = item.menuImage || './assets/images/menu-placeholder.jpg';
    
    return `
      <div class="order-item">
        <img src="${imageUrl}" alt="${item.menuName}" class="item-image">
        <div class="item-details">
          <div class="item-name">${item.menuName}</div>
          <div class="item-details-text">
            Qty: ${item.quantity} | Size: ${item.size || 'Medium'}
            ${item.addons && item.addons.length > 0 ? 
              `<br>Add-ons: ${item.addons.map(addon => addon.name).join(', ')}` : 
              ''
            }
            ${item.specialInstructions ? 
              `<br>Special Instructions: ${item.specialInstructions}` : 
              ''
            }
          </div>
        </div>
        <div class="item-price">$${item.itemTotal.toFixed(2)}</div>
      </div>
    `;
  }

  renderOrderActions(order) {
    const actions = [];

    // Track order (for orders that are not delivered or cancelled)
    if (!['delivered', 'cancelled'].includes(order.deliveryStatus)) {
      actions.push(`
        <button class="btn-small btn-primary-small" onclick="ordersPage.trackOrder('${order._id}')">
          <ion-icon name="location-outline"></ion-icon>
          Track Order
        </button>
      `);
    }

    // Reorder
  

    // // Cancel order (only for pending orders)
    // if (order.deliveryStatus === 'pending') {
    //   actions.push(`
    //     <button class="btn-small btn-danger-small" onclick="ordersPage.cancelOrder('${order._id}')">
    //       <ion-icon name="close-outline"></ion-icon>
    //       Cancel
    //     </button>
    //   `);
    // }

    return actions.join('');
  }

  formatStatus(status) {
    const statusMap = {
      'pending': 'Pending',
      'confirmed': 'Confirmed',
      'preparing': 'Preparing',
      'ready': 'Ready',
      'out-for-delivery': 'Out for Delivery',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
  }

  async trackOrder(orderId) {
    try {
      // First try to get the order to get the order number
      const response = await httpClient.get(`/api/shop/orders/${orderId}/track`);

      if (response.success) {
        const order = response.data.order;
        // Redirect to order tracking page with order number
        window.location.href = `./order-tracking.html?orderNumber=${order.orderNumber}`;
      } else {
        throw new Error(response.message || 'Failed to track order');
      }
    } catch (error) {
      console.error('Error tracking order:', error);
      // If the authenticated endpoint fails, try to redirect with order ID
      // The tracking page will handle the fallback
      window.location.href = `./order-tracking.html?orderNumber=${orderId}`;
    }
  }

  async reorder(orderId) {
    try {
      const order = this.orders.find(o => o._id === orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Add all items from the order to cart
      const { cartService } = await import('./services/cart-service.js');
      
      for (const item of order.items) {
        await cartService.addToCart(
          item.menu,
          item.quantity,
          item.size,
          item.addons || [],
          item.specialInstructions || ''
        );
      }

      this.showSuccess('Items added to cart successfully');
      
      // Optionally redirect to cart
      if (confirm('Items have been added to your cart. Would you like to view your cart?')) {
        window.location.href = './cart.html';
      }
    } catch (error) {
      console.error('Error reordering:', error);
      this.showError('Failed to reorder items');
    }
  }

  async cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      const response = await httpClient.put(`/api/shop/orders/${orderId}/cancel`);
      
      if (response.success) {
        this.showSuccess('Order cancelled successfully');
        await this.loadOrders(); // Refresh orders
      } else {
        throw new Error(response.message || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      this.showError('Failed to cancel order');
    }
  }

  showOrderTracking(order) {
    // Simple alert for now - you can implement a modal later
    const statusSteps = [
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'out-for-delivery',
      'delivered'
    ];

    const currentIndex = statusSteps.indexOf(order.deliveryStatus);
    const statusText = statusSteps.slice(0, currentIndex + 1)
      .map(status => this.formatStatus(status))
      .join(' → ');

    alert(`Order #${order.orderNumber || order._id.slice(-8)}\n\nStatus: ${statusText}\n\nEstimated delivery: ${order.estimatedDeliveryTime || 'TBD'}`);
  }

  renderEmptyState() {
    return `
      <div class="empty-orders">
        <ion-icon name="receipt-outline" style="font-size: 4rem; color: var(--davys-gray); margin-bottom: 1rem;"></ion-icon>
        <h2 class="title-2">No orders found</h2>
        <p class="body-1">You haven't placed any orders yet or no orders match your filters.</p>
        <a href="./menu.html" class="btn btn-primary" style="margin-top: 1rem;">
          Browse Menu
        </a>
      </div>
    `;
  }

  showLoading() {
    document.getElementById('ordersList').innerHTML = `
      <div class="loading">
        <p>Loading orders...</p>
      </div>
    `;
  }

  showSuccess(message) {
    // You can implement a toast notification system here
    alert(message);
  }

  showError(message) {
    document.getElementById('ordersList').innerHTML = `
      <div class="empty-orders">
        <ion-icon name="alert-circle-outline" style="font-size: 4rem; color: var(--red-orange-crayola); margin-bottom: 1rem;"></ion-icon>
        <h2 class="title-2">Error</h2>
        <p class="body-1">${message}</p>
        <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 1rem;">
          Try Again
        </button>
      </div>
    `;
  }
}

// Initialize orders page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.ordersPage = new OrdersPage();
});

// Export for use in other modules
export { OrdersPage };
