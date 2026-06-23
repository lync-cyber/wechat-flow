export interface UploadMeta {
  filename: string;
  contentType: string;
}

export interface UploadResult {
  url: string;
}

export interface ImageHostAdapter {
  readonly name: string;
  upload(data: Uint8Array, meta: UploadMeta): Promise<UploadResult>;
}
