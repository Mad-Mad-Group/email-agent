import { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SseService } from './sse.service';
export declare class SseController {
    private readonly sse;
    constructor(sse: SseService);
    notify(body: {
        type: string;
        data: any;
    }): {
        ok: boolean;
    };
    events(): Observable<MessageEvent>;
}
