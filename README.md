# ShadowNews

**ShadowNews** is a Hacker News-inspired social platform where users can submit, discuss, and vote on technology stories and content. Built with modern web technologies, it provides a fast, responsive experience for knowledge sharing and community discussion.

## 🏗️ Architecture Overview

ShadowNews follows a full-stack TypeScript architecture with clear separation between client and server:

### Backend (Server)
- **Express.js** - RESTful API server with session-based authentication
- **TypeScript** - Type safety throughout the backend
- **Drizzle ORM** - Database schema and query management
- **In-memory storage** - Simple storage implementation (easily replaceable with PostgreSQL)
- **Bcrypt** - Secure password hashing
- **Zod** - Runtime validation for API endpoints

### Frontend (Client)  
- **React 18** - Modern React with concurrent features
- **TypeScript** - Full type safety across the frontend
- **TanStack Query** - Server state management and caching
- **Wouter** - Lightweight client-side routing
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **React Hook Form** - Type-safe form handling

### Key Features
- 📝 **Story Submission** - Submit URLs or text posts
- 🗳️ **Voting System** - Upvote stories and comments  
- 💬 **Threaded Comments** - Nested discussion threads
- 👤 **User Profiles** - View user activity and karma
- 🎨 **Dark/Light Theme** - Responsive theme switching
- 📱 **Mobile Responsive** - Optimized for all devices
- 🔐 **Authentication** - Secure session-based auth

## 📁 Project Structure

```
ShadowNews-replitfinal/
├── server/                 # Backend Express.js application
│   ├── index.ts           # Server entry point and middleware setup
│   ├── routes.ts          # API route definitions and handlers
│   ├── storage.ts         # Storage layer abstraction and in-memory implementation
│   └── vite.ts            # Development/production server configuration
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   │   ├── auth/      # Authentication modals and forms
│   │   │   ├── layout/    # Header, footer, navigation
│   │   │   ├── story/     # Story cards, lists, submission
│   │   │   ├── common/    # Shared components
│   │   │   └── ui/        # Base UI components (Radix/Tailwind)
│   │   ├── pages/         # Route components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and configuration
│   │   ├── App.tsx        # Main application component
│   │   └── main.tsx       # React entry point
│   └── index.html         # HTML template
├── shared/                # Shared TypeScript types and schemas
│   └── schema.ts          # Database schema and validation
├── vite.config.ts         # Vite build configuration
├── tailwind.config.ts     # Tailwind CSS configuration
└── package.json           # Dependencies and scripts
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/DrmedPatrickSchur/ShadowNews-replitfinal.git
   cd ShadowNews-replitfinal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   
   The application will be available at `http://localhost:5000`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Run TypeScript type checking
- `npm run db:push` - Push database schema changes (when using external DB)

## 🔧 Configuration

### Environment Variables
- `SESSION_SECRET` - Secret key for session management (production)
- `NODE_ENV` - Environment mode (`development` or `production`)

### Database Setup
Currently uses in-memory storage for simplicity. To use PostgreSQL:

1. Install PostgreSQL and create a database
2. Set up connection string in environment
3. Replace `MemStorage` with Drizzle PostgreSQL adapter in `server/storage.ts`

## 🎯 Core Concepts

### Authentication
- Session-based authentication using Express sessions
- Secure password hashing with bcrypt
- Protected routes for authenticated actions
- Automatic session cleanup and validation

### Story Types
- **Story** - External links to interesting content
- **Ask** - Questions for the community
- **Show** - Showcase projects or achievements  
- **Job** - Job postings and opportunities

### Voting & Karma System
- Users can upvote stories and comments
- Karma accumulates from community votes on your content
- One vote per user per item
- Real-time optimistic updates for responsive UI

### Comment Threading
- Nested comment replies up to any depth
- Tree structure for organized discussions
- Real-time comment counts and threading

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [Hacker News](https://news.ycombinator.com/)
- Built with [React](https://reactjs.org/) and [Express.js](https://expressjs.com/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
