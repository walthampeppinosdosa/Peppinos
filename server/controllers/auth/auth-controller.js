const User = require('../../models/User');
const { generateTokens, verifyRefreshToken, setTokenCookies, clearTokenCookies } = require('../../helpers/jwt-utils');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendPasswordResetEmail } = require('../../helpers/send-email');

// For Node.js versions < 18, you might need to install node-fetch
// For Node.js 18+, fetch is built-in
const fetch = globalThis.fetch || require('node-fetch');

/**
 * Register new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, phoneNumber, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      phoneNumber,
      role: role || 'customer' // Default role is customer, but allow override
    });

    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token to user
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toJSON(),
        accessToken
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    console.log('Login attempt for:', email);

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');



    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check password with detailed debugging
    console.log('🔍 Password Debug Info:');
    console.log('- Input password:', password);
    console.log('- Input password length:', password.length);
    console.log('- User has password:', !!user.password);
    console.log('- Stored hash length:', user.password ? user.password.length : 'No password');
    console.log('- Hash starts with:', user.password ? user.password.substring(0, 10) : 'No password');

    const isPasswordValid = await user.comparePassword(password);
    console.log('- comparePassword result:', isPasswordValid);

    // Also try direct bcrypt comparison for debugging
    const directBcryptResult = await bcrypt.compare(password, user.password);
    console.log('- Direct bcrypt result:', directBcryptResult);

    if (!isPasswordValid) {
      // Development helper: If password is "DevReset123", set a new known password
      if (process.env.NODE_ENV === 'development' && password === 'DevReset123') {
        console.log('🔧 Development: Setting test password for user');
        const testPassword = 'TestPass123';
        const newHashedPassword = await bcrypt.hash(testPassword, 12);

        // Update password directly in database to avoid pre-save middleware double-hashing
        await User.updateOne(
          { _id: user._id },
          {
            password: newHashedPassword,
            lastPasswordChange: new Date()
          }
        );

        // Refresh user object with new password
        user.password = newHashedPassword;
        console.log('✅ Test password set to: TestPass123');

        // Now validate with the test password
        console.log('🔍 Testing new password:');
        console.log('- Test password:', testPassword);
        console.log('- New stored hash:', user.password);
        console.log('- New hash length:', user.password.length);

        // Try direct bcrypt comparison first
        const directTestResult = await bcrypt.compare(testPassword, user.password);
        console.log('- Direct bcrypt test result:', directTestResult);

        const testPasswordValid = await user.comparePassword(testPassword);
        console.log('- comparePassword test result:', testPasswordValid);

        if (testPasswordValid || directTestResult) {
          console.log('✅ Test password validation successful');
          // Continue with login using the test password
        } else {
          console.log('❌ Test password validation failed');

          // Let's try a completely fresh hash to test bcrypt
          const freshHash = await bcrypt.hash(testPassword, 12);
          const freshTest = await bcrypt.compare(testPassword, freshHash);
          console.log('🧪 Fresh hash test:', freshTest);
          console.log('🧪 Fresh hash:', freshHash);

          return res.status(401).json({
            success: false,
            message: 'Development password reset failed'
          });
        }
      } else {
        console.log('❌ Login failed: Password validation failed');
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token and update last login
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        accessToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Google OAuth login
 * POST /api/auth/google
 */
const googleLogin = async (req, res) => {
  try {
    const { googleId, email, name, profileImage } = req.body;

    if (!googleId || !email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Google ID, email, and name are required'
      });
    }

    // Find existing user by email or googleId
    let user = await User.findByEmailOrGoogleId(email, googleId);

    if (user) {
      // Update existing user with Google info if not already set
      if (!user.googleId) {
        user.googleId = googleId;
      }
      if (profileImage && !user.profileImage) {
        user.profileImage = profileImage;
      }
      user.lastLogin = new Date();
      await user.save();
    } else {
      // Create new user
      user = new User({
        name,
        email,
        googleId,
        profileImage,
        role: 'customer',
        isEmailVerified: true, // Google accounts are pre-verified
        lastLogin: new Date()
      });
      await user.save();
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Google login successful',
      data: {
        user: user.toJSON(),
        accessToken
      }
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({
      success: false,
      message: 'Google login failed',
      error: error.message
    });
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (userId) {
      // Clear refresh token from database
      await User.findByIdAndUpdate(userId, {
        $unset: { refreshToken: 1 }
      });
    }

    // Clear cookies
    clearTokenCookies(res);

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

/**
 * Get user profile
 * GET /api/auth/profile
 */
const getProfile = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res) => {
  try {
    let refreshToken = req.body.refreshToken;

    // Get refresh token from cookies if not in body
    if (!refreshToken && req.cookies) {
      refreshToken = req.cookies.refreshToken;
    }

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user and check if refresh token matches
    const user = await User.findById(decoded.userId).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    // Update refresh token in database
    user.refreshToken = tokens.refreshToken;
    await user.save();

    // Set new cookies
    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

/**
 * Exchange Kinde authorization code for tokens (Regular Web Application)
 * POST /api/auth/kinde-token-exchange
 */
const kindeTokenExchange = async (req, res) => {
  try {
    const { code, redirect_uri } = req.body;

    // Validate required fields
    if (!code || !redirect_uri) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: code and redirect_uri are required'
      });
    }



    // Kinde configuration from environment
    const kindeConfig = {
      domain: process.env.KINDE_DOMAIN,
      clientId: process.env.KINDE_CLIENT_ID,
      clientSecret: process.env.KINDE_CLIENT_SECRET,
      tokenUrl: `${process.env.KINDE_DOMAIN}/oauth2/token`
    };

    // Validate Kinde configuration
    if (!kindeConfig.domain || !kindeConfig.clientId || !kindeConfig.clientSecret) {
      console.error('❌ Missing Kinde configuration in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

    // Prepare token exchange request
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: kindeConfig.clientId,
      client_secret: kindeConfig.clientSecret,
      code: code,
      redirect_uri: redirect_uri
    });



    // Make token exchange request to Kinde
    const response = await fetch(kindeConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenParams.toString()
    });



    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Kinde token exchange failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      return res.status(response.status).json({
        success: false,
        message: `Kinde token exchange failed: ${errorData}`
      });
    }

    const tokens = await response.json();


    if (tokens.error) {
      console.error('❌ Kinde token response contains error:', tokens);
      return res.status(400).json({
        success: false,
        message: `Kinde token error: ${tokens.error_description || tokens.error}`
      });
    }

    // Get user info from Kinde using access token (correct endpoint from OpenID config)
    const userInfoEndpoint = `${kindeConfig.domain}/oauth2/v2/user_profile`;

    const userInfoResponse = await fetch(userInfoEndpoint, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json'
      }
    });



    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error('❌ Failed to get user info from Kinde:', {
        status: userInfoResponse.status,
        statusText: userInfoResponse.statusText,
        error: errorText
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to get user information from Kinde',
        details: errorText
      });
    }

    const userInfo = await userInfoResponse.json();


    // Sync user with local database
    try {
      const syncResult = await syncKindeUser(userInfo);

      res.status(200).json({
        success: true,
        message: 'Token exchange successful',
        tokens: {
          access_token: tokens.access_token,
          id_token: tokens.id_token,
          refresh_token: tokens.refresh_token,
          expires_in: tokens.expires_in
        },
        user: syncResult.user,
        localToken: syncResult.accessToken
      });
    } catch (syncError) {
      console.error('❌ Error syncing user with local database:', syncError);
      return res.status(500).json({
        success: false,
        message: 'User sync failed',
        details: syncError.message
      });
    }

  } catch (error) {
    console.error('❌ Error in Kinde token exchange:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during token exchange'
    });
  }
};

/**
 * Helper function to sync Kinde user with local database
 */
const syncKindeUser = async (kindeUserInfo) => {


  // Extract data from actual Kinde response structure (OpenID Connect standard)
  const {
    id: kindeId,                    // Kinde ID
    sub,                            // Subject (same as id)
    email,                          // Email address (standard OpenID field)
    given_name,                     // First name (standard OpenID field)
    family_name,                    // Last name (standard OpenID field)
    name,                           // Full name if provided
    picture,                        // Profile picture URL
    email_verified,                 // Email verification status
    preferred_username: username    // Username if provided
  } = kindeUserInfo;


  // Build user name with fallbacks based on actual Kinde response
  let userName = '';
  if (name && name.trim()) {
    userName = name.trim();
  } else if (given_name || family_name) {
    userName = `${given_name || ''} ${family_name || ''}`.trim();
  } else if (username && username.trim()) {
    userName = username.trim();
  } else if (email) {
    // Use email prefix as fallback name
    userName = email.split('@')[0];
  } else {
    userName = 'User'; // Ultimate fallback
  }


  // Validate required fields
  if (!kindeId) {
    throw new Error('Kinde ID is missing from user info response');
  }
  if (!email) {
    throw new Error('Email is missing from user info response');
  }

  // Check if user already exists by email or kindeId
  let user = await User.findOne({
    $or: [
      { email: email },
      { kindeId: kindeId }
    ]
  });

  if (user) {
    // Update existing user with Kinde data
    user.kindeId = kindeId;
    user.email = email; // Update email in case it changed
    user.name = userName;
    user.profileImage = picture || user.profileImage;
    user.isEmailVerified = email_verified !== undefined ? email_verified : user.isEmailVerified;
    user.lastLogin = new Date();

    // If user was created via regular registration but now using Kinde
    if (!user.authProvider || user.authProvider !== 'kinde') {
      user.authProvider = 'kinde';
    }

    await user.save();
  } else {
    // Create new user from Kinde data
    user = new User({
      kindeId,
      email,
      name: userName,
      profileImage: picture || null,
      isEmailVerified: email_verified || false,
      authProvider: 'kinde',
      role: 'customer',
      isActive: true,
      lastLogin: new Date()
    });

    await user.save();
  }

  // Generate tokens for the user
  const { accessToken, refreshToken } = generateTokens(user);

  // Save refresh token to user
  user.refreshToken = refreshToken;
  await user.save();

  return {
    user: {
      id: user._id,
      kindeId: user.kindeId,
      email: user.email,
      name: user.name,
      role: user.role,
      profileImage: user.profileImage,
      isEmailVerified: user.isEmailVerified,
      authProvider: user.authProvider
    },
    accessToken,
    refreshToken
  };
};

/**
 * Sync Kinde user with local database (Legacy endpoint)
 * POST /api/auth/kinde-sync
 */
const kindeSync = async (req, res) => {
  try {
    const { kindeId, email, name, profileImage, isEmailVerified } = req.body;

    // Validate required fields
    if (!kindeId || !email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: kindeId, email, and name are required'
      });
    }

    // Check if user already exists by email or kindeId
    let user = await User.findOne({
      $or: [
        { email: email },
        { kindeId: kindeId }
      ]
    });

    if (user) {
      // Update existing user with Kinde data
      user.kindeId = kindeId;
      user.name = name;
      user.profileImage = profileImage;
      user.isEmailVerified = isEmailVerified;
      user.lastLogin = new Date();

      // If user was created via regular registration but now using Kinde
      if (!user.kindeId) {
        user.authProvider = 'kinde';
      }

      await user.save();
    } else {
      // Create new user from Kinde data
      user = new User({
        kindeId,
        email,
        name,
        profileImage,
        isEmailVerified,
        authProvider: 'kinde',
        role: 'customer',
        isActive: true,
        lastLogin: new Date()
      });

      await user.save();
    }

    // Generate tokens for the user
    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    // Set token cookies
    setTokenCookies(res, accessToken, refreshToken);

    // Return user data and tokens
    res.status(200).json({
      success: true,
      message: 'User synced successfully',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profileImage: user.profileImage,
          isEmailVerified: user.isEmailVerified,
          authProvider: user.authProvider
        }
      }
    });

  } catch (error) {
    console.error('Kinde sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during Kinde sync'
    });
  }
};

/**
 * Forgot Password
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send password reset email
    try {
      await sendPasswordResetEmail(email, resetToken, user.name || user.username);
    } catch (emailError) {
      // Continue with success response even if email fails
      // This prevents revealing whether the email exists
    }

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
      // Remove this in production - only for testing
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

/**
 * Reset Password
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Find user with the token
    const user = await User.findOne({
      _id: decoded.userId,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    console.log('🔄 Password Reset Debug:');
    console.log('- New password:', newPassword);
    console.log('- New password length:', newPassword.length);
    console.log('- New hash length:', hashedPassword.length);
    console.log('- New hash starts with:', hashedPassword.substring(0, 10));

    // Update password directly in database to avoid pre-save middleware double-hashing
    await User.updateOne(
      { _id: user._id },
      {
        password: hashedPassword,
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined,
        lastPasswordChange: new Date()
      }
    );

    console.log('✅ Password reset completed for user:', user.email);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

/**
 * Verify reset token
 * POST /api/auth/verify-reset-token
 */
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is required'
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user with the token
    const user = await User.findOne({
      _id: decoded.userId,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Reset token is valid'
    });

  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid or expired reset token'
    });
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  logout,
  getProfile,
  refreshToken,
  kindeTokenExchange,
  kindeSync,
  forgotPassword,
  resetPassword,
  verifyResetToken
};
