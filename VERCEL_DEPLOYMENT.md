# Vercel Deployment Guide

This guide explains how to deploy the ResumeAI frontend to Vercel.

## Prerequisites

1. **Vercel Account** - Create a free account at [https://vercel.com](https://vercel.com)

2. **GitHub Repository** - Your code should be in a GitHub repository

3. **Backend API Deployed** - The Resume API should be deployed (see `resume-api/CLOUDRUN_DEPLOYMENT.md`)

## Deployment Methods

### Option 1: Deploy via Vercel CLI (Recommended)

#### 1. Install Vercel CLI

```bash
npm install -g vercel
```

#### 2. Login to Vercel

```bash
vercel login
```

#### 3. Deploy

From the project root:

```bash
# First deployment (prompts for configuration)
vercel

# Confirm deployment settings
# - Project name: resumeai
# - Build command: npm run build
# - Output directory: dist
# - Override settings? No

# Set production branch to main
vercel --prod
```

### Option 2: Deploy via Vercel Dashboard

1. Go to [https://vercel.com/new](https://vercel.com/new)

2. **Import Repository**
   - Select your GitHub repository
   - Click "Continue"

3. **Configure Project**
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Environment Variables** (Settings > Environment Variables)
   ```
   VITE_API_URL=https://your-api-url.a.run.app
   RESUMEAI_API_KEY=rai_your_master_api_key_here
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete (~2-3 minutes)

### Option 3: Automatic Deployment (Git Integration)

Once set up, Vercel automatically deploys on every push to `main`:

```bash
git checkout main
git pull origin main
# Make changes...
git add .
git commit -m "feat: update feature"
git push origin main
# Vercel automatically deploys
```

## Environment Variables

Configure these in Vercel Dashboard (Settings > Environment Variables):

| Variable | Description | Required | Example |
|----------|-------------|-----------|---------|
| `VITE_API_URL` | Backend API URL | Yes | `https://resume-api-12345.a.run.app` |
| `RESUMEAI_API_KEY` | API key for authentication | Yes | `rai_1234567890abcdef...` |

### How to Add Environment Variables

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add each variable with its value
4. Select environments (Production, Preview, Development)
5. Click **Save**
6. **Redeploy** for changes to take effect

## Local Development with Vercel

To test the production build locally with Vercel:

```bash
# Install dependencies
npm install

# Start local development server (uses Vite)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Testing the Deployment

### 1. Verify Deployment

Visit your Vercel URL:
- Production: `https://your-project.vercel.app`
- Preview: `https://your-commit-sha.your-project.vercel.app`

### 2. Check Environment Variables

Open browser console and verify:
```javascript
console.log('API URL:', import.meta.env.VITE_API_URL);
console.log('API Key:', import.meta.env.RESUMEAI_API_KEY ? 'Set' : 'Missing');
```

### 3. Test API Integration

1. Open the deployed site
2. Navigate to Dashboard > Workspace
3. Enter a test job description
4. Click "Generate Package"
5. Verify the request succeeds

## Custom Domain (Optional)

### Configure Custom Domain

1. **Vercel Dashboard**
   - Go to **Settings** > **Domains**
   - Add your custom domain (e.g., `app.resumeai.com`)

2. **Update DNS**
   - Vercel will provide DNS records to add
   - Add A records or CNAME records to your DNS provider

3. **Verify**
   - Wait for DNS propagation (usually 5-30 minutes)
   - Vercel will automatically configure SSL certificates

### DNS Records for Popular Providers

**Cloudflare:**
```
Type: CNAME
Name: app
Target: cname.vercel-dns.com
Proxy: Yes
```

**Route 53:**
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

**GoDaddy:**
```
Type: CNAME
Host: app
Points to: cname.vercel-dns.com
```

## Deployment Checklist

Before deploying to production:

- [x] Backend API is deployed and accessible
- [x] API URL is set in `VITE_API_URL`
- [x] Master API key is set in `RESUMEAI_API_KEY`
- [x] All features tested locally
- [x] `.env` file created (not committed to git)
- [x] `.vercelignore` file configured (optional)

## Performance Optimization

### Image Optimization

Vercel automatically optimizes images:
- WebP/AVIF format
- Responsive sizing
- Lazy loading

### Edge Functions

For static assets and API routes, Vercel uses Edge Functions for faster response times.

### Build Cache

Vercel caches dependencies between deployments for faster builds.

## Monitoring and Analytics

### Vercel Analytics

View deployment metrics:
1. Go to Vercel Dashboard
2. Navigate to **Analytics**
3. View page views, visitors, and performance

### Logs

View deployment logs:
1. Go to Vercel Dashboard
2. Select a deployment
3. View build logs and runtime logs

### Uptime Monitoring

Vercel provides uptime monitoring:
- Response time
- Error rate
- Geolocation data

## Cost

Vercel has a generous free tier:

**Free Plan:**
- 100GB bandwidth/month
- Unlimited deployments
- Automatic HTTPS
- Edge Functions (100GB-hours/month)
- 6,000 minutes of build time/month

**Pro Plan** ($20/month):
- 1TB bandwidth
- 10,000 build minutes
- Priority support
- No bandwidth fees

For most use cases, the free plan is sufficient.

## Troubleshooting

### Build Failures

If deployment fails:

1. **Check Build Logs**
   - View detailed error logs in Vercel Dashboard

2. **Common Issues**
   - Node version mismatch (specified in `package.json`)
   - Missing dependencies (run `npm install` locally first)
   - Environment variables missing in build

3. **Local Build Test**
   ```bash
   npm run build
   npm run preview
   ```

### API Connection Errors

If the frontend can't connect to the API:

1. **Verify API URL**
   - Check `VITE_API_URL` environment variable
   - Ensure no trailing slashes
   - Use HTTPS for production

2. **Test API Directly**
   ```bash
   curl https://your-api-url.a.run.app/health
   ```

3. **Check CORS**
   - Verify backend allows your Vercel domain
   - Check `CORS_ORIGINS` in backend

### Environment Variables Not Working

1. **Check Variable Names**
   - Must start with `VITE_` for client-side access
   - Case-sensitive

2. **Rebuild Required**
   - Changes require redeployment
   - Use "Redeploy" button in Vercel Dashboard

3. **Verify Accessibility**
   ```javascript
   // In browser console
   console.log(import.meta.env.VITE_API_URL);
   ```

## CI/CD Pipeline

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Protecting Environment Variables

Never commit secrets to git. Use Vercel's environment variables or GitHub Secrets.

## Rollback

To rollback to a previous deployment:

1. **Vercel Dashboard**
   - Go to **Deployments**
   - Find the deployment you want to restore
   - Click **...** > **Promote to Production**

2. **Or via CLI**
   ```bash
   vercel rollback [deployment-url]
   ```

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Custom Domains](https://vercel.com/docs/projects/domains/add-a-domain)
- [Deployment Logs](https://vercel.com/docs/deployments/troubleshoot-a-deployment)

## Next Steps

After deployment:

1. **Monitor** - Set up analytics and error tracking
2. **Custom Domain** - Add your own domain for branding
3. **SEO** - Update meta tags and sitemap
4. **Analytics** - Add Google Analytics or similar
5. **Performance** - Test Lighthouse scores and optimize
