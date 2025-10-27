# Quick Deployment Guide

## ✅ Prerequisites Completed
- [x] Backend deployed to Render: https://plant-9uk7.onrender.com
- [x] Frontend deployed to Netlify: https://warm-custard-8d018b.netlify.app
- [x] Environment variables configured
- [x] CORS configured for Netlify
- [x] Frontend environment variables set

## 🚀 Deploy Frontend to Netlify

### Option 1: Netlify Dashboard (Recommended for first deployment)

1. **Go to Netlify**: https://app.netlify.com
2. **Click**: "Add new site" → "Import an existing project"
3. **Connect Git**: Choose your repository
4. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Click "Show advanced" and verify Node version: `20.19.3`
5. **Deploy**: Click "Deploy site"
6. **Wait**: Build will take 2-5 minutes

### Option 2: Netlify CLI (For quick deployments)

```bash
# Install Netlify CLI (one time)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

## 🧪 Test After Deployment

### 1. Test Backend (Should already be working)
Open in browser: https://plant-9uk7.onrender.com/api/status

Expected response:
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

### 2. Test Frontend
1. Visit your Netlify URL (e.g., `your-app.netlify.app`)
2. You should see the Welcome page
3. Click "Admin Login"
4. Login with Super Admin:
   - Email: `super_admin@microsyslogic.com`
   - Password: `super_admin_password`

### 3. Test Company Features
1. Create a new company
2. Add tables
3. Click "Monitor Activity" on a company
4. Click "View Plant" to see panels

## ⚠️ Important Notes

### Data Persistence
Your backend on Render **free tier** uses ephemeral storage:
- Company data will be **lost** when server restarts
- For production, upgrade to Render paid plan or migrate to database

### Environment Variables
Already configured:
- ✅ Production: Uses Render backend
- ✅ Development: Uses localhost:5000
- ✅ Netlify: Auto-configured in `netlify.toml`

## 🔧 If Something Goes Wrong

### Frontend build fails
```bash
# Test build locally
npm run build

# If successful, try deploying again
netlify deploy --prod
```

### Can't connect to backend
1. Check backend is running: https://plant-9uk7.onrender.com/api/status
2. Check browser console for CORS errors
3. Verify Netlify domain in backend CORS settings

### Login not working
1. Verify backend has company data
2. Check browser network tab for API errors
3. Try creating a new company first

## 📝 Your Deployment URLs

- **Backend**: https://plant-9uk7.onrender.com
- **Frontend**: https://warm-custard-8d018b.netlify.app

## 🎉 Success Checklist

After deployment, verify:
- [ ] Frontend loads successfully
- [ ] Can login as Super Admin
- [ ] Can create new company
- [ ] Can add tables
- [ ] Monitor Activity button works
- [ ] View Plant button works
- [ ] Panel images display correctly

## 📞 Need Help?

Check detailed guide: `DEPLOYMENT.md`
