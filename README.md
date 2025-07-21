# EdClarity.ai

An AI-powered educational platform that revolutionizes learning through intelligent AI agents, real-time doubt-solving sessions, and personalized learning experiences. Built with Next.js, TypeScript, and cutting-edge state-of-the-art AI technologies.

## 🚀 Current Features

### Authentication & User Management
- **Secure Authentication** - Email/password and social login (Google, Microsoft, GitHub, Apple)
- **Responsive Auth UI** - Beautiful, mobile-optimized authentication forms
- **Session Management** - Persistent user sessions with secure logout
- **Form Validation** - Zod schema validation with comprehensive error handling

### Landing Page & User Acquisition
- **Coming Soon Experience** - Animated typing effect with engaging user interface
- **Email Collection System** - Users can subscribe to get notified when the platform launches
- **Duplicate Prevention** - Smart email validation prevents duplicate submissions
- **Responsive Design** - Optimized for all devices (iPhone SE, Samsung S8+, Desktop)

### Backend Infrastructure
- **Notification API** - RESTful API to manage email subscriptions
- **Database Integration** - PostgreSQL with Drizzle ORM for type-safe queries
- **Error Handling** - Proper HTTP status codes and user-friendly error messages

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - Latest React framework with App Router
- **React 19** - Cutting-edge React features
- **TypeScript** - Type-safe JavaScript development
- **Tailwind CSS v4** - Latest utility-first CSS framework
- **Shadcn/ui** - Modern component library
- **React Hook Form** - Performant form state management
- **Zod** - Schema validation and type inference

### Backend & Database
- **Next.js API Routes** - Serverless API endpoints
- **Drizzle ORM** - Type-safe database queries
- **PostgreSQL (Neon)** - Cloud-native database
- **Auth.js (Better Auth)** - Modern authentication framework

### Development & Quality
- **ESLint** - Code linting and quality enforcement
- **Prettier** - Consistent code formatting
- **TypeScript** - Static type checking

## 🔮 Future Integrations (Roadmap)

### 🤖 AI-Powered Learning Features
- **Custom AI Agents** - Specialized AI tutors for different subjects
- **Real-time Doubt Solving** - Instant AI assistance during study sessions
- **Intelligent Q&A** - Context-aware AI that understands learning progress
- **OpenAI Integration** - Advanced language models for educational content

### 📞 Real-time Communication
- **Stream Video SDK** - High-quality video calls for tutoring sessions
- **Stream Chat SDK** - Real-time messaging between students and AI agents
- **Live Sessions** - Interactive learning sessions with AI tutors
- **Screen Sharing** - Collaborative problem-solving capabilities

### 📝 Learning Analytics & Content
- **Session Summaries** - AI-generated summaries of learning sessions
- **Transcript Generation** - Automatic transcription of educational content
- **Meeting History** - Complete record of all learning sessions
- **Progress Tracking** - Detailed analytics on student learning progress

### 🔍 Advanced Search & Discovery
- **Transcript Search** - Search through session transcripts for specific topics
- **Content Discovery** - AI-recommended learning materials
- **Knowledge Base** - Searchable repository of solved problems

### 💳 Monetization & Subscriptions
- **Razorpay Subscriptions** - Flexible subscription management
- **Tiered Access** - Different subscription levels for various features
- **Payment Processing** - Secure payment handling

### ⚙️ Background Processing
- **Inngest Background Jobs** - Asynchronous processing for AI tasks
- **Content Generation** - Automated creation of learning materials
- **Analytics Processing** - Background computation of learning insights

### 🧑‍💻 Development Workflow
- **CodeRabbit PR Reviews** - AI-assisted code review process
- **Automated Testing** - Comprehensive test coverage
- **CI/CD Pipeline** - Automated deployment workflows

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (Neon recommended)
- npm or yarn

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/edclarity-ai.git
   cd edclarity-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/edclarity"
   
   # Authentication (Better Auth)
   AUTH_SECRET="your-secret-key"
   AUTH_URL="http://localhost:3000"
   
   # OAuth Providers
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   GITHUB_CLIENT_ID="your-github-client-id"
   GITHUB_CLIENT_SECRET="your-github-client-secret"
   
   # OpenAI (Future Integration)
   OPENAI_API_KEY="your-openai-api-key"
   
   # Stream (Future Integration)
   STREAM_API_KEY="your-stream-api-key"
   STREAM_API_SECRET="your-stream-api-secret"
   
   # Razorpay (Future Integration)
   RAZORPAY_KEY_ID="your-razorpay-key-id"
   RAZORPAY_KEY_SECRET="your-razorpay-key-secret"
   RAZORPAY_WEBHOOK_SECRET="your-razorpay-webhook-secret"
   ```

4. **Database Setup**
   ```bash
   # Run database migrations
   npm run db:migrate
   
   # Generate new migration (if needed)
   npm run db:generate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Notify People Table
```sql
CREATE TABLE notify_people (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Future Tables (AI Agents & Sessions)
```sql
-- AI Agents Table
CREATE TABLE ai_agents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  subject VARCHAR(255),
  description TEXT,
  capabilities JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Learning Sessions Table
CREATE TABLE learning_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  agent_id INTEGER REFERENCES ai_agents(id),
  title VARCHAR(255),
  status VARCHAR(50),
  transcript TEXT,
  summary TEXT,
  recording_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔌 API Endpoints

### Current Endpoints

#### POST `/api/notify`
Add an email to the notification list.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
- `200` - Email added successfully
- `409` - Email already exists
- `400` - Invalid email format

### Future API Endpoints

#### AI Agents
- `GET /api/agents` - List all AI agents
- `POST /api/agents` - Create new AI agent
- `GET /api/agents/:id` - Get specific agent details
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent

#### Learning Sessions
- `GET /api/sessions` - List user's learning sessions
- `POST /api/sessions` - Start new learning session
- `GET /api/sessions/:id` - Get session details
- `PUT /api/sessions/:id` - Update session
- `POST /api/sessions/:id/transcript` - Generate transcript
- `POST /api/sessions/:id/summary` - Generate summary

## 🧪 Testing

### Manual Testing Checklist

#### Current Features
- [ ] Authentication (sign up, sign in, social login)
- [ ] Landing page email collection
- [ ] Duplicate email prevention
- [ ] Responsive design across devices
- [ ] Form validation and error handling

#### Future Features (To Be Implemented)
- [ ] AI agent creation and management
- [ ] Learning session initiation
- [ ] Real-time video calls
- [ ] Transcript generation
- [ ] Session summaries
- [ ] Search functionality
- [ ] Subscription management

### Unit Testing
```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📱 Responsive Design

The application is optimized for:
- **Mobile**: iPhone SE (375px), Samsung S8+ (1440px)
- **Tablet**: iPad (768px)
- **Desktop**: 1024px+

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
- **Railway**: Good for full-stack apps with database
- **Netlify**: Frontend-focused deployment
- **DigitalOcean**: Manual deployment with full control

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request (AI-assisted reviews with CodeRabbit)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:
1. Check the [Issues](https://github.com/yourusername/edclarity-ai/issues) page
2. Create a new issue with detailed description
3. Contact the development team

## 🎯 Vision

EdClarity.ai aims to democratize education by providing:
- **Personalized Learning** - AI agents that adapt to individual learning styles
- **24/7 Availability** - Round-the-clock doubt-solving assistance
- **Scalable Education** - Quality education accessible to students worldwide
- **Data-Driven Insights** - Analytics to improve learning outcomes

---

Made with ❤️ using Next.js, Tailwind, and AI-powered educational technology.
