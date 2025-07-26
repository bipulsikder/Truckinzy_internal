declare module 'mammoth' {
  interface ExtractRawTextOptions {
    arrayBuffer: ArrayBuffer;
  }

  interface ExtractRawTextResult {
    value: string;
    messages: any[];
  }

  function extractRawText(options: ExtractRawTextOptions): Promise<ExtractRawTextResult>;

  export = {
    extractRawText
  };
} 