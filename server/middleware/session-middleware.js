const crypto = require('crypto');

/**
 * Generate a unique session ID
 */
const generateSessionId = () => {
  return `guest_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
};

/**
 * Middleware to ensure session ID exists for guest operations
 * Uses client-provided session ID or generates a new one
 */
const ensureGuestSession = (req, res, next) => {
  // Get session ID from header, query param, or generate new one
  const sessionId = req.headers['x-guest-session-id'] ||
                   req.query.sessionId ||
                   req.body.sessionId ||
                   generateSessionId();

  req.guestSessionId = sessionId;

  // Set session ID in response header for client to store
  res.setHeader('X-Guest-Session-Id', sessionId);

  next();
};

/**
 * Middleware to get guest session ID from request
 */
const getGuestSessionId = (req, res, next) => {
  // Get session ID from various sources
  req.guestSessionId = req.headers['x-guest-session-id'] ||
                      req.query.sessionId ||
                      req.body.sessionId ||
                      req.params.sessionId ||
                      null;
  next();
};

/**
 * Middleware for optional guest session (doesn't require session to exist)
 */
const optionalGuestSession = (req, res, next) => {
  // Try to get session ID but don't require it
  req.guestSessionId = req.headers['x-guest-session-id'] ||
                      req.query.sessionId ||
                      req.body.sessionId ||
                      null;
  next();
};

/**
 * Middleware to clean up expired guest users and carts
 * This should be called periodically (e.g., via cron job)
 */
const cleanupExpiredGuests = async (req, res, next) => {
  try {
    const { cleanupOldGuestUsers } = require('../services/guest-service');

    // Clean up old guest users and their carts (older than 7 days)
    const result = await cleanupOldGuestUsers();

    next();
  } catch (error) {
    console.error('Guest cleanup error:', error);
    // Don't fail the request if cleanup fails
    next();
  }
};

/**
 * Middleware to track guest cart activity (simplified)
 */
const trackGuestActivity = (req, res, next) => {
  // Just continue - activity tracking is handled in GuestCart model
  next();
};

/**
 * Utility function to destroy guest session and associated data
 */
const destroyGuestSession = async (sessionId) => {
  try {
    const { deleteGuestUser } = require('../services/guest-service');

    // Delete guest user and associated cart
    return await deleteGuestUser(sessionId);
  } catch (error) {
    console.error('Error destroying guest session:', error);
    return false;
  }
};

/**
 * Validate session ID format
 */
const validateSessionId = (sessionId) => {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }

  // Check if it's a valid guest session ID format
  return sessionId.startsWith('guest_') || sessionId.startsWith('temp_');
};

/**
 * Get session statistics for admin dashboard
 */
const getSessionStats = async () => {
  try {
    const { getGuestUserStats } = require('../services/guest-service');

    return await getGuestUserStats();
  } catch (error) {
    console.error('Error getting session stats:', error);
    return {
      totalGuestUsers: 0,
      activeToday: 0,
      activeThisWeek: 0
    };
  }
};

module.exports = {
  generateSessionId,
  ensureGuestSession,
  getGuestSessionId,
  optionalGuestSession,
  cleanupExpiredGuests,
  trackGuestActivity,
  destroyGuestSession,
  validateSessionId,
  getSessionStats
};
