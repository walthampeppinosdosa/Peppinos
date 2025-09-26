# Database Migrations

This folder contains database migration scripts for the Peppinos application.

## Running Migrations

### Add Signature Dish Field Migration

This migration adds the `isSignatureDish` field to all existing menu items that don't have it.

**To run the migration:**

1. Make sure your MongoDB connection string is set in your environment variables or update the connection string in the migration file.

2. From the server directory, run:
```bash
node migrations/add-signature-dish-field.js
```

**What this migration does:**
- Finds all menu items that don't have the `isSignatureDish` field
- Adds the field with a default value of `false`
- Verifies that all menu items now have the field

**When to run:**
- Run this once after deploying the signature dish feature
- Safe to run multiple times (it only updates items that don't have the field)

## Environment Variables

Make sure you have the following environment variable set:
- `MONGODB_URI` - Your MongoDB connection string

If not set, it will default to `mongodb://localhost:27017/peppinos`
