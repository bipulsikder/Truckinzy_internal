/**
 * Google Apps Script for Truckinzy Platform - Enhanced Version
 * This script provides additional functionality for the Google Sheets backend
 */

// Configuration
const SPREADSHEET_ID = '1Q1lbLnIJ4ijUz4ywAnTQohmiMfIpHOeJHBZv2dZBrGg'; // Replace with your actual spreadsheet ID
const SHEET_NAME = 'Sheet1';

/**
 * Initialize the spreadsheet with comprehensive headers
 */
function initializeSpreadsheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  
  // Comprehensive headers matching your Google Sheets integration
  const headers = [
    // Basic Information
    'ID', 'Name', 'Email', 'Phone', 'Date of Birth', 'Gender', 'Marital Status',
    // Professional Information
    'Current Role', 'Desired Role', 'Current Company', 'Location', 'Preferred Location', 
    'Total Experience', 'Current Salary', 'Expected Salary', 'Notice Period',
    // Education Details
    'Highest Qualification', 'Degree', 'Specialization', 'University/College', 
    'Education Year', 'Education Percentage/CGPA', 'Additional Qualifications',
    // Skills & Expertise
    'Technical Skills', 'Soft Skills', 'Languages Known', 'Certifications',
    // Work Experience
    'Previous Companies', 'Job Titles', 'Work Duration', 'Key Achievements',
    // Additional Information
    'Projects', 'Awards', 'Publications', 'References', 'LinkedIn Profile', 
    'Portfolio URL', 'GitHub Profile', 'Summary/Objective',
    // File Information
    'Resume Text', 'File Name', 'Drive File ID', 'Drive File URL',
    // System Fields
    'Status', 'Tags', 'Rating', 'Notes', 'Uploaded At', 'Updated At', 
    'Last Contacted', 'Interview Status', 'Feedback'
  ];
  
  // Set headers if they don't exist
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format headers
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('white');
    headerRange.setFontWeight('bold');
    
    // Freeze header row
    sheet.setFrozenRows(1);
  }
  
  Logger.log('Spreadsheet initialized successfully');
}

/**
 * Add data validation for status and other fields
 * FIXED: Correct column references based on actual sheet structure
 */
function addDataValidation() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);

  // Determine dynamic range length
  const lastRow = Math.max(sheet.getLastRow(), 1000);
  const lastCol = Math.max(sheet.getLastColumn(), 54); // A..BB

  // 1) Clear ALL data validations in the data region (A2:BB)
  sheet.getRange(2, 1, lastRow - 1, lastCol).clearDataValidations();

  // 2) Explicitly ensure AX and AY (Uploaded At, Updated At) have NO validation
  // AX = 50, AY = 51 (1-indexed columns)
  sheet.getRange(2, 50, lastRow - 1, 1).clearDataValidations();
  sheet.getRange(2, 51, lastRow - 1, 1).clearDataValidations();

  // 3) Apply ONLY the intended dropdowns
  // Status validation (AT column = 46)
  const statusRange = sheet.getRange(2, 46, lastRow - 1, 1); // AT2:AT{lastRow}
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['new', 'reviewed', 'shortlisted', 'interviewed', 'selected', 'rejected', 'on-hold'])
    .setAllowInvalid(false)
    .build();
  statusRange.setDataValidation(statusRule);

  // Interview Status (BA column = 53)
  const interviewRange = sheet.getRange(2, 53, lastRow - 1, 1); // BA2:BA{lastRow}
  const interviewRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['not-scheduled', 'scheduled', 'completed', 'no-show', 'rescheduled'])
    .setAllowInvalid(false)
    .build();
  interviewRange.setDataValidation(interviewRule);

  Logger.log('Data validation reset and applied correctly (AT, BA only).');
}

// Helper: quickly clear misapplied dropdowns on AX and AY only
function clearDateColumnValidations() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  const lastRow = Math.max(sheet.getLastRow(), 1000);

  // AX (Uploaded At) & AY (Updated At)
  sheet.getRange(2, 50, lastRow - 1, 1).clearDataValidations();
  sheet.getRange(2, 51, lastRow - 1, 1).clearDataValidations();
  Logger.log('Cleared validations on AX and AY.');
}

/**
 * Update candidate status - can be called from external systems
 * FIXED: Correct column references
 */
function updateCandidateStatus(candidateId, newStatus) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  // Find the candidate by ID (column A = 0)
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === candidateId) {
      // Update status (column AT = 45, 0-indexed)
      sheet.getRange(i + 1, 46).setValue(newStatus);
      // Update timestamp (column AY = 50, 0-indexed)
      sheet.getRange(i + 1, 51).setValue(new Date().toISOString());
      
      Logger.log(`Updated candidate ${candidateId} status to ${newStatus}`);
      return true;
    }
  }
  
  Logger.log(`Candidate ${candidateId} not found`);
  return false;
}

/**
 * Bulk update candidate statuses
 * FIXED: Correct column references
 */
function bulkUpdateStatus(candidateIds, newStatus) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  let updatedCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    if (candidateIds.includes(data[i][0])) {
      sheet.getRange(i + 1, 46).setValue(newStatus); // Status (column AT)
      sheet.getRange(i + 1, 51).setValue(new Date().toISOString()); // Updated At (column AY)
      updatedCount++;
    }
  }
  
  Logger.log(`Bulk updated ${updatedCount} candidates to status: ${newStatus}`);
  return updatedCount;
}

/**
 * Create analytics dashboard
 */
function createAnalyticsDashboard() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Create or get dashboard sheet
  let dashSheet = ss.getSheetByName('Analytics');
  if (!dashSheet) {
    dashSheet = ss.insertSheet('Analytics');
  }
  
  dashSheet.clear();
  
  // Title
  dashSheet.getRange('A1').setValue('Truckinzy Candidate Analytics');
  dashSheet.getRange('A1').setFontSize(18).setFontWeight('bold');
  
  // Status breakdown
  dashSheet.getRange('A3').setValue('Status Breakdown');
  dashSheet.getRange('A3').setFontWeight('bold');
  
  const statusLabels = ['New', 'Reviewed', 'Shortlisted', 'Interviewed', 'Selected', 'Rejected', 'On Hold'];
  const statusValues = ['new', 'reviewed', 'shortlisted', 'interviewed', 'selected', 'rejected', 'on-hold'];
  
  for (let i = 0; i < statusLabels.length; i++) {
    dashSheet.getRange(4 + i, 1).setValue(statusLabels[i]);
    dashSheet.getRange(4 + i, 2).setFormula(`=COUNTIF(Sheet1!AT:AT,"${statusValues[i]}")`);
  }
  
  // Role breakdown
  dashSheet.getRange('D3').setValue('Top Roles');
  dashSheet.getRange('D3').setFontWeight('bold');
  
  // Total candidates
  dashSheet.getRange('A12').setValue('Total Candidates');
  dashSheet.getRange('A12').setFontWeight('bold');
  dashSheet.getRange('B12').setFormula('=COUNTA(Sheet1!A:A)-1');
  
  Logger.log('Analytics dashboard created');
}

/**
 * Send notification emails for status changes
 */
function sendStatusChangeNotification(candidateName, oldStatus, newStatus) {
  const recipient = 'hr@truckinzy.com'; // Change to your email
  const subject = `Status Update: ${candidateName}`;
  const body = `
    Candidate status has been updated:
    
    Name: ${candidateName}
    Previous Status: ${oldStatus}
    New Status: ${newStatus}
    Updated: ${new Date().toLocaleString()}
    
    Please check the dashboard for more details.
    
    Best regards,
    Truckinzy Platform
  `;
  
  try {
    MailApp.sendEmail(recipient, subject, body);
    Logger.log(`Status change notification sent for ${candidateName}`);
  } catch (error) {
    Logger.log(`Failed to send notification: ${error.toString()}`);
  }
}

/**
 * Setup triggers for automation
 */
function setupTriggers() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Create trigger for sheet changes
  ScriptApp.newTrigger('onSheetEdit')
    .timeBased()
    .everyMinutes(1)
    .create();
  
  Logger.log('Triggers setup completed');
}

/**
 * Handle sheet edits (for status change notifications)
 */
function onSheetEdit(e) {
  // This would be triggered on sheet edits
  // You can add logic here to detect status changes and send notifications
  Logger.log('Sheet edit detected');
}

/**
 * Main setup function - run this once
 */
function setupTruckinzyPlatform() {
  initializeSpreadsheet();
  addDataValidation();
  createAnalyticsDashboard();
  setupTriggers();
  
  Logger.log('Truckinzy platform setup completed successfully!');
}

/**
 * Test function to verify everything works
 */
function testUpdate() {
  // Test updating a candidate status
  const testId = 'test123';
  const result = updateCandidateStatus(testId, 'reviewed');
  Logger.log(`Test update result: ${result}`);
}

/**
 * FIXED: Function to correct existing data alignment issues
 * Run this to fix the misaligned data in your sheet
 */
function fixDataAlignment() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  Logger.log('Starting data alignment fix...');
  
  // Process each row starting from row 2 (skip header)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Check if this row has misaligned data
    if (row.length > 0 && row[0]) { // If row has data
      
      Logger.log(`Processing row ${i + 1}: ${row[1] || 'Unknown'}`);
      
      // Fix: Move data to correct columns based on your sheet structure
      // Column mapping based on your screenshot:
      // row[40] = File Name (should be just filename, not URL)
      // row[42] = Drive File URL (should contain the full blob URL)
      // row[45] = Status (should contain status like "new")
      // row[46] = Tags (should be empty or contain tags)
      // row[47] = Rating (should be empty or contain rating)
      // row[48] = Notes (should be empty or contain notes)
      // row[49] = Uploaded At (should contain timestamp)
      // row[50] = Updated At (should contain timestamp)
      // row[51] = Last Contacted (should be empty or contain date)
      // row[52] = Interview Status (should contain "not-scheduled")
      // row[53] = Feedback (should be empty)
      
      let hasChanges = false;
      
      // Fix File Name - extract just the filename from URL if it's a URL
      if (row[40] && typeof row[40] === 'string' && row[40].includes('http')) {
        const url = row[40];
        const filename = url.split('/').pop(); // Get filename from URL
        if (filename) {
          sheet.getRange(i + 1, 41).setValue(filename);
          Logger.log(`Fixed filename for row ${i + 1}: ${filename}`);
          hasChanges = true;
        }
      }
      
      // Fix Drive File URL - if filename contains URL, move it to correct column
      if (row[40] && typeof row[40] === 'string' && row[40].includes('http')) {
        sheet.getRange(i + 1, 43).setValue(row[40]); // Move URL to Drive File URL column
        Logger.log(`Moved URL to Drive File URL column for row ${i + 1}`);
        hasChanges = true;
      }
      
      // Fix Status - if it's empty but should have a value
      if (!row[45] || row[45] === '') {
        sheet.getRange(i + 1, 46).setValue('new');
        Logger.log(`Set status to 'new' for row ${i + 1}`);
        hasChanges = true;
      }
      
      // Fix Interview Status - if it's in wrong column (like Updated At)
      if (row[50] === 'not-scheduled') {
        // This is interview status, move it to the correct column
        sheet.getRange(i + 1, 53).setValue('not-scheduled'); // Move to Interview Status column
        sheet.getRange(i + 1, 51).setValue(''); // Clear from Updated At column
        Logger.log(`Fixed interview status for row ${i + 1}`);
        hasChanges = true;
      }
      
      // Fix Uploaded At - if timestamp is in wrong column (Rating)
      if (row[47] && typeof row[47] === 'string' && row[47].includes('T')) {
        // This looks like a timestamp, move it to Uploaded At
        sheet.getRange(i + 1, 50).setValue(row[47]);
        sheet.getRange(i + 1, 48).setValue(''); // Clear from Rating column
        Logger.log(`Fixed uploaded timestamp for row ${i + 1}`);
        hasChanges = true;
      }
      
      // Fix Updated At - if it's empty but should have a timestamp
      if (!row[50] || row[50] === '') {
        sheet.getRange(i + 1, 51).setValue(new Date().toISOString());
        Logger.log(`Set updated timestamp for row ${i + 1}`);
        hasChanges = true;
      }
      
      // If we made changes, pause briefly to avoid overwhelming the API
      if (hasChanges) {
        Utilities.sleep(100); // 100ms pause
      }
    }
  }
  
  Logger.log('Data alignment fix completed!');
  Logger.log('Note: Check the sheet to ensure data is now in correct columns');
}

/**
 * SAFER VERSION: Function to correct data alignment with validation handling
 * This version is more careful about data validation conflicts
 * UPDATED: Uses exact column mapping matching your Google Sheets structure
 */
function fixDataAlignmentSafely() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  Logger.log('Starting SAFE data alignment fix with exact column mapping...');
  
  // First, temporarily disable data validation to avoid conflicts
  Logger.log('Temporarily disabling data validation...');
  sheet.clearDataValidations();
  
  try {
    // Process each row starting from row 2 (skip header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Check if this row has misaligned data
      if (row.length > 0 && row[0]) { // If row has data
        Logger.log(`Processing row ${i + 1}: ${row[1] || 'Unknown'}`);
        
        let hasChanges = false;
        
        // EXACT COLUMN MAPPING BASED ON YOUR HEADERS:
        // Column 40 (AO) = Summary/Objective
        // Column 41 (AP) = Resume Text
        // Column 42 (AQ) = File Name
        // Column 43 (AR) = Drive File ID
        // Column 44 (AS) = Drive File URL
        // Column 45 (AT) = Status
        // Column 46 (AU) = Tags
        // Column 47 (AV) = Rating
        // Column 48 (AW) = Notes
        // Column 49 (AX) = Uploaded At
        // Column 50 (AY) = Updated At
        // Column 51 (AZ) = Last Contacted
        // Column 52 (BA) = Interview Status
        // Column 53 (BB) = Feedback
        
        // Fix File Name - extract just the filename from URL if it's a URL
        if (row[42] && typeof row[42] === 'string' && row[42].includes('http')) {
          const url = row[42];
          const filename = url.split('/').pop(); // Get filename from URL
          if (filename) {
            sheet.getRange(i + 1, 43).setValue(filename); // Column 42 (AQ) = File Name
            Logger.log(`Fixed filename for row ${i + 1}: ${filename}`);
            hasChanges = true;
          }
        }
        
        // Fix Drive File URL - if filename contains URL, move it to correct column
        if (row[42] && typeof row[42] === 'string' && row[42].includes('http')) {
          sheet.getRange(i + 1, 45).setValue(row[42]); // Move URL to Drive File URL column (44)
          Logger.log(`Moved URL to Drive File URL column for row ${i + 1}`);
          hasChanges = true;
        }
        
        // Fix Status - if it's empty but should have a value
        if (!row[45] || row[45] === '') {
          sheet.getRange(i + 1, 46).setValue('new'); // Column 45 (AT) = Status
          Logger.log(`Set status to 'new' for row ${i + 1}`);
          hasChanges = true;
        }
        
        // Fix Interview Status - if it's in wrong column (like Updated At)
        if (row[50] === 'not-scheduled') {
          // This is interview status, move it to the correct column
          sheet.getRange(i + 1, 53).setValue('not-scheduled'); // Move to Interview Status column (52)
          sheet.getRange(i + 1, 51).setValue(''); // Clear from Updated At column (50)
          Logger.log(`Fixed interview status for row ${i + 1}`);
          hasChanges = true;
        }
        
        // Fix Uploaded At - if timestamp is in wrong column (like Rating)
        if (row[47] && typeof row[47] === 'string' && row[47].includes('T')) {
          // This looks like a timestamp, move it to Uploaded At
          sheet.getRange(i + 1, 50).setValue(row[47]); // Column 49 (AX) = Uploaded At
          sheet.getRange(i + 1, 48).setValue(''); // Clear from Rating column (47)
          Logger.log(`Fixed uploaded timestamp for row ${i + 1}`);
          hasChanges = true;
        }
        
        // Fix Updated At - if it's empty but should have a timestamp
        if (!row[50] || row[50] === '') {
          sheet.getRange(i + 1, 51).setValue(new Date().toISOString()); // Column 50 (AY) = Updated At
          Logger.log(`Set updated timestamp for row ${i + 1}`);
          hasChanges = true;
        }
        
        // If we made changes, pause briefly to avoid overwhelming the API
        if (hasChanges) {
          Utilities.sleep(100); // 100ms pause
        }
      }
    }
    
    Logger.log('Data alignment completed successfully!');
    
  } catch (error) {
    Logger.log(`Error during data alignment: ${error.toString()}`);
    throw error;
  } finally {
    // Always reapply data validation rules
    Logger.log('Reapplying data validation rules...');
    addDataValidation();
    Logger.log('Data validation rules restored');
  }
  
  Logger.log('SAFE data alignment fix completed!');
  Logger.log('Note: Check the sheet to ensure data is now in correct columns');
}

/**
 * FIXED: Function to verify column mapping is correct
 * Run this to check your current sheet structure
 * UPDATED: Shows exact column mapping matching your Google Sheets structure
 */
function verifyColumnMapping() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  // Get headers
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  Logger.log('Current column mapping:');
  for (let i = 0; i < headers.length; i++) {
    const columnLetter = String.fromCharCode(65 + i); // Convert to A, B, C, etc.
    Logger.log(`Column ${columnLetter} (${i + 1}): ${headers[i]}`);
  }
  
  // Check specific columns that are causing issues
  // EXACT COLUMN MAPPING BASED ON YOUR HEADERS:
  const keyColumns = [
    { index: 40, name: 'Summary/Objective', letter: 'AO' },
    { index: 41, name: 'Resume Text', letter: 'AP' },
    { index: 42, name: 'File Name', letter: 'AQ' },
    { index: 43, name: 'Drive File ID', letter: 'AR' },
    { index: 44, name: 'Drive File URL', letter: 'AS' },
    { index: 45, name: 'Status', letter: 'AT' },
    { index: 49, name: 'Uploaded At', letter: 'AX' },
    { index: 50, name: 'Updated At', letter: 'AY' },
    { index: 52, name: 'Interview Status', letter: 'BA' }
  ];
  
  Logger.log('\nKey columns check:');
  keyColumns.forEach(col => {
    const value = headers[col.index] || 'EMPTY';
    Logger.log(`Column ${col.letter} (${col.index + 1}): ${value}`);
  });
  
  Logger.log('\nExpected column mapping:');
  Logger.log('Column AO (41): Summary/Objective');
  Logger.log('Column AP (42): Resume Text');
  Logger.log('Column AQ (43): File Name');
  Logger.log('Column AR (44): Drive File ID');
  Logger.log('Column AS (45): Drive File URL');
  Logger.log('Column AT (46): Status');
  Logger.log('Column AX (50): Uploaded At');
  Logger.log('Column AY (51): Updated At');
  Logger.log('Column BA (53): Interview Status');
}

/**
 * NEW: Function to analyze current data structure and identify misalignment issues
 * Run this BEFORE running fixDataAlignment to see what needs to be fixed
 * UPDATED: Uses exact column mapping matching your Google Sheets structure
 */
function analyzeDataMisalignment() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  Logger.log('=== DATA MISALIGNMENT ANALYSIS ===');
  Logger.log('Using exact column mapping from your Google Sheets structure');
  
  if (data.length <= 1) {
    Logger.log('No data rows found to analyze');
    return;
  }
  
  const headers = data[0];
  const dataRows = data.slice(1);
  
  Logger.log(`Analyzing ${dataRows.length} data rows...`);
  
  let totalIssues = 0;
  
  // EXACT COLUMN MAPPING BASED ON YOUR HEADERS:
  // Column 40 (AO) = Summary/Objective
  // Column 41 (AP) = Resume Text
  // Column 42 (AQ) = File Name
  // Column 43 (AR) = Drive File ID
  // Column 44 (AS) = Drive File URL
  // Column 45 (AT) = Status
  // Column 46 (AU) = Tags
  // Column 47 (AV) = Rating
  // Column 48 (AW) = Notes
  // Column 49 (AX) = Uploaded At
  // Column 50 (AY) = Updated At
  // Column 51 (AZ) = Last Contacted
  // Column 52 (BA) = Interview Status
  // Column 53 (BB) = Feedback
  
  // Analyze each data row
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 2; // +2 because we start from row 2 and i starts from 0
    const candidateName = row[1] || 'Unknown';
    
    Logger.log(`\n--- Row ${rowNumber}: ${candidateName} ---`);
    
    let rowIssues = 0;
    
    // Check File Name column (should contain filename, not URL)
    if (row[42] && typeof row[42] === 'string' && row[42].includes('http')) {
      Logger.log(`❌ File Name contains URL instead of filename: ${row[42].substring(0, 50)}...`);
      rowIssues++;
    }
    
    // Check Drive File URL column (should contain URL)
    if (!row[44] || row[44] === '') {
      Logger.log(`❌ Drive File URL is empty`);
      rowIssues++;
    }
    
    // Check Status column (should contain valid status)
    if (!row[45] || row[45] === '') {
      Logger.log(`❌ Status is empty`);
      rowIssues++;
    } else if (!['new', 'reviewed', 'shortlisted', 'interviewed', 'selected', 'rejected', 'on-hold'].includes(row[45])) {
      Logger.log(`❌ Status has invalid value: ${row[45]}`);
      rowIssues++;
    }
    
    // Check if timestamp is in wrong column (Rating)
    if (row[47] && typeof row[47] === 'string' && row[47].includes('T')) {
      Logger.log(`❌ Timestamp found in Rating column: ${row[47]}`);
      rowIssues++;
    }
    
    // Check if interview status is in wrong column (Updated At)
    if (row[50] === 'not-scheduled') {
      Logger.log(`❌ Interview status found in Updated At column: ${row[50]}`);
      rowIssues++;
    }
    
    // Check Uploaded At column
    if (!row[49] || row[49] === '') {
      Logger.log(`❌ Uploaded At is empty`);
      rowIssues++;
    }
    
    // Check Interview Status column
    if (!row[52] || row[52] === '') {
      Logger.log(`❌ Interview Status is empty`);
      rowIssues++;
    }
    
    if (rowIssues === 0) {
      Logger.log(`✅ Row ${rowNumber} looks good`);
    } else {
      Logger.log(`⚠️  Row ${rowNumber} has ${rowIssues} issues`);
      totalIssues += rowIssues;
    }
  }
  
  Logger.log(`\n=== ANALYSIS COMPLETE ===`);
  Logger.log(`Total issues found: ${totalIssues}`);
  
  if (totalIssues > 0) {
    Logger.log(`\nRecommendation: Run fixDataAlignmentSafely() to fix these issues`);
  } else {
    Logger.log(`\n✅ No data misalignment issues found!`);
  }
}
