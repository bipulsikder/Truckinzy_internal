/**
 * Google Apps Script for Truckinzy Platform
 * This script provides additional functionality for the Google Sheets backend
 */

// Configuration
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
const SHEET_NAME = 'Sheet1';

/**
 * Initialize the spreadsheet with proper formatting
 */
function initializeSpreadsheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  
  // Set headers
  const headers = [
    'ID', 'Name', 'Email', 'Phone', 'Role', 'Location', 'Experience', 
    'Skills', 'Resume Text', 'File Name', 'Drive File ID', 'Drive File URL',
    'Status', 'Tags', 'Uploaded At', 'Updated At'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('white');
  headerRange.setFontWeight('bold');
  
  // Set column widths
  sheet.setColumnWidth(1, 100); // ID
  sheet.setColumnWidth(2, 150); // Name
  sheet.setColumnWidth(3, 200); // Email
  sheet.setColumnWidth(4, 120); // Phone
  sheet.setColumnWidth(5, 150); // Role
  sheet.setColumnWidth(6, 120); // Location
  sheet.setColumnWidth(7, 100); // Experience
  sheet.setColumnWidth(8, 200); // Skills
  sheet.setColumnWidth(9, 300); // Resume Text
  sheet.setColumnWidth(10, 150); // File Name
  sheet.setColumnWidth(11, 100); // Drive File ID
  sheet.setColumnWidth(12, 200); // Drive File URL
  sheet.setColumnWidth(13, 100); // Status
  sheet.setColumnWidth(14, 150); // Tags
  sheet.setColumnWidth(15, 150); // Uploaded At
  sheet.setColumnWidth(16, 150); // Updated At
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  Logger.log('Spreadsheet initialized successfully');
}

/**
 * Add data validation for status column
 */
function addDataValidation() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  // Status validation (column M = 13)
  const statusRange = sheet.getRange('M2:M1000');
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['new', 'reviewed', 'shortlisted', 'shared', 'rejected'])
    .setAllowInvalid(false)
    .build();
  statusRange.setDataValidation(statusRule);
  
  Logger.log('Data validation added');
}

/**
 * Create a dashboard sheet with analytics
 */
function createDashboard() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Create or get dashboard sheet
  let dashSheet = ss.getSheetByName('Dashboard');
  if (!dashSheet) {
    dashSheet = ss.insertSheet('Dashboard');
  }
  
  // Clear existing content
  dashSheet.clear();
  
  // Add title
  dashSheet.getRange('A1').setValue('Truckinzy Analytics Dashboard');
  dashSheet.getRange('A1').setFontSize(18).setFontWeight('bold');
  
  // Status summary
  dashSheet.getRange('A3').setValue('Status Summary');
  dashSheet.getRange('A3').setFontWeight('bold');
  
  const statusLabels = ['New', 'Reviewed', 'Shortlisted', 'Shared', 'Rejected'];
  const statusFormulas = [
    '=COUNTIF(Sheet1!M:M,"new")',
    '=COUNTIF(Sheet1!M:M,"reviewed")',
    '=COUNTIF(Sheet1!M:M,"shortlisted")',
    '=COUNTIF(Sheet1!M:M,"shared")',
    '=COUNTIF(Sheet1!M:M,"rejected")'
  ];
  
  for (let i = 0; i < statusLabels.length; i++) {
    dashSheet.getRange(4 + i, 1).setValue(statusLabels[i]);
    dashSheet.getRange(4 + i, 2).setFormula(statusFormulas[i]);
  }
  
  // Total candidates
  dashSheet.getRange('A10').setValue('Total Candidates');
  dashSheet.getRange('A10').setFontWeight('bold');
  dashSheet.getRange('B10').setFormula('=COUNTA(Sheet1!A:A)-1');
  
  // Recent uploads (last 7 days)
  dashSheet.getRange('A12').setValue('Recent Uploads (Last 7 Days)');
  dashSheet.getRange('A12').setFontWeight('bold');
  dashSheet.getRange('B12').setFormula('=COUNTIFS(Sheet1!O:O,">="&TODAY()-7)');
  
  Logger.log('Dashboard created successfully');
}

/**
 * Send email notifications for new candidates
 */
function sendNotificationEmail(candidateName, candidateRole) {
  const recipient = 'hr@truckinzy.com'; // Change this to your HR email
  const subject = `New Candidate: ${candidateName}`;
  const body = `
    A new candidate has been added to the Truckinzy platform:
    
    Name: ${candidateName}
    Role: ${candidateRole}
    
    Please review the candidate in the Google Sheets dashboard.
    
    Best regards,
    Truckinzy Platform
  `;
  
  try {
    MailApp.sendEmail(recipient, subject, body);
    Logger.log(`Notification email sent for ${candidateName}`);
  } catch (error) {
    Logger.log(`Failed to send email: ${error.toString()}`);
  }
}

/**
 * Trigger function for new row additions
 */
function onNewCandidate() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  
  if (lastRow > 1) {
    const candidateName = sheet.getRange(lastRow, 2).getValue();
    const candidateRole = sheet.getRange(lastRow, 5).getValue();
    
    // Send notification email
    sendNotificationEmail(candidateName, candidateRole);
  }
}

/**
 * Clean up old data (optional)
 */
function cleanupOldData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 365); // 1 year ago
  
  for (let i = data.length - 1; i > 0; i--) {
    const uploadDate = new Date(data[i][14]); // Uploaded At column
    if (uploadDate < cutoffDate) {
      sheet.deleteRow(i + 1);
    }
  }
  
  Logger.log('Old data cleanup completed');
}

/**
 * Export data to different formats
 */
function exportToPDF() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  // Create a temporary sheet with formatted data
  const tempSheet = ss.insertSheet('TempExport');
  const data = sheet.getDataRange().getValues();
  
  // Copy essential columns only
  const exportData = data.map(row => [
    row[1], // Name
    row[4], // Role
    row[5], // Location
    row[6], // Experience
    row[12], // Status
    row[14] // Uploaded At
  ]);
  
  tempSheet.getRange(1, 1, exportData.length, exportData[0].length).setValues(exportData);
  
  // Format the temp sheet
  tempSheet.getRange(1, 1, 1, exportData[0].length).setBackground('#4285f4').setFontColor('white').setFontWeight('bold');
  
  Logger.log('Data prepared for PDF export');
  
  // Clean up
  ss.deleteSheet(tempSheet);
}

/**
 * Setup triggers for automation
 */
function setupTriggers() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Create new triggers
  ScriptApp.newTrigger('onNewCandidate')
    .timeBased()
    .everyMinutes(5)
    .create();
    
  ScriptApp.newTrigger('cleanupOldData')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();
    
  Logger.log('Triggers setup completed');
}

/**
 * Main setup function - run this once
 */
function setupTruckinzyPlatform() {
  initializeSpreadsheet();
  addDataValidation();
  createDashboard();
  setupTriggers();
  
  Logger.log('Truckinzy platform setup completed successfully!');
}
