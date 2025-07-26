# Google Sheets Setup Guide for Truckinzy Platform

## 📋 Prerequisites

1. Google Cloud Console account
2. Google Sheets API enabled
3. Google Drive API enabled
4. Service Account created

## 🔧 Step-by-Step Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Google Sheets API
   - Google Drive API

### 2. Create Service Account

1. Go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Fill in details:
   - Name: `truckinzy-service-account`
   - Description: `Service account for Truckinzy platform`
4. Click **Create and Continue**
5. Skip role assignment for now
6. Click **Done**

### 3. Generate Service Account Key

1. Click on the created service account
2. Go to **Keys** tab
3. Click **Add Key** > **Create New Key**
4. Select **JSON** format
5. Download the key file
6. Extract the following from the JSON:
   - `client_email`
   - `private_key`

### 4. Create Google Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Truckinzy Candidates"
4. Copy the spreadsheet ID from URL:
   \`\`\`
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
   \`\`\`

### 5. Share Spreadsheet with Service Account

1. Click **Share** button in Google Sheets
2. Add the service account email (from step 3)
3. Give **Editor** permissions
4. Click **Send**

### 6. Create Google Drive Folder (Optional)

1. Go to [Google Drive](https://drive.google.com)
2. Create a new folder named "Truckinzy Resumes"
3. Copy the folder ID from URL:
   \`\`\`
   https://drive.google.com/drive/folders/FOLDER_ID
   \`\`\`
4. Share folder with service account email (Editor access)

### 7. Setup Environment Variables

Create `.env.local` file:

\`\`\`env
# Google Sheets & Drive Configuration
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_DRIVE_FOLDER_ID=your_drive_folder_id_here

# AI APIs (existing)
GEMINI_API_KEY=your_gemini_api_key_here
AFFINDA_API_KEY=your_affinda_api_key_here
\`\`\`

### 8. Setup Google Apps Script (Optional)

1. Go to [Google Apps Script](https://script.google.com)
2. Create new project
3. Replace `Code.gs` with the provided script
4. Update `SPREADSHEET_ID` in the script
5. Run `setupTruckinzyPlatform()` function once
6. Authorize the script when prompted

## 🚀 Testing the Setup

1. Install dependencies:
   \`\`\`bash
   npm install googleapis
   \`\`\`

2. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Visit `http://localhost:3000/api/test` to verify setup

4. Expected response:
   \`\`\`json
   {
     "googleSheets": "✅ Connected and initialized",
     "gemini": "✅ Working (API key configured)",
     "affinda": "✅ API key configured"
   }
   \`\`\`

## 📊 Spreadsheet Structure

The spreadsheet will have these columns:

| Column | Field | Description |
|--------|-------|-------------|
| A | ID | Unique identifier |
| B | Name | Candidate name |
| C | Email | Email address |
| D | Phone | Phone number |
| E | Role | Job role/position |
| F | Location | Location/city |
| G | Experience | Years of experience |
| H | Skills | Comma-separated skills |
| I | Resume Text | Full resume content |
| J | File Name | Original file name |
| K | Drive File ID | Google Drive file ID |
| L | Drive File URL | Public Drive link |
| M | Status | new/reviewed/shortlisted/shared/rejected |
| N | Tags | Comma-separated tags |
| O | Uploaded At | Upload timestamp |
| P | Updated At | Last update timestamp |

## 🔒 Security Best Practices

1. **Never commit service account keys** to version control
2. **Use environment variables** for all sensitive data
3. **Limit service account permissions** to minimum required
4. **Regularly rotate service account keys**
5. **Monitor API usage** in Google Cloud Console

## 🛠️ Troubleshooting

### Common Issues:

1. **"Permission denied" error**:
   - Ensure service account has access to spreadsheet
   - Check if APIs are enabled in Google Cloud Console

2. **"Spreadsheet not found" error**:
   - Verify spreadsheet ID is correct
   - Ensure spreadsheet is shared with service account

3. **"Invalid credentials" error**:
   - Check if private key is properly formatted
   - Ensure no extra spaces or characters in environment variables

4. **"Quota exceeded" error**:
   - Check API quotas in Google Cloud Console
   - Implement rate limiting if needed

### Debug Steps:

1. Test API connection:
   \`\`\`bash
   curl http://localhost:3000/api/test
   \`\`\`

2. Check server logs for detailed error messages

3. Verify environment variables are loaded correctly

## 📈 Advanced Features

### Apps Script Automation:
- Automatic email notifications for new candidates
- Data validation and formatting
- Analytics dashboard
- Scheduled data cleanup

### API Rate Limits:
- Google Sheets API: 100 requests per 100 seconds per user
- Google Drive API: 1,000 requests per 100 seconds per user

### Scaling Considerations:
- For high volume, consider Google Cloud Firestore
- Implement caching for frequently accessed data
- Use batch operations for bulk updates

## 🎯 Next Steps

1. Test file upload functionality
2. Verify candidate data appears in spreadsheet
3. Check Google Drive file storage
4. Test search and filtering features
5. Configure Apps Script automation (optional)

Your Truckinzy platform is now ready to use Google Sheets as the backend! 🚀
