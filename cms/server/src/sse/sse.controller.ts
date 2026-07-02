import { Body, Controller, MessageEvent, Post, Sse } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Observable, interval, map, merge, of } from 'rxjs';
import { SseService, SseEvent } from './sse.service';

@ApiTags('SSE 即時事件')
@Controller()
export class SseController {
  constructor(private readonly sse: SseService) {}

  /** Worker 用呢個 endpoint 推 SSE 事件俾前端 */
  @Post('sse/notify')
  notify(@Body() body: { type: string; data: any }) {
    const event = body.type as SseEvent;
    this.sse.emit(event, body.data);
    return { ok: true };
  }

  /**
   * GET /api/events —— SSE 串流。
   * 前端：
   *   const es = new EventSource('/api/events');
   *   es.addEventListener('lead_update', e => console.log(JSON.parse(e.data)));
   *   es.addEventListener('hermes_log', ...);
   *   es.addEventListener('pipeline_progress', ...);
   */
  @Sse('events')
  events(): Observable<MessageEvent> {
    // 連接後立即發一個 connected event，確認 SSE 正常
    const hello = of<MessageEvent>({ type: 'ping', data: { ts: Date.now(), msg: 'connected' } });
    // 每 15 秒一個 heartbeat，避免 proxy/瀏覽器斷線
    const heartbeat = interval(15_000).pipe(
      map((): MessageEvent => ({ type: 'ping', data: { ts: Date.now() } })),
    );
    return merge(hello, this.sse.asObservable(), heartbeat);
  }
}
