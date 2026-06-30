import { Injectable } from '@nestjs/common';

@Injectable()
export class UploadsService {
  handleUpload(file: any) {
    return {
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
