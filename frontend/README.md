# DFW Property Search Platform - Frontend

A React TypeScript frontend for the DFW Property Search Platform, featuring an interactive Mapbox map for exploring Dallas-Fort Worth area real estate.

## Features

- **Interactive Map**: Explore properties using Mapbox GL JS with clustering and heatmap views
- **User Authentication**: AWS Cognito integration for secure user registration and login
- **Access Control**: Guest users see Dallas County only; registered users see all counties
- **Advanced Filters**: Filter by price and size ranges
- **Save Preferences**: Save and manage filter presets (authenticated users)
- **CSV Export**: Export filtered property data to CSV format

## Tech Stack

- **Framework**: React 18.2+
- **Language**: TypeScript 5.3+
- **Build Tool**: Vite 5.0
- **Styling**: TailwindCSS 3.4
- **State Management**: Zustand 4.5 + TanStack Query 5.0
- **Routing**: React Router 6.22
- **Map**: Mapbox GL JS 3.1
- **Authentication**: Amazon Cognito Identity JS

## Project Structure

```
frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── Map/
│   │   │   ├── PropertyMap.tsx
│   │   │   ├── ParcelPopup.tsx
│   │   │   └── MapControls.tsx
│   │   ├── Filters/
│   │   │   └── FilterPanel.tsx
│   │   ├── Export/
│   │   │   └── ExportButton.tsx
│   │   └── Preferences/
│   │       └── SavePreferenceModal.tsx
│   ├── pages/
│   │   ├── MapPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── VerifyPage.tsx
│   ├── services/
│   │   ├── api.ts
│   │   └── cognito.ts
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── filterStore.ts
│   │   └── mapStore.ts
│   ├── config/
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── Dockerfile
└── nginx.conf
```

## Setup

### Prerequisites

- Node.js 18+
- npm 9+

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables**
   Edit `.env` with your configuration:
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_MAPBOX_TOKEN=your_mapbox_token
   VITE_AWS_REGION=us-east-2
   VITE_COGNITO_USER_POOL_ID=your_user_pool_id
   VITE_COGNITO_CLIENT_ID=your_client_id
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   Navigate to http://localhost:5173

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Docker

```bash
# Build image
docker build -t dfw-frontend \
  --build-arg VITE_API_URL=https://your-api.com \
  --build-arg VITE_MAPBOX_TOKEN=your_token \
  --build-arg VITE_AWS_REGION=us-east-2 \
  --build-arg VITE_COGNITO_USER_POOL_ID=your_pool_id \
  --build-arg VITE_COGNITO_CLIENT_ID=your_client_id \
  .

# Run container
docker run -d -p 3000:80 dfw-frontend
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |
| `VITE_MAPBOX_TOKEN` | Mapbox access token | Yes |
| `VITE_AWS_REGION` | AWS Cognito region | Yes |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID | Yes |
| `VITE_COGNITO_CLIENT_ID` | Cognito App Client ID | Yes |

## Features

### Guest Mode
- View properties on interactive map
- Filter by price and size
- View property details in popup
- Access Dallas County data only

### Registered User Mode
- All guest features plus:
- Access to all DFW counties
- Save filter preferences
- Export data to CSV

### Map Features
- Cluster view for large datasets
- Price-based color coding
- Multiple map styles (dark, satellite, streets)
- Property detail popups
- Zoom and pan controls

## Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

1. Build the project: `npm run build`
2. Deploy the `dist/` folder to your hosting service
3. Ensure all routes redirect to `index.html` for SPA support

## License

MIT License

