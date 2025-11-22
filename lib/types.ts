export interface BulkImportProgressEvent {
  type: 'progress' | 'complete' | 'error';
  done?: number;
  total?: number;
  currentFile?: string;
  summary?: {
    total: number;
    successful: number;
    failed: number;
    errors: { url: string; error: string }[];
  };
  message?: string;
}