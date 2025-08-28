import { put, del, list } from "@vercel/blob"

export async function checkFileExistsInBlob(fileName: string): Promise<{ exists: boolean; url?: string; pathname?: string }> {
  try {
    console.log(`Checking if file exists in blob storage: ${fileName}`)
    
    // List all blobs to check if file exists
    const { blobs } = await list()
    
    // Check if a file with the same name exists
    const existingFile = blobs.find(blob => blob.pathname === fileName)
    
    if (existingFile) {
      console.log(`✅ File already exists in blob storage: ${fileName}`)
      return { 
        exists: true, 
        url: existingFile.url, 
        pathname: existingFile.pathname 
      }
    }
    
    console.log(`❌ File not found in blob storage: ${fileName}`)
    return { exists: false }
  } catch (error) {
    console.error("❌ Error checking file existence in blob:", error)
    // If we can't check, assume it doesn't exist and proceed with upload
    return { exists: false }
  }
}

export async function uploadFileToBlob(file: File): Promise<{ url: string; pathname: string }> {
  try {
    console.log(`Uploading file to Vercel Blob: ${file.name}`)
    const { url, pathname } = await put(file.name, file, {
      access: "public",
    })
    console.log(`✅ File uploaded to Vercel Blob: ${url}`)
    return { url, pathname }
  } catch (error) {
    console.error("❌ Failed to upload to Vercel Blob:", error)
    throw error
  }
}

export async function deleteFileFromBlob(url: string): Promise<boolean> {
  try {
    console.log(`Deleting file from Vercel Blob: ${url}`)
    await del(url)
    console.log(`✅ File deleted from Vercel Blob: ${url}`)
    return true
  } catch (error) {
    console.error("❌ Failed to delete from Vercel Blob:", error)
    throw error
  }
}
