/**
 * Address Manager for Checkout Page
 * Handles address CRUD operations and location services
 */

import * as addressService from './address-service.js';
import * as locationService from './location-service.js';
import { showToast } from './ui.js';

export class AddressManager {
  constructor() {
    this.addresses = [];
    this.selectedAddressId = null;
    this.isEditMode = false;
    this.currentEditId = null;

    this.initializeElements();
    this.bindEvents();
    this.loadAddresses();
    this.loadStates();
  }

  initializeElements() {
    // Main elements
    this.addressSelection = document.getElementById('addressSelection');
    this.selectedAddressSelect = document.getElementById('selectedAddress');
    this.selectedAddressDisplay = document.getElementById('selectedAddressDisplay');
    this.addNewAddressBtn = document.getElementById('addNewAddressBtn');
    
    // Modal elements
    this.addressModal = document.getElementById('addressModal');
    this.addressForm = document.getElementById('addressForm');
    this.addressModalTitle = document.getElementById('addressModalTitle');
    this.closeAddressModal = document.getElementById('closeAddressModal');
    this.cancelAddressBtn = document.getElementById('cancelAddressBtn');
    this.saveAddressBtn = document.getElementById('saveAddressBtn');
    
    // Form fields
    this.addressIdField = document.getElementById('addressId');
    this.addressTypeField = document.getElementById('addressType');
    this.addressStreetField = document.getElementById('addressStreet');
    this.addressLandmarkField = document.getElementById('addressLandmark');
    this.addressStateField = document.getElementById('addressState');
    this.addressCityField = document.getElementById('addressCity');
    this.addressPincodeField = document.getElementById('addressPincode');
    this.isDefaultAddressField = document.getElementById('isDefaultAddress');
    
    // Display elements
    this.editAddressBtn = document.getElementById('editAddressBtn');
    this.deleteAddressBtn = document.getElementById('deleteAddressBtn');
  }

  bindEvents() {
    // Address selection
    this.selectedAddressSelect.addEventListener('change', (e) => {
      this.handleAddressSelection(e.target.value);
    });

    // Modal controls
    this.addNewAddressBtn.addEventListener('click', () => this.openAddressModal());
    this.closeAddressModal.addEventListener('click', () => this.closeModal());
    this.cancelAddressBtn.addEventListener('click', () => this.closeModal());

    // Form submission
    this.addressForm.addEventListener('submit', (e) => this.handleFormSubmit(e));

    // Address actions
    this.editAddressBtn.addEventListener('click', () => this.editSelectedAddress());
    this.deleteAddressBtn.addEventListener('click', () => this.deleteSelectedAddress());

    // State change for city loading
    this.addressStateField.addEventListener('change', (e) => {
      const stateCode = e.target.value;
      this.loadCitiesForState(stateCode);
    });

    // Modal backdrop click
    this.addressModal.addEventListener('click', (e) => {
      if (e.target === this.addressModal) {
        this.closeModal();
      }
    });
  }

  async loadAddresses() {
    try {
      this.addresses = await addressService.getAllAddresses();
      this.populateAddressSelect();
      this.autoSelectAddress();
    } catch (error) {
      console.error('Error loading addresses:', error);
      showToast('Failed to load addresses', 'error');
    }
  }

  async loadStates() {
    try {
      const states = await locationService.getStatesList();
      this.populateStateSelect(states);
    } catch (error) {
      console.error('Error loading states:', error);
      showToast('Failed to load states', 'error');
    }
  }

  populateAddressSelect() {
    // Clear existing options except the first one
    this.selectedAddressSelect.innerHTML = '<option value="">Choose an address...</option>';
    
    this.addresses.forEach(address => {
      const option = document.createElement('option');
      option.value = address._id;
      option.textContent = `${address.type.toUpperCase()} - ${address.street}, ${address.city}`;
      if (address.isDefault) {
        option.textContent += ' (Default)';
      }
      this.selectedAddressSelect.appendChild(option);
    });
  }

  populateStateSelect(states) {
    this.addressStateField.innerHTML = '<option value="">Select state...</option>';
    states.forEach(state => {
      const option = document.createElement('option');
      option.value = state.value;
      option.textContent = state.label;
      this.addressStateField.appendChild(option);
    });
  }

  autoSelectAddress() {
    if (this.addresses.length === 1) {
      // Auto-select if only one address
      this.selectedAddressSelect.value = this.addresses[0]._id;
      this.handleAddressSelection(this.addresses[0]._id);
    } else if (this.addresses.length > 1) {
      // Select default address if multiple addresses
      const defaultAddress = this.addresses.find(addr => addr.isDefault);
      if (defaultAddress) {
        this.selectedAddressSelect.value = defaultAddress._id;
        this.handleAddressSelection(defaultAddress._id);
      }
    }
  }

  handleAddressSelection(addressId) {
    this.selectedAddressId = addressId;
    
    if (addressId) {
      const address = this.addresses.find(addr => addr._id === addressId);
      if (address) {
        this.displaySelectedAddress(address);
        this.selectedAddressDisplay.style.display = 'block';
        
        // Clear any validation errors
        const errorElement = document.getElementById('selectedAddressError');
        if (errorElement) {
          errorElement.style.display = 'none';
        }
      }
    } else {
      this.selectedAddressDisplay.style.display = 'none';
    }
  }

  displaySelectedAddress(address) {
    document.getElementById('displayAddressType').textContent = address.type.toUpperCase();
    document.getElementById('displayAddressName').textContent = address.name;
    document.getElementById('displayAddressPhone').textContent = address.phoneNumber;
    document.getElementById('displayAddressStreet').textContent = address.street;
    
    let locationText = `${address.city}, ${address.state} ${address.pincode}`;
    if (address.landmark) {
      locationText = `Near ${address.landmark}, ${locationText}`;
    }
    document.getElementById('displayAddressLocation').textContent = locationText;
  }

  openAddressModal(address = null) {
    console.log('🏠 Opening address modal', { address, modal: this.addressModal });
    this.isEditMode = !!address;
    this.currentEditId = address?._id || null;

    this.addressModalTitle.textContent = this.isEditMode ? 'Edit Address' : 'Add New Address';

    if (this.isEditMode && address) {
      this.populateFormWithAddress(address);
    } else {
      this.addressForm.reset();
      this.addressIdField.value = '';
    }

    this.clearFormErrors();
    this.addressModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    console.log('🏠 Modal should be visible now');
  }

  closeModal() {
    this.addressModal.style.display = 'none';
    document.body.style.overflow = '';
    this.addressForm.reset();
    this.clearFormErrors();
    this.hideCitySuggestions();
    this.isEditMode = false;
    this.currentEditId = null;
  }

  populateFormWithAddress(address) {
    this.addressIdField.value = address._id;
    this.addressTypeField.value = address.type;
    this.addressStreetField.value = address.street;
    this.addressLandmarkField.value = address.landmark || '';
    this.addressStateField.value = address.state;
    this.addressPincodeField.value = address.pincode;
    this.isDefaultAddressField.checked = address.isDefault;

    // Load cities for the state and then set the city value
    this.loadCitiesForState(address.state).then(() => {
      this.addressCityField.value = address.city;
    });
  }

  async loadCitiesForState(stateCode) {
    if (!stateCode) {
      this.addressCityField.innerHTML = '<option value="">Select city...</option>';
      return;
    }

    try {
      // Show loading message
      this.addressCityField.innerHTML = '<option value="">🔄 Loading cities...</option>';
      this.addressCityField.disabled = true;

      const cities = await locationService.getCitiesByState(stateCode);

      // Clear and populate dropdown
      this.addressCityField.innerHTML = '<option value="">Select city...</option>';
      cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city.value;
        option.textContent = city.label;
        this.addressCityField.appendChild(option);
      });

      this.addressCityField.disabled = false;
    } catch (error) {
      console.error('Error loading cities:', error);
      this.addressCityField.innerHTML = '<option value="">❌ Error loading cities</option>';
      this.addressCityField.disabled = false;
    }
  }

  validateForm() {
    this.clearFormErrors();
    let isValid = true;

    const formData = new FormData(this.addressForm);
    const addressData = {
      type: formData.get('type'),
      street: formData.get('street'),
      landmark: formData.get('landmark'),
      city: formData.get('city'),
      state: formData.get('state'),
      pincode: formData.get('pincode'),
      isDefault: formData.get('isDefault') === 'on'
    };

    const validation = addressService.validateAddressData(addressData);

    if (!validation.isValid) {
      Object.keys(validation.errors).forEach(field => {
        const errorElement = document.getElementById(`address${field.charAt(0).toUpperCase() + field.slice(1)}Error`);
        if (errorElement) {
          errorElement.textContent = validation.errors[field];
          errorElement.style.display = 'block';
          isValid = false;
        }
      });
    }

    return isValid;
  }

  async handleFormSubmit(e) {
    e.preventDefault();

    if (!this.validateForm()) {
      return;
    }

    try {
      this.saveAddressBtn.disabled = true;
      this.saveAddressBtn.textContent = 'Saving...';

      const formData = new FormData(this.addressForm);
      const addressData = {
        type: formData.get('type'),
        street: formData.get('street'),
        landmark: formData.get('landmark') || undefined,
        city: formData.get('city'),
        state: formData.get('state'),
        pincode: formData.get('pincode'),
        isDefault: formData.get('isDefault') === 'on'
      };

      // Get user data from auth (assuming it's available globally)
      const userData = JSON.parse(localStorage.getItem('user') || '{}');

      let savedAddress;
      if (this.isEditMode && this.currentEditId) {
        savedAddress = await addressService.updateAddress(this.currentEditId, addressData, userData);
        showToast('Address updated successfully', 'success');
      } else {
        savedAddress = await addressService.createAddress(addressData, userData);
        showToast('Address added successfully', 'success');
      }

      this.closeModal();
      await this.loadAddresses();

      // Auto-select the newly created/updated address
      if (savedAddress) {
        this.selectedAddressSelect.value = savedAddress._id;
        this.handleAddressSelection(savedAddress._id);
      }

    } catch (error) {
      console.error('Error saving address:', error);
      showToast(error.message || 'Failed to save address', 'error');
    } finally {
      this.saveAddressBtn.disabled = false;
      this.saveAddressBtn.textContent = 'Save Address';
    }
  }

  clearFormErrors() {
    const errorElements = this.addressForm.querySelectorAll('.error-message');
    errorElements.forEach(element => {
      element.style.display = 'none';
      element.textContent = '';
    });
  }

  // Public methods for checkout integration
  getSelectedAddressId() {
    return this.selectedAddressId;
  }

  validateAddressSelection() {
    if (!this.selectedAddressId) {
      const errorElement = document.getElementById('selectedAddressError');
      if (errorElement) {
        errorElement.textContent = 'Address required';
        errorElement.style.display = 'block';
      }
      return false;
    }
    return true;
  }

  editSelectedAddress() {
    if (this.selectedAddressId) {
      const address = this.addresses.find(addr => addr._id === this.selectedAddressId);
      if (address) {
        this.openAddressModal(address);
      }
    }
  }

  async deleteSelectedAddress() {
    if (!this.selectedAddressId) return;
    
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }
    
    try {
      await addressService.deleteAddress(this.selectedAddressId);
      showToast('Address deleted successfully', 'success');
      await this.loadAddresses();
    } catch (error) {
      console.error('Error deleting address:', error);
      showToast('Failed to delete address', 'error');
    }
  }
}
