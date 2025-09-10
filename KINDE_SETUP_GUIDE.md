# Kinde Auth Setup Guide for Peppino's Dosa (No SDK Implementation)

## 🔧 **Kinde Dashboard Configuration**

**Implementation**: Direct OAuth 2.0 with PKCE (No SDK Required)

### **1. Access Your Kinde Dashboard**
- **URL**: https://app.kinde.com/
- **Login** with your Kinde account
- **Navigate** to your "Peppinos" application

### **2. Required URLs to Add in Kinde Dashboard**

#### **Allowed Callback URLs** (Add these in Application Settings):
```
http://localhost:5500/peppinos/auth-callback.html
https://peppinos.com/auth-callback.html
https://www.peppinos.com/auth-callback.html
```

#### **Allowed Logout Redirect URLs**:
```
http://localhost:5500/peppinos/
http://localhost:5500/peppinos/index.html
https://peppinos.com
https://www.peppinos.com
```

#### **Allowed Origins** (CORS Settings):
```
http://localhost:5500
https://peppinos.com
https://www.peppinos.com
```

### **3. Application Settings in Kinde Dashboard**

1. **Go to**: Applications → Your Peppinos App → Settings
2. **Application Type**: Single Page Application (SPA)
3. **Authentication Method**: PKCE (Proof Key for Code Exchange)
4. **Token Endpoint Authentication**: None (for SPA)

### **4. Current Configuration Values**

Your application is already configured with these values:

```javascript
KINDE: {
  DOMAIN: 'https://peppinos.kinde.com',
  CLIENT_ID: 'd69b5d0c9b724b04a47b2a29a410ac25',
  REDIRECT_URI: 'http://localhost:5500/peppinos/auth-callback.html',
  LOGOUT_URI: 'http://localhost:5500/peppinos/',
  SCOPE: 'openid profile email'
}
```

## 🧪 **Testing Kinde Integration**

### **Step 1: Verify Kinde Dashboard Settings**
1. Login to https://app.kinde.com/
2. Go to Applications → Peppinos
3. Check that all URLs above are added
4. Ensure Application Type is set to "Single Page Application"

### **Step 2: Test Google Sign-in Flow**
1. Open: `http://localhost:5500/peppinos/login.html`
2. Click "Continue with Google"
3. Should redirect to Kinde Auth
4. Complete Google authentication
5. Should redirect back to `http://localhost:5500/peppinos/auth-callback.html`
6. Should sync user data and redirect to home page

### **Step 3: Test Registration Flow**
1. Open: `http://localhost:5500/peppinos/register.html`
2. Click "Sign up with Google"
3. Follow same flow as above

## 🔍 **Troubleshooting Common Issues**

### **Issue 1: "Invalid Redirect URI" Error**
**Solution**: Add the exact callback URL to Kinde dashboard:
- Go to Applications → Settings → Allowed callback URLs
- Add: `http://localhost:5500/peppinos/auth-callback.html`

### **Issue 2: CORS Errors**
**Solution**: Add origins to Kinde dashboard:
- Go to Applications → Settings → Allowed origins
- Add: `http://localhost:5500`

### **Issue 3: "Client ID not found" Error**
**Solution**: Verify client ID matches:
- Check Kinde dashboard → Applications → Details
- Ensure CLIENT_ID in config.js matches exactly

### **Issue 4: Authentication Callback Fails**
**Solution**: Check callback page exists and is accessible:
- Verify `http://localhost:5500/peppinos/auth-callback.html` loads
- Check browser console for JavaScript errors

## 🚀 **Production Setup**

When deploying to production, update these URLs:

### **Frontend Configuration** (config.js):
```javascript
// Production values
KINDE: {
  DOMAIN: 'https://peppinos.kinde.com',
  CLIENT_ID: 'd69b5d0c9b724b04a47b2a29a410ac25',
  REDIRECT_URI: 'https://peppinos.com/auth-callback.html',
  LOGOUT_URI: 'https://peppinos.com',
  SCOPE: 'openid profile email'
}
```

### **Kinde Dashboard** (Add production URLs):
```
https://peppinos.com/auth-callback.html
https://www.peppinos.com/auth-callback.html
https://peppinos.com
https://www.peppinos.com
```

## 📋 **Testing Checklist**

- [ ] Kinde dashboard URLs configured
- [ ] Local servers running (ports 3000 and 5000)
- [ ] Google sign-in redirects to Kinde
- [ ] Kinde redirects back to callback page
- [ ] User data syncs to backend database
- [ ] User is logged in after callback
- [ ] Navigation updates to show user menu
- [ ] Guest login works as alternative

## 🔗 **Quick Test URLs**

- **Login Page**: http://localhost:5500/peppinos/login.html
- **Register Page**: http://localhost:5500/peppinos/register.html
- **Test Page**: http://localhost:5500/peppinos/test-auth.html
- **Callback Page**: http://localhost:5500/peppinos/auth-callback.html

## 📞 **Support**

If you encounter issues:
1. Check browser console for errors
2. Verify all URLs are correctly added to Kinde dashboard
3. Ensure both servers (3000 and 5000) are running
4. Test with the comprehensive test page first

---

**Next Steps**: Once Kinde is configured, test the complete authentication flow and then we can integrate it with the main index.html page!



