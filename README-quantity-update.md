# Menu Quantity Update Script

This script updates the quantity field of all menu items in the Peppinos backend to a specified value (default: 50).

## Features

- ✅ Authenticates as Super Admin using provided credentials
- ✅ Fetches all menu items from the backend
- ✅ Updates each menu item's quantity to the target value
- ✅ Preserves all other menu item properties
- ✅ Provides detailed progress logging
- ✅ Handles errors gracefully
- ✅ Skips items that already have the target quantity
- ✅ Rate limiting to avoid overwhelming the server

## Prerequisites

- Node.js installed on your system
- Access to the Peppinos backend API
- Super Admin credentials

## Configuration

The script is pre-configured with the following settings:

```javascript
const API_BASE_URL = 'https://peppinos-backend.vercel.app';
const SUPER_ADMIN_CREDENTIALS = {
  email: 'superadmin@peppinos.com',
  password: 'Superadmin1@peppinos.com'
};
const NEW_QUANTITY = 50;
```

## Installation

1. Ensure you're in the project directory:
   ```bash
   cd d:\peppinos-admin
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

## Usage

### Method 1: Direct execution
```bash
node update-menu-quantities.js
```

### Method 2: Using npm script (if added to package.json)
```bash
npm run update-quantities
```

## Script Output

The script provides detailed logging throughout the process:

```
🚀 Starting Menu Quantity Update Script
🌐 API Base URL: https://peppinos-backend.vercel.app
📧 Super Admin Email: superadmin@peppinos.com
🔢 Target Quantity: 50
==================================================
🔐 Logging in as Super Admin...
✅ Successfully logged in as Super Admin
👤 User: Super Admin (super-admin)
==================================================
📋 Fetching all menu items...
📊 Total menu items found: 25

🔄 Starting to update 25 menu items...
🎯 Target quantity: 50

📝 Processing 1/25: "Masala Dosa"
   Current quantity: 10
✅ Updated "Masala Dosa" - Quantity: 10 → 50

📝 Processing 2/25: "Rava Dosa"
   Current quantity: 50
   ⏭️ Skipping - already has quantity 50

...

🎉 Update process completed!
✅ Successfully updated: 24 items
❌ Failed to update: 0 items
📊 Total processed: 24 items
==================================================
🎯 Script execution completed successfully!
```

## Error Handling

The script includes comprehensive error handling:

- **Authentication failures**: Script will terminate if login fails
- **Network errors**: Individual item failures won't stop the entire process
- **API errors**: Detailed error messages are logged for debugging
- **Rate limiting**: Built-in delays between requests to avoid overwhelming the server

## Customization

### Changing the target quantity
Edit the `NEW_QUANTITY` constant in the script:
```javascript
const NEW_QUANTITY = 100; // Change to your desired quantity
```

### Changing credentials
Edit the `SUPER_ADMIN_CREDENTIALS` object:
```javascript
const SUPER_ADMIN_CREDENTIALS = {
  email: 'your-email@example.com',
  password: 'your-password'
};
```

### Changing the API URL
Edit the `API_BASE_URL` constant:
```javascript
const API_BASE_URL = 'https://your-api-url.com';
```

## Script Structure

The script is organized into several functions:

- `loginAsSuperAdmin()`: Handles authentication
- `getAllMenuItems()`: Fetches all menu items with pagination
- `updateMenuItemQuantity()`: Updates a single menu item
- `updateAllMenuQuantities()`: Orchestrates the bulk update process
- `main()`: Entry point that coordinates the entire process

## Security Notes

- The script uses the provided Super Admin credentials
- Authentication tokens are stored in memory only
- No sensitive data is logged to console
- The script terminates after completion

## Troubleshooting

### Common Issues

1. **Login Failed**: Verify the Super Admin credentials are correct
2. **Network Errors**: Check your internet connection and API availability
3. **Permission Denied**: Ensure the Super Admin account has the necessary permissions
4. **Rate Limiting**: The script includes built-in delays, but you can increase them if needed

### Debug Mode

For additional debugging, you can modify the script to log more details by adding console.log statements in the error handling sections.

## Support

If you encounter any issues with the script, check:
1. Network connectivity to the API
2. Super Admin credentials validity
3. API endpoint availability
4. Node.js version compatibility

## License

This script is part of the Peppinos project and follows the same licensing terms.
