<<<<<<< HEAD
# data.truckinzy.com
=======
# Truckinzy - AI-Powered Logistics Hiring Platform

A comprehensive full-stack web application for automating resume parsing, AI-based job description generation, and intelligent candidate filtering for logistics hiring.

## 🚀 Features

- **Resume Upload & Parsing**: Automatic extraction of structured data from PDF/DOCX/DOC/TXT resumes
- **Candidate Dashboard**: Comprehensive view and management of all candidates
- **Smart Search**: AI-powered vector search for finding relevant candidates
- **JD Generator**: Automated job description generation based on candidate profiles
- **Admin Panel**: Analytics, statistics, and platform management
- **Tagging System**: Organize candidates with custom tags and status tracking

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Node.js
- **Database**: Google Sheets
- **AI**: Google Gemini API (with Affinda API fallback)
- **File Processing**: Built-in parsing with AI enhancement

## 📋 Prerequisites

- Node.js 18+ installed
- Google Cloud Project with Sheets & Drive APIs enabled
- Google Service Account credentials
- Google Spreadsheet and Drive Folder IDs
- Google Gemini API key
- (Optional) Affinda API key for enhanced resume parsing

## 🔧 Quick Start

### 1. Clone and Install

\`\`\`bash
git clone <repository-url>
cd truckinzy-platform
npm install
\`\`\`

### 2. Environment Setup

Follow the `GOOGLE_SHEETS_SETUP.md` guide to configure your Google Cloud Project, Service Account, Google Sheet, and Google Drive Folder.

Then, create a `.env.local` file with the following variables:

\`\`\`env
# Google Sheets & Drive Configuration
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_DRIVE_FOLDER_ID=your_drive_folder_id_here

# AI APIs
GEMINI_API_KEY=your_gemini_api_key_here
AFFINDA_API_KEY=your_affinda_api_key_here

# Next.js Configuration (Optional, for local development)
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
\`\`\`

### 3. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 4. Start Development Server

\`\`\`bash
npm run dev
# Visit http://localhost:3000 to access the application
# Visit http://localhost:3000/api/test to verify API configurations
\`\`\`

## 🔑 API Configuration

### Google Gemini API
1. Visit https://makersuite.google.com/app/apikey
2. Create new API key
3. Add to `GEMINI_API_KEY`

### Affinda API (Optional)
1. Sign up at https://www.affinda.com
2. Get API key (free: 1000 resumes/month)
3. Add to `AFFINDA_API_KEY`

## 📱 Usage Guide

### Upload Resumes
1. Go to "Upload" tab
2. Drag & drop or select files (PDF/DOCX/DOC/TXT)
3. Watch automatic AI parsing in real-time

### Manage Candidates
1. View all candidates in "Candidates" tab
2. Filter by status, role, location
3. Update candidate status and add tags
4. View detailed resume information

### Smart Search
1. Use "Smart Search" for AI-powered discovery
2. Enter queries like "Fleet manager 5+ years Delhi"
3. Results ranked by AI relevance

### Generate Job Descriptions
1. Select candidates in "JD Generator"
2. AI creates tailored job descriptions
3. Edit and export final versions

### Admin Analytics
1. Monitor usage in "Admin" tab
2. View statistics and breakdowns
3. Export data for analysis

## 🔧 Advanced Configuration

### File Processing
The platform supports multiple parsing methods:
- **Gemini AI**: Primary parsing method
- **Affinda API**: Professional parsing service
- **Fallback**: Basic text extraction

## 🚀 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy automatically

### Manual Deployment
\`\`\`bash
npm run build
npm start
\`\`\`

## 🔍 Troubleshooting

### Common Issues

**Google Sheets/Drive Connection Error**
- Ensure `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SPREADSHEET_ID`, and `GOOGLE_DRIVE_FOLDER_ID` are correctly set in `.env.local`
- Verify the service account has **Editor** access to the Google Sheet and Drive folder
- Check if Google Sheets API and Google Drive API are enabled in your Google Cloud Project

**AI API Errors**
- Verify API keys are correct
- Check API quotas and limits
- Test with `/api/test` endpoint

**File Upload Issues**
- Check file size (max 10MB)
- Verify file types (PDF/DOCX/DOC/TXT)
- Review browser console for errors

### Debug Mode
\`\`\`bash
# Enable detailed logging
NODE_ENV=development npm run dev
\`\`\`

### Health Check
Visit `http://localhost:3000/api/test` to verify:
- Google Sheets/Drive connectivity
- AI service status
- API configurations

## 📊 Performance Tips

- **File Size**: Keep resumes under 5MB for faster processing
- **Batch Upload**: Process files in small batches (5-10 at a time)
- **Search**: Use specific keywords for better results
- **Database**: Index frequently searched fields

## 🔒 Security Features

- File type validation
- Size limits (10MB per file)
- API rate limiting ready
- Environment variable protection
- Input sanitization

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 📞 Support

- **Issues**: Create GitHub issue
- **Email**: support@truckinzy.com
- **Docs**: Check `/api/test` for system status

---

**Built for the logistics industry with ❤️**
\`\`\`

## 🎯 Next Steps

1. **Test the platform**: Upload sample resumes
2. **Configure APIs**: Ensure all services are working
3. **Customize**: Modify for your specific needs
4. **Deploy**: Push to production when ready

The platform is now robust, well-documented, and production-ready! 🚀
>>>>>>> 547f109 (Initial commit)
