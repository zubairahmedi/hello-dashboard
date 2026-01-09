# Hello Dashboard 📊

A comprehensive analytics dashboard for tracking consultant performance, Meta Ads campaigns, and appointment data with advanced visualization and PDF export capabilities.

## 🚀 Features

- **Real-time Analytics Dashboard** - Track key metrics with interactive charts and visualizations
- **Consultant Performance Tracking** - Individual consultant views with detailed performance metrics
- **Meta Ads Integration** - Monitor Facebook/Instagram ad campaigns with account-level insights
- **Multi-Source Data Aggregation** - Aggregate data from multiple marketing sources
- **Time-based Filtering** - Filter data by 7, 14, 30, 60, 150, 180, and 365-day periods
- **PDF Export** - Server-side high-fidelity PDF generation using Puppeteer
- **IndexedDB Caching** - Client-side data caching for improved performance
- **Responsive Design** - Mobile-friendly interface
- **Authentication** - Secure login system

## 🏗️ Architecture

### Frontend
- **React 19.2** - Modern React with hooks
- **Recharts** - Interactive data visualizations
- **IndexedDB** - Client-side caching layer
- **Create React App** - Build tooling

### Backend
- **Node.js + Express** - RESTful API server
- **Puppeteer** - Server-side PDF generation
- **CORS enabled** - Cross-origin resource sharing

### Deployment
- **Docker** - Containerized deployment
- **Nginx** - Static file serving
- **Render.yaml** - Platform-as-a-service deployment configuration

## 📁 Project Structure

```
hello-dashboard/
├── src/
│   ├── components/
│   │   ├── Consultants/       # Consultant-specific views and profiles
│   │   ├── MetaAds/           # Meta Ads analytics components
│   │   └── Sources/           # Multi-source data views
│   ├── utils/
│   │   ├── consultantMetaAdsService.js
│   │   ├── indexedDbService.js
│   │   ├── metaAdsService.js
│   │   ├── pdfExport.js
│   │   ├── statusAggregationService.js
│   │   └── timeFilterService.js
│   ├── Dashboard.js           # Main dashboard component
│   ├── AnalyticsDashboard.js  # Analytics views
│   └── Login.js               # Authentication
├── server.js                  # Express backend + PDF service
├── docker-compose.yml         # Docker deployment config
├── render.yaml                # Render deployment config
└── package.json               # Dependencies
```

## 🛠️ Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/hello-dashboard.git
   cd hello-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Copy the example file
   cp .env.example .env.local
   
   # Edit .env.local with your actual values
   # Set authentication credentials and API endpoints
   ```

4. **Start development server**
   ```bash
   # Run frontend only
   npm start

   # Run backend only
   npm run server

   # Run both concurrently
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

## 🐳 Docker Deployment

### Using Docker Compose

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Manual Docker Build

```bash
# Build production
npm run build

# Build and run with Docker
docker build -t hello-dashboard .
docker run -p 80:80 hello-dashboard
```

## 📦 Production Build

```bash
# Build for production
npm run build

# Build and start server
npm run prod
```

The production build will be created in the `build/` directory.

## 🔧 Configuration

### Environment Variables

All sensitive configuration is managed through environment variables. See [.env.example](.env.example) for all available options.

**Required Configuration:**
- `REACT_APP_LOGIN_EMAIL` - Admin email for authentication
- `REACT_APP_LOGIN_PASSWORD` - Admin password for authentication
- `REACT_APP_PDF_SERVICE_URL` - PDF generation service endpoint
- `REACT_APP_AIRTABLE_WEBHOOK` - Main data source webhook
- Meta Ads webhook URLs (by account)

**Setup:**
```bash
# Copy example file
cp .env.example .env.local

# Edit with your values
nano .env.local  # or use your preferred editor
```

**Security Notes:**
- Never commit `.env.local` or `.env` files
- All environment variables use `REACT_APP_` prefix for Create React App compatibility
- Default fallback values are provided in [src/config/apiConfig.js](src/config/apiConfig.js)

### Puppeteer Configuration

The PDF service uses Puppeteer with the following optimizations:
- Headless mode enabled
- Sandboxing disabled for Docker compatibility
- GPU acceleration disabled
- Shared memory optimization

## 📊 Data Sources

The dashboard aggregates data from multiple sources:
- **Consultant Data** - Individual performance metrics
- **Meta Ads** - Facebook/Instagram campaign data
- **Status Windows** - Appointment status tracking (showed, no_show, confirmed, cancelled)
- **Monthly Performance** - Time-based performance metrics

See [AGGREGATION_ASSUMPTIONS.md](AGGREGATION_ASSUMPTIONS.md) for detailed data aggregation logic.

## 🎨 Features in Detail

### Analytics Views
- **Overview** - High-level KPIs and trends
- **Consultant Performance** - Individual consultant deep-dives
- **Meta Ads Accounts** - Campaign-level insights
- **Sources** - Multi-source data comparison
- **Yearly View** - Long-term trend analysis

### PDF Export
- Server-side rendering for consistent output
- Full chart and data fidelity
- Optimized for printing
- Custom styling preserved

### Caching Strategy
- IndexedDB for client-side persistence
- Data freshness indicators
- Automatic cache invalidation
- Offline capability

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## 📄 Documentation

- [Aggregation Assumptions](AGGREGATION_ASSUMPTIONS.md) - Data aggregation logic
- [Data Audit Findings](DATA_AUDIT_FINDINGS.md) - Data quality analysis
- [Data Flow Explanation](DATA_FLOW_EXPLANATION.md) - System data flow
- [Fixes Applied](FIXES_APPLIED.md) - Bug fixes and improvements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is private and proprietary.

## 👥 Team

Built for tracking consultant and marketing performance analytics.

## 🐛 Troubleshooting

### PDF Generation Issues
- Ensure Puppeteer dependencies are installed
- Check Docker memory limits (min 2GB recommended)
- Verify port 5000 is available

### Build Failures
```bash
# Clear cache and rebuild
rm -rf node_modules build
npm install
npm run build
```

### Port Conflicts
```bash
# Change port in .env or use:
PORT=3001 npm start
```

## 📞 Support

For issues and questions, please open a GitHub issue.

---

**Built with** React • Node.js • Express • Puppeteer • Recharts
