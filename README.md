
# Boardy WhatsApp Fantasy Bot

AI-powered WhatsApp bot for Yahoo Fantasy Sports. Supports robust, stateful, and extensible command flows for team management, trades, waivers, and more.

## 🚀 Try It Out Now!

**Twilio WhatsApp Sandbox Access:**
- Send a WhatsApp message to: **+1 (415) 523-8886**
- Include the code: **concerned-room**
- Once connected, send "**help**" to see all available commands
- Send "**link**" to connect your Yahoo Fantasy account and get started!

## Setup & Running Instructions

### Prerequisites
- Node.js (v16+ recommended)
- Yahoo Fantasy Sports account with active leagues
- Twilio account (for WhatsApp integration)

### Local Development Setup

1. **Clone the repo & install dependencies:**
   ```bash
   git clone <repo-url>
   cd boardy_interview_project
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Fill in your credentials:
     ```env
     YAHOO_CLIENT_ID=your_yahoo_client_id
     YAHOO_CLIENT_SECRET=your_yahoo_client_secret
     TWILIO_ACCOUNT_SID=your_twilio_sid
     TWILIO_AUTH_TOKEN=your_twilio_token
     BASE_URL=https://your-ngrok-url.com
     ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Expose your local server (required for OAuth callbacks):**
   - Install [ngrok](https://ngrok.com/): `npm install -g ngrok`
   - Expose port 3000: `ngrok http 3000`
   - **Why ngrok is required:**
     - Yahoo OAuth requires a publicly accessible callback URL for authentication
     - When users click "link" to connect their Yahoo account, Yahoo redirects back to your server
     - Your local development server (localhost:3000) isn't accessible from the internet
     - ngrok creates a secure tunnel making your local server publicly accessible
   - Update both:
     - Twilio sandbox webhook URL: `https://your-ngrok-url.com/webhook`
     - Yahoo app callback URL: `https://your-ngrok-url.com/auth/yahoo/callback`

## 🏗️ Architecture Overview

### Core Technology Stack
- **Runtime:** Node.js with TypeScript for type safety and modern JavaScript features
- **Web Framework:** Express.js for HTTP server and OAuth callback handling
- **Messaging:** Twilio WhatsApp Business API for reliable message delivery
- **Fantasy Data:** Yahoo Fantasy Sports API for real-time league/player data
- **State Management:** In-memory conversation state with persistent user data

### System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   WhatsApp      │───▶│   Express App    │───▶│  Yahoo Fantasy  │
│   User          │    │   + Webhook      │    │      API        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Command Router  │
                    │  + State Mgmt    │
                    └──────────────────┘
```

### Modular Command Architecture
- **`src/commands/`** - Individual command handlers (19 total commands)
  - Each command is self-contained with specific business logic
  - Natural language parsing using regex patterns
  - Comprehensive error handling and user feedback
- **`src/services/`** - External API integration layer
  - `yahoo.ts` - Complete Yahoo Fantasy API wrapper (OAuth, leagues, players, trades)
  - `twilio.ts` - WhatsApp messaging service
  - `userStorage.ts` - In-memory user data and session management
- **`src/utils/`** - Shared utilities and conversation management
  - `stateHandler.ts` - 16 different conversation states with step-by-step flows
  - `messageHandler.ts` - Command parsing and routing logic
  - `conversationState.ts` - State persistence utilities

### Design Patterns
- **Command Pattern:** Each user action is handled by a dedicated command file
- **State Machine:** Conversation flows managed through explicit state transitions
- **Service Layer:** Clear separation between API calls and business logic  
- **Error Boundaries:** Comprehensive try-catch with user-friendly error messages

## Key Features

- **Team selection & league management**
- **Add/drop/add-drop flows** (with waiver claim prompts)
- **Show available free agents** (with position filter, sorted by actual rank)
- **Scoreboard, standings, and matchup queries**
- **Trade flow:** Step-by-step, menu-driven, with confirmation and notes
- **Pending transactions:** View waivers/trades for your team only
- **Lineup modification:** Conversational, multi-step
- **Help and documentation:** Up-to-date, linter-compliant

## 🎯 Design Decisions & Tradeoffs

### Key Design Choices

#### 1. **Stateful Conversational UX**
- **Decision:** All complex flows (trades, lineup changes) use step-by-step confirmation
- **Benefit:** Prevents accidental actions, provides clear user guidance
- **Tradeoff:** More message exchanges vs. single-command execution
- **Rationale:** Fantasy sports actions have high stakes - confirmations prevent costly mistakes

#### 2. **In-Memory State Management**
- **Decision:** User sessions and conversation state stored in memory
- **Benefit:** Fast access, simple implementation, no database overhead
- **Tradeoff:** Data lost on server restart, no persistence across sessions
- **Rationale:** Optimized for demo/interview scenario; production would require database

#### 3. **Modular Command Architecture**
- **Decision:** Each bot command is a separate file in `src/commands/`
- **Benefit:** Easy to add new features, test individual commands, maintain code
- **Tradeoff:** More files to manage vs. monolithic command handler
- **Rationale:** Supports rapid feature development and team collaboration

#### 4. **Service Layer Abstraction**
- **Decision:** Separate API calls (services) from user interaction (commands)
- **Benefit:** Reusable API functions, easier testing, clear separation of concerns
- **Tradeoff:** Additional abstraction layer vs. direct API calls in commands
- **Rationale:** Enables code reuse and makes commands focus purely on user experience

#### 5. **Regex-Based Natural Language Parsing**
- **Decision:** Use regex patterns to parse user commands like "start Mahomes at QB week 3"
- **Benefit:** Flexible input parsing, no external NLP dependencies
- **Tradeoff:** Limited to predefined patterns vs. true natural language understanding
- **Rationale:** Balances user-friendly input with implementation complexity

### Technical Tradeoffs Analysis

| Aspect | Current Approach | Alternative | Tradeoff Reasoning |
|--------|------------------|-------------|-------------------|
| **Data Persistence** | In-memory storage | Database (Redis/PostgreSQL) | Demo simplicity vs. production scalability |
| **Authentication** | Yahoo OAuth only | Multi-provider auth | Single integration vs. broader user base |
| **Command Parsing** | Regex patterns | LLM/NLP integration | Implementation speed vs. parsing flexibility |
| **Error Handling** | Try-catch with user messages | Structured error codes | User-friendly vs. programmatic error handling |
| **API Rate Limiting** | Basic request throttling | Advanced caching layer | Simple implementation vs. optimal performance |

## 🚀 Potential Optimizations & Future Enhancements

### Immediate Improvements
- **Database Integration:** PostgreSQL or Redis for persistent user data and conversation state
- **Caching Layer:** Redis cache for Yahoo API responses to improve performance and reduce rate limits
- **Enhanced Error Handling:** Structured error codes with retry mechanisms and fallback flows
- **Input Validation:** More robust parsing with better error messages for malformed commands

### Advanced Features  
- **Multi-League Support:** Handle users with multiple fantasy leagues across different sports
- **Advanced Analytics:** Player performance predictions, waiver wire recommendations, trade analysis
- **Scheduled Notifications:** Lineup reminders, waiver deadlines, trade proposal alerts
- **Voice Commands:** Integration with WhatsApp voice messages for hands-free interaction

### Production Readiness
- **Security Hardening:** Environment secret management, input sanitization, rate limiting
- **Monitoring & Logging:** Comprehensive logging with error tracking (Sentry, LogRocket)
- **Horizontal Scaling:** Stateless architecture with session storage for multi-instance deployment
- **Advanced NLP:** Large Language Model integration for more natural command understanding
- **API Optimization:** GraphQL layer for efficient data fetching and reduced API calls

### User Experience Enhancements
- **Guided Onboarding:** Interactive tutorial for new users with sample commands
- **Smart Suggestions:** Context-aware command suggestions based on league status and user history
- **Rich Media:** Player photos, team logos, and formatted tables in WhatsApp messages
- **Personalization:** User preferences for notification timing, favorite teams, and command shortcuts

## 📱 Demo Usage & Testing

### Getting Started
1. **Connect to WhatsApp:** Message **+1 (415) 523-8886** with code **concerned-room**
2. **Link Your Account:** Send "**link**" and follow the Yahoo OAuth flow
3. **Choose Your Team:** Send "**choose team**" to select your fantasy team
4. **Explore Commands:** Send "**help**" to see all available actions

### Sample Command Flows
```
User: "help"
Bot: [Shows comprehensive command list]

User: "link" 
Bot: [Provides Yahoo OAuth URL]

User: "show teams"
Bot: [Lists all your fantasy teams]

User: "get roster"
Bot: [Shows current team roster with positions]

User: "start Mahomes at QB week 5"
Bot: [Confirms lineup change]

User: "show available RB"
Bot: [Lists top available running backs]

User: "propose trade"
Bot: [Starts interactive trade flow]
```

### Technical Demo Notes
- **Live Yahoo API Integration:** Real fantasy data, requires valid Yahoo Fantasy account
- **Twilio WhatsApp Sandbox:** Production-ready messaging infrastructure  
- **Stateful Conversations:** All multi-step flows maintain context between messages
- **Natural Language Support:** Flexible command parsing handles various phrasings
- **Error Recovery:** Graceful error handling with helpful user guidance
- **OAuth Security:** Secure Yahoo account linking with time-based tokens

### Best Practices for Testing
- **Team Selection:** Choose your team first for optimal experience with roster/trade commands
- **Multi-Step Flows:** Trade and lineup modification flows require confirmation at each step
- **Command Flexibility:** Try variations like "get matchup week 3" or "show week 3 matchup"
- **Error Testing:** Try invalid commands to see helpful error messages and suggestions


