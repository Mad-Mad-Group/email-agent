import { OnModuleInit } from '@nestjs/common';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { TasksService } from '../tasks/tasks.service';
import { TaskEvents } from '../tasks/task-events';
import { SseService } from '../sse/sse.service';
import { Campaign, CampaignDocument } from './schemas/campaign.schema';
import { RunHermesDto } from './dto/run-hermes.dto';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { VerifiedEmailsService } from '../verified-emails/verified-emails.service';
import { LeadsService } from '../leads/leads.service';
export declare class HermesService implements OnModuleInit {
    private readonly campaigns;
    private readonly tasks;
    private readonly taskEvents;
    private readonly sse;
    private readonly email;
    private readonly config;
    private readonly users;
    private readonly verifiedEmails;
    private readonly leads;
    constructor(campaigns: Model<CampaignDocument>, tasks: TasksService, taskEvents: TaskEvents, sse: SseService, email: EmailService, config: ConfigService, users: UsersService, verifiedEmails: VerifiedEmailsService, leads: LeadsService);
    onModuleInit(): void;
    run(dto: RunHermesDto, userId?: string): Promise<{
        campaign_id: string;
        first_task: string;
    }>;
    private onTaskCompleted;
    private onTaskFailed;
    private tryMatchVerifiedPool;
    private enqueueStage;
    private finish;
    private maybeNotifyCompletion;
    private notifyCompletion;
    getCampaign(id: string): Promise<(import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, Campaign, {}, {}> & Campaign & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | null>;
    private progress;
    private log;
}
