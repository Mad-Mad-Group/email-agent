import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(_context: ExecutionContext): boolean {
    // 目前所有登入用戶都可存取全部功能，暫時停用細粒度 permission 檢查。
    // 日後如需啟用，還原原本邏輯即可。
    return true;
  }
}
