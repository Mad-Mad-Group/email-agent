import { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SseService } from './sse.service';
export declare class SseController {
    private readonly sse;
    constructor(sse: SseService);
    events(): Observable<MessageEvent>;
}
