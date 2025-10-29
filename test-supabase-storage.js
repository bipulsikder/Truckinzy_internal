// Test script for Supabase storage integration
require('dotenv').config({ path: '.env.test' });
const { ensureResumeBucketExists, checkFileExistsInSupabase, uploadFileToSupabase, deleteFileFromSupabase } = require('./lib/supabase-storage-utils');

async function testSupabaseStorage() {
  console.log('=== Testing Supabase Storage Integration ===');
  
  try {
    // Test 0: Ensure bucket exists
    console.log('\n0. Ensuring bucket exists...');
    const bucketExists = await ensureResumeBucketExists();
    if (!bucketExists) {
      throw new Error('Failed to ensure bucket exists');
    }
    console.log('✅ Bucket exists or was created successfully');
    
    // Test 1: Upload a test file
    console.log('\n1. Testing file upload...');
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = `Test file content created at ${new Date().toISOString()}`;
    // Create a Buffer instead of File object for Node.js environment
    const testBuffer = Buffer.from(testContent);
    
    const uploadResult = await uploadFileToSupabase(testBuffer, testFileName);
    console.log('Upload result:', uploadResult);
    
    if (!uploadResult) {
      throw new Error('File upload failed');
    }
    
    // Test 2: Check if file exists
    console.log('\n2. Testing file existence check...');
    const fileExists = await checkFileExistsInSupabase(testFileName);
    console.log(`File exists: ${fileExists}`);
    
    if (!fileExists) {
      throw new Error('File existence check failed');
    }
    
    // Test 3: Delete the test file
    console.log('\n3. Testing file deletion...');
    const deleteResult = await deleteFileFromSupabase(testFileName);
    console.log('Delete result:', deleteResult);
    
    if (!deleteResult) {
      throw new Error('File deletion failed');
    }
    
    // Test 4: Verify file is deleted
    console.log('\n4. Verifying file deletion...');
    const fileExistsAfterDeletion = await checkFileExistsInSupabase(testFileName);
    console.log(`File exists after deletion: ${fileExistsAfterDeletion}`);
    
    if (fileExistsAfterDeletion) {
      throw new Error('File still exists after deletion');
    }
    
    console.log('\n=== Supabase Storage Integration Tests Completed Successfully ===');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
}

testSupabaseStorage();