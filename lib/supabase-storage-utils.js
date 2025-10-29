// Import supabase directly from the module
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Regular client for most operations
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client with service role for operations that require higher privileges
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

// Bucket name for resume files
const BUCKET_NAME = 'resume-files'

/**
 * Ensures that the resume-files bucket exists
 * @returns {Promise<boolean>} - True if bucket exists or was created successfully
 */
async function ensureResumeBucketExists() {
  try {
    // Check if bucket exists using admin client
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()
    
    if (listError) {
      console.error('Error checking buckets:', listError)
      return false
    }
    
    // Check if our bucket exists
    const bucketExists = buckets.some(bucket => bucket.name === BUCKET_NAME)
    
    if (bucketExists) {
      console.log(`Bucket '${BUCKET_NAME}' already exists`)
      return true
    }
    
    // Create bucket if it doesn't exist using admin client
    const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    })
    
    if (createError) {
      console.error('Error creating bucket:', createError)
      return false
    }
    
    console.log(`Bucket '${BUCKET_NAME}' created successfully`)
    return true
  } catch (error) {
    console.error('Error ensuring bucket exists:', error)
    return false
  }
}

/**
 * Check if a file exists in Supabase Storage
 * @param {string} fileName - The name of the file to check
 * @returns {Promise<boolean>} - True if the file exists, false otherwise
 */
async function checkFileExistsInSupabase(fileName) {
  try {
    // Ensure bucket exists before checking
    const bucketExists = await ensureResumeBucketExists();
    if (!bucketExists) {
      console.error('Bucket does not exist and could not be created');
      return false;
    }
    
    // Use admin client to bypass RLS policies
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list("", {
        search: fileName,
      })

    if (error) {
      console.error("Error checking file existence in Supabase:", error)
      return false
    }

    return data && data.length > 0
  } catch (error) {
    console.error("Error checking file existence in Supabase:", error)
    return false
  }
}

// Module exports will be at the end of the file

/**
 * Upload a file to Supabase Storage
 * @param {File|Buffer} file - The file or buffer to upload
 * @param {string} fileName - The name to give the file in storage
 * @returns {Promise<{path: string, url: string} | null>} - The path and URL of the uploaded file, or null if upload failed
 */
async function uploadFileToSupabase(file, fileName) {
  try {
    // Ensure bucket exists before uploading
    const bucketExists = await ensureResumeBucketExists();
    if (!bucketExists) {
      console.error('Bucket does not exist and could not be created');
      return null;
    }
    
    // Determine content type based on file extension
    let contentType = 'application/octet-stream';
    if (fileName.endsWith('.pdf')) contentType = 'application/pdf';
    if (fileName.endsWith('.docx')) contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (fileName.endsWith('.doc')) contentType = 'application/msword';
    if (fileName.endsWith('.txt')) contentType = 'text/plain';
    
    // Use admin client for upload to bypass RLS policies
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: contentType
      })

    if (error) {
      console.error("Error uploading file to Supabase:", error)
      return null
    }

    // Get the public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path)

    return {
      path: data.path,
      url: publicUrl
    }
  } catch (error) {
    console.error("Error uploading file to Supabase:", error)
    return null
  }
}

/**
 * Delete a file from Supabase Storage
 * @param {string} fileName - The name of the file to delete
 * @returns {Promise<boolean>} - True if deletion was successful, false otherwise
 */
async function deleteFileFromSupabase(fileName) {
  try {
    // Ensure bucket exists before deleting
    const bucketExists = await ensureResumeBucketExists();
    if (!bucketExists) {
      console.error('Bucket does not exist and could not be created');
      return false;
    }
    
    // Use admin client to bypass RLS policies
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([fileName])

    if (error) {
      console.error("Error deleting file from Supabase:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error deleting file from Supabase:", error)
    return false
  }
}

module.exports = {
  BUCKET_NAME,
  ensureResumeBucketExists,
  checkFileExistsInSupabase,
  uploadFileToSupabase,
  deleteFileFromSupabase
}