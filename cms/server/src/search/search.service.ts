import { Injectable } from '@nestjs/common';
import { TasksService } from '../tasks/tasks.service';
import { SKILL } from '../tasks/dto/task-status.enum';
import { SearchDto } from './dto/search.dto';

/**
 * enqueue 模式：Search 唔再自己搵，只係派一個 S1 task 俾 Hermes agent
 * （佢有 browser + CUA）。agent 做完會寫入 leads + 回報 task。
 */
@Injectable()
export class SearchService {
  constructor(private readonly tasks: TasksService) {}

  async run(dto: SearchDto, userId?: string) {
    // 防 spam：相同 keyword + location 仲有 task 未做完，或 60 秒內啱啱派過 →
    // 唔重複派，直接回返嗰個 task（避免 spam 撳制塞爆 queue + 燒 Hermes quota）。
    const dup = await this.tasks.findActiveOrRecent(
      SKILL.SEARCH,
      { keyword: dto.keyword, location: dto.location },
      60_000,
    );
    if (dup) {
      return { task_id: dup.task_id, status: dup.status, deduped: true };
    }
    const task = await this.tasks.enqueue({
      skill_id: SKILL.SEARCH, // S1 搵客源
      title: `搜尋：${dto.keyword} ${dto.location}（目標 ${dto.targetCount}）`,
      params: {
        keyword: dto.keyword,
        location: dto.location,
        target_count: dto.targetCount,
        user_id: userId,
      },
    });
    return { task_id: task.task_id, status: task.status };
  }
}
