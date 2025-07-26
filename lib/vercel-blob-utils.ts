import { put } from "@vercel/blob"

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
