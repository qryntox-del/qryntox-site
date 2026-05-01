# QRYNTOX E-Commerce Website

## Overview
QRYNTOX is a premium, sleek, and minimalist e-commerce web application featuring a dark and grey tone design. It focuses on a modern aesthetic with smooth animations and high-end product presentation.

## Tech Stack
- React 18
- TailwindCSS (Custom Dark Theme Configuration)
- Lucide Icons
- Pure HTML/JS (No Build Tool)

## Project Structure
- `index.html`: Entry point and Tailwind theme configuration.
- `app.js`: Main React application wrapping layout components.
- `products.html` & `products-app.js`: All products listing page.
- `about.html` & `about-app.js`: About us page.
- `terms.html` & `terms-app.js`: Terms & Conditions and Founder Bio page.
- `admin.html` & `admin-app.js`: Private admin dashboard.
- `firebase-admin.html` & `firebase-customer-orders.html`: Firebase v10 implementation interfaces for orders and tracking.
- `profile.html` & `profile-app.js`: Customer Profile page.
- `track.html` & `track-app.js`: Dedicated Track Order timeline page.
- `utils/firebase-config.js`: Centralized configuration for Firebase V10 initialization.
- `components/`: Modular UI components (Header, Hero, FeaturedProducts, ProductsPage, AboutPage, Footer, etc.).
- `trickle/assets/`: JSON files tracking public Unsplash images used.
- `trickle/rules/`: Development rules and guidelines.

## Features
- Custom dark/grey tone UI with glassmorphism effects.
- Animated hero section with staggered entrance.
- Hover-lift and grayscale reveal effects on product cards.
- **Razorpay Integration**: Live payment gateway integration using Razorpay checkout.js with automated order syncing (`Paid - Live` status).
- **Meesho-style Supplier Panel**: A professional, light-themed admin dashboard (`admin.html`) featuring:
  - **Supplier Analytics**: Real-time cards displaying Today's Sales, Pending Orders, and Low Stock Alerts.
  - **Smart Product Manager**: SKU tracking, Active/Draft status toggles, stock alert badges (<5 units), secure product deletion with confirmation modals, and a Multi-Image Upload component (simulated base64 storage).
  - **Order Processing Logic**: Order status dropdowns, manual delivery date overrides, and customer-visible delivery notes.
  - **Cancellation System**: Admin alert badge and red text highlights for customer-cancelled orders, displaying specific cancellation reasons. Includes real-time listener popups and audio alerts for new orders and cancellations.
  - **Data Maintenance**: Direct permanent deletion tool for orders directly inside the Order Management table with confirmation modals.
  - **Customer Inquiries**: Dedicated inbox interface for reviewing and replying to user submissions.
- **Customer Profile**: Customers can view their order history, manage shipping details, and cancel pending orders directly. Cancelled orders are moved to a separate history section.
- Fully responsive navigation and layout.
