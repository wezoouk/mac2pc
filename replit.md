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

## Recent Changes (July 13, 2025)

### Google AdSense Compliance Updates (NEW - July 13, 2025)
- **Complete SEO Overhaul**: Added comprehensive meta tags, Open Graph, and Twitter Card support
- **Mac2PC Branding**: Updated site title and branding from ShareLink to Mac2PC throughout
- **Legal Compliance**: Added Terms & Conditions and Privacy Policy pages with proper legal language
- **Content Quality**: Enhanced site description with feature highlights and value proposition
- **Footer Integration**: Added proper footer with legal page links and copyright information
- **Page Structure**: Improved semantic HTML structure with proper headings and descriptions
- **Mobile Responsive**: All new content works seamlessly across desktop and mobile devices

### QR Code Pairing System Rebuild (CRITICAL FIX - July 13, 2025)
- **Complete Code Reconstruction**: Fully rebuilt QR code scanning and room joining system from scratch
- **Simplified Detection**: Removed complex multi-event detection, now uses simple URL parameter checking
- **Fixed Variable Order**: Resolved React hook order issue causing "uninitialized variable" errors
- **Streamlined Flow**: Direct processPairCode() function for immediate room joining
- **WebSocket Integration**: Proper handling of pending pair codes when WebSocket connects
- **Error Resolution**: Fixed TypeScript compilation errors and component crashes
- **Clean Architecture**: Removed duplicate WebSocket hooks and cleaned up code structure

### Radar View Circle Fix & Shadow Enhancement (NEW - July 13, 2025)
- **Perfect Circle Aspect Ratio**: Fixed radar view distortion when browser window is resized
- **Aspect Ratio Enforcement**: Added `aspectRatio: '1/1'` CSS property to maintain perfect circle
- **Responsive Circle**: Radar remains circular at all screen sizes and browser window dimensions
- **Container Constraints**: Fixed width/height constraints to prevent oval distortion
- **Enhanced Drop Shadow**: Added multi-layered shadow with blue glow effect to prevent cut-off
- **Shadow Container**: Added 30px padding around radar and increased outer padding to p-16/p-20
- **Center Device Fix**: Corrected center device positioning to account for shadow padding

### User-Editable Device Names (NEW - July 12, 2025)
- **Call Sign Customization**: Users can now change their device name/call sign from Device Settings
- **Real-time Updates**: Name changes instantly update across all connected devices
- **Inline Editing**: Clean inline edit interface with Save/Cancel buttons
- **Keyboard Shortcuts**: Press Enter to save, Escape to cancel name editing
- **Broadcast Updates**: Device name changes are immediately broadcast to all devices in the network/room
- **Toast Notifications**: Confirmation messages when device name is successfully updated
- **Input Validation**: Trims whitespace and prevents empty names
- **UI Enhancement**: Device Settings section now shows "Your Call Sign" for better user understanding

### Comprehensive Admin System (MAJOR UPDATE - July 12, 2025)
- **Complete Admin Overhaul**: Built comprehensive admin system with 4 main sections
- **User Management**: Full CRUD operations for admin users with username/email/password management
- **Password Reset System**: Token-based password reset with secure email verification (displays token for demo)
- **Global Ad Controls**: Master switch to enable/disable all ads across the application
- **Enhanced Security**: Multi-layered authentication with password complexity and token expiry
- **Admin Interface**: Clean tabbed interface with User Management, Google Ads, App Settings, and Password Reset
- **API Endpoints**: Complete REST API for admin operations (/api/admin/users, /api/admin/toggle-ads, /api/admin/request-reset)
- **Login Credentials**: davwez@gmail.com / we5ton99!! for admin access (in-memory database resets on server restart)

### Device Pairing System (FIXED - July 12, 2025)
- **Room-Based Pairing**: Fixed critical issue where devices couldn't see each other in pairing rooms
- **WebSocket Broadcasting**: Enhanced server-side device broadcasting with detailed logging
- **Simultaneous Room Joining**: Both devices now successfully join the same pairing room and see each other
- **QR Code Generation**: Complete QR code flow works - generate, scan, both devices visible in radar
- **Cross-Network Sharing**: Devices from different networks can now successfully pair and transfer files
- **Server Logging**: Added comprehensive logging to track room device broadcasting and client connections
- **Timing Issues Resolved**: Fixed race conditions in room joining that prevented device visibility
- **Connection Lines**: Added animated connection lines from center device to selected devices in radar view
- **Trust Device Integration**: Prominent "Trust Device" button appears when selecting devices from radar

### Major UI Overhaul - Large Circular Radar (NEW - July 11, 2025)
- **800px Circular Radar**: Redesigned radar component with prominent 800px diameter display on desktop
- **Responsive Design**: Radar scales to 600px on tablets and 320px on mobile devices
- **Enhanced Animations**: Replaced horizontal sweep with radiating pulse circles in multiple colors
- **Better Contrast**: Lightened background and enhanced inner ring visibility with blue-300 borders
- **Visual Effects**: Multiple concentric pulsing circles creating dynamic radar effect
- **Performance**: Optimized window resize handling and device positioning calculations

### Dark Mode & Theme System (NEW - July 11, 2025)
- **Theme Provider**: Complete dark mode implementation with system preference detection
- **Theme Toggle**: Sun/moon icon toggle in header for instant theme switching
- **CSS Variables**: Proper HSL color definitions for light and dark themes
- **LocalStorage**: Theme preference persistence across sessions
- **Responsive Theming**: All components adapt to theme changes

### Sound Notification System (FIXED - July 11, 2025)
- **Audio Context**: Web Audio API implementation with proper user interaction activation
- **Sound Effects**: Different tones for messages (800Hz→600Hz), file transfers, errors, and connections
- **Volume Control**: Toggle button in header with volume/mute icons that properly activates audio context
- **User Preference**: Sound settings saved to localStorage
- **Test Sounds**: Audio feedback when enabling sound notifications
- **Browser Compatibility**: Fixed audio context suspension issue requiring user interaction

### Enhanced Trusted Device Management (NEW - July 11, 2025)
- **Trust Device Button**: Added "Trust Device" button when selecting devices from radar
- **Device Identity**: Clear explanation of Device ID (unique security identifier) vs Device Name (fun random name)
- **Auto-Accept**: Trusted devices can automatically accept transfers from each other
- **One-Click Trust**: Easy device trusting directly from the main interface
- **Device Information**: Shows device identity details in Device Settings section

## Recent Changes (July 10, 2025)

### Device Type Recognition and Visual Indicators
- **Device type icons**: Added automatic detection of Mac (🍎), PC (💻), iPhone (📱), iPad, Chromebook, Surface devices
- **Visual device identification**: Icons appear in radar view, device list, and throughout the interface
- **Transfer direction indicators**: Recent activity shows "Sent" (blue ↑) and "Received" (green ↓) badges
- **Progress tracking**: Real-time progress bars during file transfers with speed calculations and time estimates
- **Connection status**: Green/red indicator showing device connection status in header

### Privacy-First Network Discovery (WORKING)
- **IP-Based Detection**: Implemented network detection based on external IP addresses
- **Local Network Logic**: First device to connect sets the "local network" baseline IP
- **Room-Only Visibility**: Devices only appear when explicitly joining the same room name
- **Privacy Protection**: Devices from different external IPs are marked as "remote"
- **Leave room functionality**: Fixed - devices properly see local network after leaving rooms

### Password-Protected Rooms (NEW - July 10, 2025)
- **Password protection**: Rooms can now be protected with optional passwords
- **UI implementation**: Added password field in room join form
- **Backend validation**: Server validates passwords before allowing room access
- **Error handling**: Clear error messages for incorrect passwords
- **Automatic room creation**: First user sets password when creating new room

### Google Ads Monetization (NEW - July 10, 2025)
- **Ad integration**: Google AdSense banner ads implemented
- **Toggle functionality**: Ads can be turned on/off via eye icon in Network Stats card
- **Banner placement**: Ads appear between main content and transfer history
- **Responsive design**: Ads automatically adjust to screen size
- **Privacy-friendly**: Ads only load when explicitly enabled by user
- **Admin settings**: Ad placement management working from admin panel

### Message and File Transfer System (ENHANCED - July 10, 2025)
- **Messages auto-appear**: Removed accept/decline modal for messages, they now show instantly with toast notifications
- **File acceptance required**: Files now require receiver acceptance before download - shows modal with file details
- **Multiple file transfers**: Fixed issue where only small files were sent - now all files use WebSocket fallback
- **File transfers working**: Base64 encoding through WebSocket for files of any size successfully tested
- **Unique transfer IDs**: Fixed React key warnings by using unique IDs for each transfer
- **Smart notifications**: Custom toast notifications that auto-fade after 5 seconds and can be clicked to dismiss
- **Clear history functionality**: Transfer history can now be cleared with trash button
- **WebSocket fallback**: Direct message/file routing when WebRTC unavailable
- **Queue system**: Multiple files properly queued and processed sequentially
- **Download All feature**: Added bulk download functionality for multiple files
- **Queue indicators**: Shows file count and "Download All" button in transfer modal

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