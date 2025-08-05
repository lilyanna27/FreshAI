# Fresh AI - Smart Fridge Management App

## Overview

Fresh AI is a modern mobile-first web application designed to help users manage their food inventory and reduce food waste. The app allows users to track food items in their fridge, monitor expiration dates, discover recipes based on available ingredients, and receive notifications about items that are expiring soon.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **UI Library**: Radix UI components with shadcn/ui
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack React Query for server state
- **Build Tool**: Vite for fast development and building
- **Mobile-First Design**: Responsive layout optimized for mobile devices

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful API endpoints
- **Runtime**: Node.js with ES modules
- **Development**: Hot reload with tsx

### Database Layer
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL (live database configured)
- **Schema Management**: Drizzle Kit for migrations
- **Connection**: @neondatabase/serverless for serverless PostgreSQL
- **Storage**: DatabaseStorage implementation using live PostgreSQL database

## Key Components

### Data Models
- **Users**: Basic user management with username/password
- **Food Items**: Core inventory items with name, quantity, expiration date, category, and optional images
- **Recipes**: Recipe management with ingredients, instructions, and cooking time

### Core Features
1. **Food Inventory Management**
   - Add, edit, and delete food items
   - Track quantities and expiration dates
   - Categorize items for better organization
   - Upload/link images for visual identification

2. **Expiration Tracking**
   - Smart status indicators (fresh, expiring soon, expired)
   - Color-coded visual system
   - Dedicated expiring items view

3. **Recipe Discovery**
   - Recipe suggestions based on available ingredients
   - Save favorite recipes
   - Recipe search and filtering

4. **Mobile-Optimized UI**
   - Bottom navigation for easy thumb access
   - Floating action button for quick item addition
   - Swipe-friendly interactions

### UI Components
- **Design System**: Custom color palette with apple-green primary and rose-ebony text
- **Layout**: Mobile-first responsive design with max-width container
- **Navigation**: Bottom tab navigation with header and floating action button
- **Modals**: Slide-up modals for adding items and viewing details
- **Cards**: Food item cards with status indicators and images

## Data Flow

### Client-Server Communication
1. **API Requests**: RESTful endpoints under `/api/` prefix
2. **Query Management**: TanStack React Query handles caching, background updates, and error states
3. **Form Handling**: React Hook Form with Zod validation
4. **Real-time Updates**: Optimistic updates with query invalidation

### State Management
- **Server State**: Managed by React Query with automatic caching
- **UI State**: Local React state for modals, forms, and interactions
- **Persistent State**: No localStorage usage currently implemented

### Error Handling
- **API Errors**: Centralized error handling with toast notifications
- **Form Validation**: Zod schemas for type-safe validation
- **Network Errors**: React Query retry mechanisms

## External Dependencies

### Core Dependencies
- **UI Framework**: React, Wouter for routing
- **Data Fetching**: TanStack React Query
- **Database**: Drizzle ORM with PostgreSQL driver
- **UI Components**: Radix UI primitives with shadcn/ui styling
- **Styling**: Tailwind CSS with PostCSS
- **Validation**: Zod for schema validation
- **Date Handling**: date-fns for date manipulation
- **Icons**: Lucide React for consistent iconography

### Development Tools
- **Build**: Vite with React plugin
- **TypeScript**: Full TypeScript support with strict mode
- **Linting**: Built-in TypeScript checking
- **Database Tools**: Drizzle Kit for schema management

## Deployment Strategy

### Build Process
1. **Frontend Build**: Vite builds React app to `dist/public`
2. **Backend Build**: esbuild bundles server code to `dist/index.js`
3. **Database**: Drizzle push for schema deployment

### Environment Configuration
- **Database**: `DATABASE_URL` environment variable required
- **Development**: NODE_ENV=development for dev server
- **Production**: NODE_ENV=production for optimized builds

### Hosting Requirements
- **Node.js**: ES modules support required
- **PostgreSQL**: Compatible database (Neon Database recommended)
- **Static Assets**: Frontend files served from `dist/public`

### Development Workflow
- **Dev Server**: `npm run dev` starts both frontend and backend with hot reload
- **Database Sync**: `npm run db:push` applies schema changes
- **Type Checking**: `npm run check` validates TypeScript

## Recent Changes: Latest modifications with dates

### July 30, 2025
- **Database Integration**: Added PostgreSQL database with DatabaseStorage implementation
- **FreshAI Document Implementation**: Enhanced app based on project requirements
  - Added comprehensive food shelf life database with 20+ common foods
  - Storage tips and automatic categorization for food items
  - Enhanced database schema for sustainability tracking
  - Auto-suggest expiration dates based on food type
  - Receipt scanning page with mock AI processing workflow
  - Sustainability metrics page tracking environmental impact
- **Modern UI Redesign**: Completely redesigned interface inspired by modern food apps
  - Organic rounded corners (rounded-3xl) throughout the design
  - Gradient backgrounds with warm orange/yellow tones for featured sections
  - Modern "Good evening!" greeting with location indicator
  - Enhanced search bar with prominent green action button
  - Food category circles with colorful gradients and emoji icons
  - "My meal plans" section with recipe cards and ratings
  - "Recipe of the week" featured section with gradient background
  - Redesigned food item cards with larger rounded corners and better spacing
- **Enhanced Navigation**: 
  - Updated bottom navigation: Home, Fridge, Scan, Impact
  - Receipt scanning and sustainability tracking pages
  - Emoji icons for inactive states with green active background
  - Glassmorphism effect with backdrop blur
- **Sustainability Features**:
  - Progress tracking for waste reduction and money saved
  - Environmental impact calculations (CO2, water saved)
  - Monthly goals and progress indicators
  - Sustainability tips and best practices

### August 1, 2025
- **Design System Overhaul**: Complete redesign to clean, minimalist aesthetic
  - Changed header text to personalized "Hi, Anika!" greeting with tagline "Smart food management for modern kitchens"
  - Applied solid dark green background (#1e3a2e) to all page headers and bottom navigation
  - Removed all gradients for flat, solid color design throughout
  - Updated all 9 pages (Home, AI Agent, Fresh Items, Profile, Fridge, Recipes, Receipt Scan, Sustainability, Expiring, Expiring Items) with consistent dark green headers
  - Set Times New Roman font as primary typeface across entire application
  - All icons converted to white line silhouettes for consistent visual hierarchy
  - Maintained cream white background (hsl 45, 20%, 97%) for main content areas
- **Component Updates**:
  - Updated floating action button to dark green background with white plus icon
  - Changed "Recent Activity" to "Past Recipes" section with recipe-focused content
  - Added "Start Creating" placeholder card for empty recipe states with chef hat icon
  - Consistent rounded design elements with proper JSX structure across all pages
  - Updated bottom navigation with 5 items: Home, Fridge, Scan (center), AI Chat, Profile
  - Applied consistent dark green background and white text/icons to bottom navigation
  - Center scan button features dark green circular background for emphasis

### August 5, 2025
- **Advanced Receipt Scanning Implementation**: Complete OCR functionality using tesseract.js
  - Added real OCR processing with tesseract.js for extracting text from receipt images
  - Created comprehensive food database with 40+ food items including fruits, vegetables, proteins, dairy, and grains
  - Built intelligent error correction system to fix common OCR reading mistakes (e.g., 'banna' → 'banana')
  - Implemented filtering system to extract only food items from receipts while ignoring prices, store information, and non-food items
  - Automatic expiration date calculation based on food type and shelf life data
  - Smart freshness indicators (fresh, warning, expired) with visual status icons
  - Toast notifications for user feedback during scanning and saving processes
  - Test mode feature for debugging and demonstrating functionality
  - Camera capture and file upload options for receipt images
  - Full integration with existing food database and fridge management system

The application follows a clean separation of concerns with a shared schema between frontend and backend, enabling type-safe development across the full stack. The mobile-first approach ensures optimal user experience on smartphones while maintaining desktop compatibility.