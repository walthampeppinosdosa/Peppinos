# Peppino's Restaurant Backend API

A scalable backend for Peppino's Restaurant, supporting both Admin and Client applications with RESTful APIs for product management, orders, payments, users, and analytics.

## Tech Stack

- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **File Storage**: Cloudinary (for product & category images)
- **Authentication**: JWT (email/password) + Kinde (Google OAuth)
- **Payments**: Stripe
- **Email Service**: Nodemailer
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Cloudinary account
- Stripe account
- Kinde account (for OAuth)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your actual values

5. Start the development server:
   ```bash
   npm run dev
   ```

### Environment Variables

See `.env.example` for all required environment variables.

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/google` - Google OAuth login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile

### Admin Routes
- `POST /api/admin/products` - Create product
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product
- `POST /api/admin/categories` - Create category
- `PUT /api/admin/categories/:id` - Update category
- `DELETE /api/admin/categories/:id` - Delete category
- `GET /api/admin/orders` - Get all orders
- `PUT /api/admin/orders/:id/status` - Update order status
- `GET /api/admin/users` - Get all users

### Shop Routes
- `GET /api/shop/products` - Get all products
- `GET /api/shop/products/:id` - Get product details
- `GET /api/shop/categories` - Get all categories
- `POST /api/shop/cart` - Add to cart
- `GET /api/shop/cart/:userId` - Get user cart
- `POST /api/shop/orders` - Create order
- `POST /api/shop/payment/checkout` - Stripe checkout

## Role-Based Access Control

- **Super Admin**: View-only access to all data
- **Veg Admin**: Manage only vegetarian products and categories
- **Non-Veg Admin**: Manage only non-vegetarian products and categories
- **Customer**: Access to shop features only

## Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Input validation and sanitization
- MongoDB injection prevention
- JWT token authentication
- Password hashing with bcrypt

## Deployment

The application is configured for deployment on Vercel. See `vercel.json` for configuration details.

## Development Status

This is the initial infrastructure setup. Individual features will be implemented in subsequent tasks:

1. ✅ Backend Infrastructure Setup
2. ⏳ Authentication System Implementation
3. ⏳ Database Models Creation
4. ⏳ Role-Based Access Control Middleware
5. ⏳ Product Management System
6. ⏳ Category Management System
7. ⏳ Order Management & Stripe Integration
8. ⏳ Cart & Address Management
9. ⏳ Reviews & User Management
10. ⏳ Analytics & Reporting System
11. ⏳ Newsletter & Communication Features
12. ⏳ Security & Production Deployment
13. ⏳ Frontend Integration & Testing
