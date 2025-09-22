# FitClient - Fitness Trainer Management System

A comprehensive fitness trainer management system built with Next.js, Supabase, and TypeScript. Features client management, package sales, QR code check-ins, and more.

## 🚀 Features

- **Client Management** - Add, edit, and manage clients
- **Package Sales** - Create and sell training packages
- **QR Code Check-ins** - Mobile-friendly check-in system
- **Session Tracking** - Automatic session counting and deduction
- **PWA Support** - Works offline and installable as app
- **Mobile Optimized** - Ultra mobile-friendly design

## 📱 QR Code Generation

The system now uses dynamic URL generation for QR codes:

### Development Mode
- **Automatic IP Detection** - Uses your computer's local IP address
- **Local Network Access** - Clients can scan QR codes on the same Wi-Fi network
- **Fallback Support** - Falls back to localhost if IP detection fails

### Production Mode
- **Domain-based URLs** - Uses your actual domain name
- **Public Access** - QR codes work from anywhere

## 🔧 How to Find Your Local IP Address

### On macOS:
1. **System Preferences Method:**
   - Open System Preferences
   - Click on "Network"
   - Select your active connection (Wi-Fi or Ethernet)
   - Your IP address will be shown (e.g., 192.168.1.100)

2. **Terminal Method:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   Look for an IP address starting with `192.168.`, `10.`, or `172.`

3. **Network Utility:**
   - Open Network Utility (Applications > Utilities)
   - Go to "Info" tab
   - Select your interface and view the IP address

### On Windows:
1. **Command Prompt:**
   ```cmd
   ipconfig
   ```
   Look for "IPv4 Address" under your active network adapter

2. **Settings Method:**
   - Open Settings > Network & Internet
   - Click on your connection
   - Scroll down to see your IP address

### On Linux:
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

## 🌐 Dynamic URL Generation

The system uses environment variables to generate QR code URLs:

```javascript
// Uses NEXT_PUBLIC_APP_URL environment variable
// Fallback: http://172.20.10.15:3000

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://172.20.10.15:3000'
const checkinUrl = `${baseUrl}/checkin/${clientId}`
```

### QR Code Content Format:
- **Development:** `http://172.20.10.15:3000/checkin/client-id` (or your custom IP)
- **Production:** `https://fitness-saas-ruby.vercel.app/checkin/client-id`

### Environment Variable Setup:

#### Local Development:
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=https://fitness-saas-ruby.vercel.app
```

#### Vercel Production:
1. Go to your Vercel project dashboard
2. Navigate to **Settings > Environment Variables**
3. Add the following variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon/public key
   - `NEXT_PUBLIC_APP_URL`: `https://fitness-saas-ruby.vercel.app`
4. Redeploy your application

#### Verify Environment Variables:
```bash
# Run the verification script
node scripts/verify-env.js
```

This will check if all required environment variables are set correctly.

### Troubleshooting Supabase Connection:

#### Check-in Page Debugging:
The check-in page (`/checkin/[clientId]`) includes comprehensive debugging that will:
1. Test Supabase connection before fetching client data
2. Log environment variable status
3. Verify database table accessibility
4. Show detailed error messages

#### Common Issues:
- **"Veritabanı bağlantısı kurulamadı"**: Check environment variables in Vercel
- **"Client ID bulunamadı"**: Verify client exists in database
- **"Geçersiz QR kod"**: Check QR code URL format and client ID

#### Debug Information:
In development mode, the check-in page shows debug information including:
- Environment variable status
- Supabase connection test results
- Client ID validation
- URL parsing details

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd fitness-saas
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_APP_URL=https://fitness-saas-ruby.vercel.app
   ```

4. **Set up database:**
   - Run the SQL script in `setup-database.sql` in your Supabase SQL Editor
   - Run the migration in `migrations/add_remaining_sessions_to_clients_fixed.sql`

5. **Start development server:**
   ```bash
   npm run dev
   ```

## 📋 Database Setup

1. **Initial Setup:**
   ```sql
   -- Run in Supabase SQL Editor
   -- Copy content from setup-database.sql
   ```

2. **Migration (if needed):**
   ```sql
   -- Run in Supabase SQL Editor
   -- Copy content from migrations/add_remaining_sessions_to_clients_fixed.sql
   ```

## 🔄 Development Workflow

### QR Code Testing:
1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Find your local IP:**
   - Use the methods above to find your IP address
   - Example: `192.168.1.100`

3. **Create a client:**
   - Go to Dashboard > Üyeler
   - Add a new client
   - The QR code will automatically use your local IP

4. **Test QR code:**
   - Open the QR code on your phone
   - Scan it with another device on the same network
   - Should open: `http://192.168.1.100:3000/checkin/client-id`

### Network Requirements:
- **Same Wi-Fi Network** - Both devices must be on the same network
- **Firewall Settings** - Ensure port 3000 is accessible
- **Router Configuration** - Some routers may block local network access

## 🚀 Deployment

### Vercel (Recommended):
1. **Connect repository to Vercel**
2. **Set environment variables:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Deploy**

### Other Platforms:
- **Netlify** - Similar to Vercel setup
- **Railway** - Supports Next.js out of the box
- **DigitalOcean App Platform** - Good for production

## 📱 PWA Features

The app includes Progressive Web App features:
- **Offline Support** - Works without internet connection
- **Installable** - Can be added to home screen
- **App-like Experience** - Full-screen, no browser UI
- **Service Worker** - Caches essential resources

## 🔧 Troubleshooting

### QR Code Issues:
1. **IP Detection Fails:**
   - Check if WebRTC is enabled in your browser
   - Try refreshing the page
   - Check browser console for errors

2. **QR Code Not Accessible:**
   - Ensure both devices are on the same network
   - Check firewall settings
   - Try using localhost instead

3. **Development Server Issues:**
   ```bash
   # Kill existing processes
   pkill -f "next dev"
   
   # Clear cache
   rm -rf .next
   
   # Restart
   npm run dev
   ```

### Database Issues:
1. **Connection Errors:**
   - Verify Supabase credentials
   - Check network connectivity
   - Ensure RLS policies are configured

2. **Migration Errors:**
   - Run migrations in order
   - Check for syntax errors
   - Verify table structure

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the documentation

---

**Note:** This system is designed for fitness trainers to manage their clients and sessions efficiently. The QR code system works best when both the trainer and client are on the same local network during development.
