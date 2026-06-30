import { Injectable } from '@nestjs/common';
import { LeadsService } from '../leads/leads.service';
import { TasksService } from '../tasks/tasks.service';
import { SKILL } from '../tasks/dto/task-status.enum';

/**
 * enqueue 模式：Scraper 唔自己爬，派一個 **S2** task（mode=enrich）俾 Hermes agent
 * （佢有 browser）。agent browse 官網補返 email/phone/address，寫返 lead，回報 task。
 */
@Injectable()
export class ScraperService {
  constructor(
    private readonly leads: LeadsService,
    private readonly tasks: TasksService,
  ) {}

  /** 為一個 lead（by _id）派 enrichment task */
  async enrich(id: string) {
    const lead = await this.leads.findOne(id);
    const task = await this.tasks.enqueue({
      skill_id: SKILL.ANALYZE, // S2 深度分析（含 enrich）
      title: `Enrich：${lead.company_name}`,
      params: {
        mode: 'enrich',
        lead_id: lead.lead_id,
        lead_object_id: id,
        website: lead.website,
      },
    });
    return { task_id: task.task_id, status: task.status, lead_id: lead.lead_id };
  }
}
