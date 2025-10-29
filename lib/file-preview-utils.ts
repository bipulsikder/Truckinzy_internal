import { convertDocxToHtml, createHtmlDataUrl } from './docx-html-converter';

/**
 * Checks if a file is a DOCX file based on its type or name
 * @param fileUrl URL of the file
 * @param fileName Name of the file
 * @returns Boolean indicating if the file is a DOCX file
 */
export function isDocxFile(fileUrl: string, fileName: string): boolean {
  const fileUrlLower = fileUrl.toLowerCase();
  const fileNameLower = fileName.toLowerCase();
  
  return (
    fileUrlLower.endsWith('.docx') ||
    fileNameLower.endsWith('.docx') ||
    fileUrlLower.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  );
}

/**
 * Creates a preview URL for a file
 * For DOCX files, it will fetch the file and convert it to HTML for preview
 * For other files, it will return the original URL
 * 
 * @param fileUrl URL of the file to preview
 * @param fileName Name of the file
 * @returns Promise with the preview URL
 */
export async function createPreviewUrl(fileUrl: string, fileName: string): Promise<string> {
  try {
    // If it's not a DOCX file, return the original URL
    if (!isDocxFile(fileUrl, fileName)) {
      return fileUrl;
    }
    
    console.log(`🔄 Creating preview for DOCX file: ${fileName}`);
    
    // Fetch the DOCX file
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    
    // Convert the response to a blob
    const blob = await response.blob();
    
    // Create a File object from the blob
    const file = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    
    // Convert the DOCX to HTML
    const html = await convertDocxToHtml(file);
    
    // Create a data URL from the HTML
    const dataUrl = createHtmlDataUrl(html);
    
    console.log('✅ DOCX preview URL created successfully');
    return dataUrl;
  } catch (error) {
    console.error('❌ Error creating preview URL:', error);
    // Return the original URL if there's an error
    return fileUrl;
  }
}