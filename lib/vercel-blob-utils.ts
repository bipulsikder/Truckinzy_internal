import { put, del } from "@vercel/blob"

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
