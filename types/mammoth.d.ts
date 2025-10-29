declare module 'mammoth' {
  interface ExtractRawTextOptions {
    arrayBuffer: ArrayBuffer;
  }

  interface ConvertToHtmlOptions {
    arrayBuffer: ArrayBuffer;
  }

  interface ConvertResult {
    value: string;
    messages: any[];
  }

  interface ExtractRawTextResult {
    value: string;
    messages: any[];
  }

  function extractRawText(options: ExtractRawTextOptions): Promise<ExtractRawTextResult>;
  function convertToHtml(options: ConvertToHtmlOptions): Promise<ConvertResult>;

  export = {
    extractRawText,
    convertToHtml
  };
}