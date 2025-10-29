import mammoth from 'mammoth';

/**
 * Converts a DOCX file to HTML for browser preview
 * @param file The DOCX file to convert
 * @returns Promise with HTML string
 */
export async function convertDocxToHtml(file: File): Promise<string> {
  try {
    console.log(`🔄 Converting DOCX to HTML: ${file.name}`);
    
    // Check if it's a DOCX file
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    if (!fileType.includes('docx') && !fileName.endsWith('.docx')) {
      throw new Error('Not a DOCX file');
    }
    
    // Get array buffer from file
    const arrayBuffer = await file.arrayBuffer();
    
    // Convert to HTML using mammoth
    const result = await mammoth.convertToHtml({ arrayBuffer });
    
    if (!result || !result.value) {
      throw new Error('Failed to convert DOCX to HTML');
    }
    
    // Add some basic styling to make it look better
    const html = `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              margin: 20px;
              color: #333;
            }
            h1, h2, h3, h4, h5, h6 {
              margin-top: 1.5em;
              margin-bottom: 0.5em;
              color: #2563eb;
            }
            p {
              margin-bottom: 1em;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin-bottom: 1em;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
            }
            th {
              background-color: #f2f2f2;
            }
            img {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          ${result.value}
        </body>
      </html>
    `;
    
    console.log('✅ DOCX to HTML conversion successful');
    return html;
  } catch (error) {
    console.error('❌ DOCX to HTML conversion error:', error);
    throw error;
  }
}

/**
 * Creates a data URL from HTML content for iframe display
 * @param html HTML content
 * @returns Data URL with HTML content
 */
export function createHtmlDataUrl(html: string): string {
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}