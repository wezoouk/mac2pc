# Replit.md - File Transfer Application

## Overview

This is a modern web application for peer-to-peer file transfer and messaging between devices on the same network or room. The application uses a full-stack TypeScript architecture with React frontend, Express backend, WebSocket communication, and WebRTC for direct peer-to-peer connections.

## User Preferences

Preferred communication style: Simple, everyday language.
Device naming: Fun random names with animals and adjectives (e.g., "wombat-mac", "sleepy-otter-laptop").

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: React hooks with TanStack Query for server state
- **Routing**: Wouter (lightweight router)
- **Build Tool**: Vite with custom configuration

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Style**: RESTful endpoints with WebSocket support
- **Real-time Communication**: WebSocket server for signaling
- **File Transfer**: WebRTC data channels for peer-to-peer transfers

## Key Components

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Defined in `shared/schema.ts` with three main tables:
  - `devices`: Device registration and status
  - `rooms`: Room management for device grouping
  - `transfers`: Transfer history and metadata
- **Storage**: Dual implementation with in-memory storage for development and PostgreSQL for production

### Communication Layer
- **WebSocket**: Real-time signaling for device discovery and WebRTC negotiation
- **WebRTC**: Direct peer-to-peer data channels for file transfers
- **REST API**: Device management and transfer history endpoints

### Frontend Components
- **Device Discovery**: Network and room-based device detection
- **File Transfer**: Drag-and-drop file selection with progress tracking
- **Message Panel**: Quick text and link sharing
- **Transfer History**: Historical transfer records
- **Modal System**: Transfer requests and progress dialogs

## Data Flow

1. **Device Registration**: Devices register with the server via WebSocket connection
2. **Device Discovery**: Server broadcasts available devices to connected clients
3. **Transfer Initiation**: User selects files/message and target device
4. **WebRTC Negotiation**: Signaling server facilitates peer connection setup
5. **Direct Transfer**: Files transferred directly between devices via WebRTC
6. **Progress Tracking**: Real-time progress updates through data channels
7. **History Storage**: Completed transfers recorded in database

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **@radix-ui/react-***: Accessible UI component primitives
- **@tanstack/react-query**: Server state management
- **drizzle-orm**: Type-safe database ORM
- **express**: Web server framework
- **ws**: WebSocket implementation
- **nanoid**: Unique ID generation

### Development Dependencies
- **vite**: Build tool and development server
- **tailwindcss**: Utility-first CSS framework
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast JavaScript bundler

## Deployment Strategy

### Development Mode
- **Frontend**: Vite dev server with HMR
- **Backend**: Express server with automatic TypeScript compilation
- **Database**: In-memory storage for quick development
- **WebSocket**: Integrated with HTTP server

### Production Build
- **Frontend**: Static build output to `dist/public`
- **Backend**: Bundled with esbuild to `dist/index.js`
- **Database**: PostgreSQL with connection pooling
- **Deployment**: Single Node.js process serving both frontend and API

### Configuration
- **Environment Variables**: `DATABASE_URL` for PostgreSQL connection
- **Build Scripts**: Separate build and start commands
- **Static Serving**: Express serves frontend assets in production

The application is designed to work seamlessly in both development and production environments, with the server automatically detecting the mode and configuring itself accordingly.

## Recent Changes (July 10, 2025)

### Device Type Recognition and Visual Indicators
- **Device type icons**: Added automatic detection of Mac (🍎), PC (💻), iPhone (📱), iPad, Chromebook, Surface devices
- **Visual device identification**: Icons appear in radar view, device list, and throughout the interface
- **Transfer direction indicators**: Recent activity shows "Sent" (blue ↑) and "Received" (green ↓) badges
- **Progress tracking**: Real-time progress bars during file transfers with speed calculations and time estimates
- **Connection status**: Green/red indicator showing device connection status in header

### Privacy-First Network Discovery (IN PROGRESS)
- **IP-Based Detection**: Implemented network detection based on external IP addresses
- **Local Network Logic**: First device to connect sets the "local network" baseline IP
- **Room-Only Visibility**: Devices only appear when explicitly joining the same room name
- **Privacy Protection**: Devices from different external IPs are marked as "remote"
- **Issue**: Currently debugging local device detection - devices may not appear as expected

### Message and File Transfer System
- **Messages auto-appear**: Removed accept/decline modal for messages, they now show instantly with toast notifications
- **File transfers working**: Base64 encoding through WebSocket for files up to 1.3MB+ successfully tested
- **Smart notifications**: Custom toast notifications that auto-fade after 5 seconds and can be clicked to dismiss
- **Clear history functionality**: Transfer history can now be cleared with trash button

### Device Naming System
- **Random fun names**: Replaced generic "Windows PC-1234" with creative names like "wombat-mac", "sleepy-otter-laptop"
- **Name generator**: 32 adjectives + 30 animals + 16 device types creating diverse combinations
- **Format variety**: Names can be "animal-device" or "adjective-animal-device" format
- **Demo mode names**: Updated test devices to also use fun random names

### Multi-Device Testing
- **Multi-tab simulation**: Each browser tab acts as a separate device with unique random name
- **Real-time messaging**: Instant message delivery between tabs with visual notifications
- **File transfer**: Drag-and-drop files between simulated devices
- **Room-based connections**: Cross-network sharing using room names (optional feature)