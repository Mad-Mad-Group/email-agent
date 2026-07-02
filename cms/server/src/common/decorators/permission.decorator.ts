import { SetMetadata } from '@nestjs/common';

export const Permissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

/** 單數 alias — 方便單一權限場景 */
export const Permission = Permissions;
