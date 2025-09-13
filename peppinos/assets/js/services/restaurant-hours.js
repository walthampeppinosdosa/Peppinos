/**
 * Restaurant Hours Service
 * Handles business hours validation and scheduling functionality
 */

class RestaurantHoursService {
  constructor() {
    // Restaurant hours configuration
    this.businessHours = {
      monday: { open: '11:30', close: '22:00', isOpen: true },
      tuesday: { open: '11:30', close: '22:00', isOpen: true },
      wednesday: { open: '11:30', close: '22:00', isOpen: true },
      thursday: { open: '11:30', close: '22:00', isOpen: true },
      friday: { open: '11:30', close: '22:30', isOpen: true },
      saturday: { open: '11:30', close: '22:30', isOpen: true },
      sunday: { open: '11:30', close: '22:00', isOpen: true }
    };

    // Lunch buffet hours (Mon-Fri only)
    this.buffetHours = {
      monday: { open: '11:30', close: '15:00' },
      tuesday: { open: '11:30', close: '15:00' },
      wednesday: { open: '11:30', close: '15:00' },
      thursday: { open: '11:30', close: '15:00' },
      friday: { open: '11:30', close: '15:00' }
    };

    // Special hours or closures
    this.specialHours = {
      // Format: 'YYYY-MM-DD': { open: 'HH:MM', close: 'HH:MM', isOpen: false }
      // Example: '2024-12-25': { isOpen: false, reason: 'Christmas Day' }
    };

    // Preparation time in minutes
    this.preparationTime = {
      pickup: 20,    // 20 minutes for pickup
      delivery: 45   // 45 minutes for delivery
    };
  }

  /**
   * Check if restaurant is currently open
   */
  isCurrentlyOpen() {
    const now = new Date();
    const dayName = this.getDayName(now);
    const currentTime = this.formatTime(now);
    const dateString = this.formatDate(now);

    // Check for special hours first
    if (this.specialHours[dateString]) {
      return this.specialHours[dateString].isOpen;
    }

    // Check regular business hours
    const hours = this.businessHours[dayName];
    if (!hours || !hours.isOpen) {
      return false;
    }

    return currentTime >= hours.open && currentTime <= hours.close;
  }

  /**
   * Get next opening time
   */
  getNextOpeningTime() {
    const now = new Date();
    let checkDate = new Date(now);

    // Check next 7 days
    for (let i = 0; i < 7; i++) {
      const dayName = this.getDayName(checkDate);
      const dateString = this.formatDate(checkDate);
      
      // Check special hours
      if (this.specialHours[dateString]) {
        if (this.specialHours[dateString].isOpen) {
          return {
            date: new Date(checkDate),
            time: this.specialHours[dateString].open,
            isToday: i === 0
          };
        }
      } else {
        // Check regular hours
        const hours = this.businessHours[dayName];
        if (hours && hours.isOpen) {
          // If it's today and we're before opening time
          if (i === 0 && this.formatTime(now) < hours.open) {
            return {
              date: new Date(checkDate),
              time: hours.open,
              isToday: true
            };
          }
          // If it's a future day
          if (i > 0) {
            return {
              date: new Date(checkDate),
              time: hours.open,
              isToday: false
            };
          }
        }
      }

      checkDate.setDate(checkDate.getDate() + 1);
    }

    return null; // No opening time found in next 7 days
  }

  /**
   * Get available time slots for scheduling
   */
  getAvailableTimeSlots(date, orderType = 'pickup') {
    const dayName = this.getDayName(date);
    const dateString = this.formatDate(date);
    const now = new Date();
    const isToday = this.formatDate(now) === dateString;

    // Check if restaurant is open on this date
    let hours;
    if (this.specialHours[dateString]) {
      if (!this.specialHours[dateString].isOpen) {
        return []; // Closed on this date
      }
      hours = this.specialHours[dateString];
    } else {
      hours = this.businessHours[dayName];
      if (!hours || !hours.isOpen) {
        return []; // Closed on this day
      }
    }

    // Generate time slots (every 15 minutes)
    const slots = [];
    const openTime = this.parseTime(hours.open);
    const closeTime = this.parseTime(hours.close);
    const prepTime = this.preparationTime[orderType];

    // Start from opening time or current time + prep time (whichever is later)
    let startTime;
    if (isToday) {
      const currentPlusPrep = new Date(now.getTime() + prepTime * 60000);
      const openDateTime = new Date(date);
      openDateTime.setHours(openTime.hours, openTime.minutes, 0, 0);
      startTime = currentPlusPrep > openDateTime ? currentPlusPrep : openDateTime;
    } else {
      startTime = new Date(date);
      startTime.setHours(openTime.hours, openTime.minutes, 0, 0);
    }

    // End time is 30 minutes before closing to allow for preparation
    const endTime = new Date(date);
    endTime.setHours(closeTime.hours, closeTime.minutes - 30, 0, 0);

    // Generate 15-minute intervals
    const current = new Date(startTime);
    while (current <= endTime) {
      slots.push({
        time: this.formatTime(current),
        display: this.formatTimeDisplay(current),
        datetime: new Date(current)
      });
      current.setMinutes(current.getMinutes() + 15);
    }

    return slots;
  }

  /**
   * Validate if a scheduled time is available
   */
  isTimeSlotAvailable(date, time, orderType = 'pickup') {
    const availableSlots = this.getAvailableTimeSlots(date, orderType);
    return availableSlots.some(slot => slot.time === time);
  }

  /**
   * Get minimum order time (current time + preparation time)
   */
  getMinimumOrderTime(orderType = 'pickup') {
    const now = new Date();
    const prepTime = this.preparationTime[orderType];
    const minTime = new Date(now.getTime() + prepTime * 60000);
    return minTime;
  }

  /**
   * Get restaurant status message
   */
  getStatusMessage() {
    if (this.isCurrentlyOpen()) {
      return {
        isOpen: true,
        message: 'Open Now',
        nextChange: this.getClosingTime()
      };
    } else {
      const nextOpening = this.getNextOpeningTime();
      if (nextOpening) {
        const message = nextOpening.isToday 
          ? `Closed ⋅ Opens ${this.formatTimeDisplay(this.parseTimeToDate(nextOpening.time))}`
          : `Closed ⋅ Opens ${this.formatDayDisplay(nextOpening.date)} ${this.formatTimeDisplay(this.parseTimeToDate(nextOpening.time))}`;
        
        return {
          isOpen: false,
          message: message,
          nextOpening: nextOpening
        };
      } else {
        return {
          isOpen: false,
          message: 'Temporarily Closed',
          nextOpening: null
        };
      }
    }
  }

  /**
   * Get closing time for today
   */
  getClosingTime() {
    const now = new Date();
    const dayName = this.getDayName(now);
    const dateString = this.formatDate(now);

    if (this.specialHours[dateString]) {
      return this.specialHours[dateString].close;
    }

    const hours = this.businessHours[dayName];
    return hours ? hours.close : null;
  }

  // Utility methods
  getDayName(date) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  formatTime(date) {
    return date.toTimeString().slice(0, 5);
  }

  formatTimeDisplay(date) {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  formatDayDisplay(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours, minutes };
  }

  parseTimeToDate(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /**
   * Add special hours (holidays, closures, etc.)
   */
  addSpecialHours(date, hours) {
    this.specialHours[date] = hours;
  }

  /**
   * Remove special hours
   */
  removeSpecialHours(date) {
    delete this.specialHours[date];
  }

  /**
   * Update business hours
   */
  updateBusinessHours(day, hours) {
    if (this.businessHours[day]) {
      this.businessHours[day] = { ...this.businessHours[day], ...hours };
    }
  }

  /**
   * Update preparation times
   */
  updatePreparationTime(orderType, minutes) {
    this.preparationTime[orderType] = minutes;
  }
}

// Create and export singleton instance
export const restaurantHours = new RestaurantHoursService();

// Make it globally accessible
window.restaurantHours = restaurantHours;

export default restaurantHours;
