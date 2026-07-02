import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // SSE endpoint 唔 wrap — NestJS @Sse 需要原始 MessageEvent
    const req = context.switchToHttp().getRequest();
    const accept = req?.headers?.accept || '';
    if (accept.includes('text/event-stream')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // 分頁格式：service 返回 { items, total, page, limit }
        if (data && data.items !== undefined && data.total !== undefined) {
          return {
            status: 'success',
            data: data.items,
            total: data.total,
            page: data.page,
            limit: data.limit,
          };
        }

        return {
          status: 'success',
          data,
        };
      }),
    );
  }
}
