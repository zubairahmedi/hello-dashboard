# PDF Service Deployment Instructions

## Prerequisites
1. DNS record added: `api.dashboard.aiclinicgenius.com` → `72.61.7.184`
2. SSH access to VPS
3. Traefik running on `root_default` network

## Deployment Steps

### Step 1: Connect to VPS
```bash
ssh root@72.61.7.184
```

### Step 2: Create directory structure
```bash
mkdir -p /docker/pdf-service
cd /docker/pdf-service
```

### Step 3: Upload files
Transfer these files to `/docker/pdf-service/`:
- `Dockerfile`
- `docker-compose.yml`
- `package.json`
- `server.js`
- `.dockerignore`

**Using SCP from local machine:**
```bash
scp -r docker-deployment/pdf-service/* root@72.61.7.184:/docker/pdf-service/
```

### Step 4: Build and start service
```bash
cd /docker/pdf-service
docker compose up -d --build
```

### Step 5: Verify deployment
```bash
# Check container status
docker ps | grep pdf-service

# Check logs
docker logs pdf-service -f

# Test health endpoint (from VPS)
curl http://localhost:3001/health

# Test from outside (after DNS propagates)
curl https://api.dashboard.aiclinicgenius.com/health
```

### Step 6: Update React Dashboard
Update the API endpoint in your React app:

**File: `src/utils/pdfExport.js`**
```javascript
const API_ENDPOINT = 'https://api.dashboard.aiclinicgenius.com/api/generate-pdf';
```

Then rebuild and redeploy the dashboard.

## Troubleshooting

### Check container logs
```bash
docker logs pdf-service --tail 100 -f
```

### Check Traefik routing
```bash
docker logs traefik --tail 50 | grep pdfservice
```

### Restart service
```bash
cd /docker/pdf-service
docker compose restart
```

### Rebuild from scratch
```bash
cd /docker/pdf-service
docker compose down
docker compose up -d --build --force-recreate
```

### Check network connectivity
```bash
# Verify container is on root_default network
docker network inspect root_default | grep pdf-service

# Test internal connectivity
docker exec pdf-service curl http://localhost:3001/health
```

## Resource Monitoring

### Check memory usage
```bash
docker stats pdf-service --no-stream
```

### View resource limits
```bash
docker inspect pdf-service | grep -A 10 Memory
```

## SSL Certificate

Traefik will automatically request and manage Let's Encrypt SSL certificate for `api.dashboard.aiclinicgenius.com`.

Certificate should be available within 1-2 minutes of deployment.

## CORS Configuration

The service is configured to accept requests from:
- `https://dashboard.aiclinicgenius.com`

To add more origins, edit `docker-compose.yml`:
```yaml
- "traefik.http.middlewares.pdf-cors.headers.accesscontrolalloworiginlist=https://dashboard.aiclinicgenius.com,https://other-domain.com"
```

Then restart:
```bash
docker compose up -d
```

## Maintenance

### View logs
```bash
docker logs pdf-service -f
```

### Update service
```bash
cd /docker/pdf-service
# Update files (server.js, etc.)
docker compose up -d --build
```

### Stop service
```bash
docker compose down
```

### Remove service completely
```bash
docker compose down -v
docker rmi pdf-service_pdf-service
```

## Expected Endpoints

- **Health Check**: `https://api.dashboard.aiclinicgenius.com/health`
- **PDF Generation**: `https://api.dashboard.aiclinicgenius.com/api/generate-pdf` (POST)

## Performance Notes

- Memory limit: 1GB (512MB reserved)
- PDF generation typically takes 2-5 seconds
- Double-render strategy for chart labels works perfectly
- Supports landscape and portrait orientations
