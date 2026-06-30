import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LeadsService } from '../leads/leads.service';
import { TasksService } from '../tasks/tasks.service';
import { SKILL } from '../tasks/dto/task-status.enum';
import { Analysis, AnalysisDocument } from './schemas/analysis.schema';

/**
 * enqueue 模式：AI Analysis 唔再自己 call MiniMax，而係派一個 S2 task
 * 俾 Hermes agent（佢有 MiniMax + browser）。agent 做完會回寫 lead `_collab_*`
 * + analyses，再回報 task。本 service 只負責 enqueue + 讀返結果。
 */
@Injectable()
export class AiAnalysisService {
  constructor(
    @InjectModel(Analysis.name)
    private readonly analysisModel: Model<AnalysisDocument>,
    private readonly leads: LeadsService,
    private readonly tasks: TasksService,
  ) {}

  /** 派一個分析 task（by lead _id） */
  async analyzeLead(id: string) {
    const lead = await this.leads.findOne(id); // 驗證存在
    const task = await this.tasks.enqueue({
      skill_id: SKILL.ANALYZE, // S2 深度分析客戶
      title: `分析：${lead.company_name}`,
      params: { lead_id: lead.lead_id, lead_object_id: id },
    });
    return { task_id: task.task_id, status: task.status, lead_id: lead.lead_id };
  }

  /** 攞一個 lead（by _id）嘅歷史分析（Hermes 寫入嘅結果） */
  async listForLead(id: string) {
    const lead = await this.leads.findOne(id);
    if (!lead.lead_id) return [];
    return this.analysisModel
      .find({ lead_id: lead.lead_id })
      .sort({ _analyzed_at: -1 })
      .lean()
      .exec();
  }
}
