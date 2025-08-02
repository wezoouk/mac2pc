# Replit.md - File Transfer Application

## Overview
This is a modern web application for peer-to-peer file transfer and messaging between devices on the same network or within a designated room. The application leverages a full-stack TypeScript architecture, enabling direct peer-to-peer connections via WebRTC. Its core purpose is to facilitate seamless, real-time communication and data exchange between devices.

## User Preferences
Preferred communication style: Simple, everyday language.
Device naming: Fun random names with animals and adjectives (e.g., "wombat-mac", "sleepy-otter-laptop").

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: React hooks with TanStack Query for server state
- **Routing**: Wouter
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Style**: RESTful endpoints with WebSocket support
- **Real-time Communication**: WebSocket server for signaling
- **File Transfer**: WebRTC data channels for peer-to-peer transfers

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: `devices`, `rooms`, and `transfers` tables.
- **Storage**: In-memory for development, PostgreSQL for production.

### Communication Layer
- **WebSocket**: Real-time signaling for device discovery and WebRTC negotiation.
- **WebRTC**: Direct peer-to-peer data channels for file transfers.
- **REST API**: Device management and transfer history.

### Key Features and Design Decisions
- **Device Discovery**: Network and room-based device detection.
- **File Transfer**: Drag-and-drop with progress tracking, queuing, and WebRTC fallback.
- **Messaging**: Instant text and link sharing with toast notifications.
- **Transfer History**: Records of past transfers.
- **UI/UX**: Large circular radar view with responsive design, dynamic animations, and enhanced shadows. Dark mode and comprehensive sound notification system with browser compatibility.
- **Device Naming**: User-editable, standardized "adjective-animal-devicetype" format with automatic device type recognition and visual indicators (e.g., 🍎, 💻, 📱).
- **Pairing System**: QR code-based room joining and device pairing.
- **Privacy**: IP-based network detection with room-only visibility for privacy.
- **Security**: Password-protected rooms, secure admin system with user management and password reset.
- **Monetization**: Integrated Google AdSense with toggle functionality and admin control.
- **Deployment**: Vite for frontend, bundled Express with esbuild for backend, supporting both development and production environments.

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **@radix-ui/react-***: UI component primitives
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
```