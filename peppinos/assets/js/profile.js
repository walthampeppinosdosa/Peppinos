import { isUserAuthenticated, getCurrentUser } from './auth.js';
import { httpClient } from './api.js';

class ProfilePage {
  constructor() {
    this.currentUser = null;
    this.currentSection = 'overview';
    this.init();
  }

  async init() {
    try {
      // Check if user is authenticated
      if (!isUserAuthenticated()) {
        window.location.href = './login.html';
        return;
      }

      // Get current user
      this.currentUser = getCurrentUser();
      
      // Load user profile data
      await this.loadProfile();
      
      // Set up event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Error initializing profile page:', error);
      this.showError('Failed to load profile');
    }
  }

  setupEventListeners() {
    // Profile navigation
    document.querySelectorAll('.profile-nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        if (section) {
          this.showSection(section);
        }
      });
    });

    // Profile form submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.updateProfile();
      });
    }

    // Password form submission
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
      passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.changePassword();
      });
    }

    // Avatar upload
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
      avatarInput.addEventListener('change', (e) => {
        this.handleAvatarUpload(e);
      });
    }
  }

  async loadProfile() {
    try {
      // Get user profile from API
      const response = await httpClient.get('/api/user/profile');
      
      if (response.success) {
        const user = response.data.user;
        this.populateProfile(user);
        await this.loadUserStats();
      } else {
        throw new Error(response.message || 'Failed to load profile');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Use current user data as fallback
      if (this.currentUser) {
        this.populateProfile(this.currentUser);
      }
    }
  }

  populateProfile(user) {
    // Update sidebar
    document.getElementById('profileName').textContent = user.name || 'User';
    document.getElementById('profileEmail').textContent = user.email || '';
    
    // Update avatar
    const avatar = document.getElementById('profileAvatar');
    if (user.profileImage) {
      avatar.src = user.profileImage;
    } else {
      // Use a default avatar or placeholder
      avatar.src = 'https://via.placeholder.com/120x120/f0f0f0/666666?text=User';
    }

    // Overview section
    document.getElementById('displayName').value = user.name || '';
    document.getElementById('displayEmail').value = user.email || '';
    document.getElementById('displayPhone').value = user.phone || '';
    document.getElementById('displayAddress').value = user.address || '';
    document.getElementById('memberSince').value = user.createdAt ? 
      new Date(user.createdAt).toLocaleDateString() : '';
    document.getElementById('lastLogin').value = user.lastLogin ? 
      new Date(user.lastLogin).toLocaleDateString() : '';

    // Edit form
    document.getElementById('editName').value = user.name || '';
    document.getElementById('editEmail').value = user.email || '';
    document.getElementById('editPhone').value = user.phone || '';
    document.getElementById('editAddress').value = user.address || '';
    document.getElementById('editCity').value = user.city || '';
    document.getElementById('editPostalCode').value = user.postalCode || '';
  }

  async loadUserStats() {
    try {
      const response = await httpClient.get('/api/user/stats');
      
      if (response.success) {
        const stats = response.data;
        document.getElementById('totalOrders').textContent = stats.totalOrders || 0;
        document.getElementById('totalSpent').textContent = `$${(stats.totalSpent || 0).toFixed(2)}`;
        document.getElementById('favoriteItems').textContent = stats.favoriteItems || 0;
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
      // Set default values
      document.getElementById('totalOrders').textContent = '0';
      document.getElementById('totalSpent').textContent = '$0.00';
      document.getElementById('favoriteItems').textContent = '0';
    }
  }

  showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.profile-section').forEach(section => {
      section.classList.remove('active');
    });

    // Remove active class from all nav links
    document.querySelectorAll('.profile-nav-link').forEach(link => {
      link.classList.remove('active');
    });

    // Show selected section
    const section = document.getElementById(sectionName);
    if (section) {
      section.classList.add('active');
    }

    // Add active class to selected nav link
    const navLink = document.querySelector(`[data-section="${sectionName}"]`);
    if (navLink) {
      navLink.classList.add('active');
    }

    this.currentSection = sectionName;
  }

  async updateProfile() {
    try {
      const formData = {
        name: document.getElementById('editName').value,
        phone: document.getElementById('editPhone').value,
        address: document.getElementById('editAddress').value,
        city: document.getElementById('editCity').value,
        postalCode: document.getElementById('editPostalCode').value
      };

      const response = await httpClient.put('/api/user/profile', formData);
      
      if (response.success) {
        this.showSuccess('Profile updated successfully');
        await this.loadProfile(); // Refresh profile data
        this.showSection('overview'); // Go back to overview
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      this.showError(error.message || 'Failed to update profile');
    }
  }

  async changePassword() {
    try {
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      // Validate passwords
      if (newPassword !== confirmPassword) {
        this.showError('New passwords do not match');
        return;
      }

      if (newPassword.length < 8) {
        this.showError('Password must be at least 8 characters long');
        return;
      }

      const response = await httpClient.put('/api/user/change-password', {
        currentPassword,
        newPassword
      });
      
      if (response.success) {
        this.showSuccess('Password changed successfully');
        this.cancelPasswordChange();
      } else {
        throw new Error(response.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      this.showError(error.message || 'Failed to change password');
    }
  }

  uploadAvatar() {
    document.getElementById('avatarInput').click();
  }

  async handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.showError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.showError('Image size must be less than 5MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await httpClient.post('/api/user/upload-avatar', formData);
      
      if (response.success) {
        this.showSuccess('Profile picture updated successfully');
        document.getElementById('profileAvatar').src = response.data.profileImage;
      } else {
        throw new Error(response.message || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      this.showError(error.message || 'Failed to upload profile picture');
    }
  }

  cancelEdit() {
    this.loadProfile(); // Reset form data
    this.showSection('overview');
  }

  cancelPasswordChange() {
    // Clear password form
    document.getElementById('passwordForm').reset();
    this.showSection('overview');
  }

  showSuccess(message) {
    // You can implement a toast notification system here
    alert(message);
  }

  showError(message) {
    // You can implement a toast notification system here
    alert('Error: ' + message);
  }
}

// Initialize profile page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.profilePage = new ProfilePage();
});

// Export for use in other modules
export { ProfilePage };
