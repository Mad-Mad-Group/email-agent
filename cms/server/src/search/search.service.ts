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

  async run(dto: SearchDto) {
    const task = await this.tasks.enqueue({
      skill_id: SKILL.SEARCH, // S1 搵客源
      title: `搜尋：${dto.keyword} ${dto.location}（目標 ${dto.targetCount}）`,
      params: {
        keyword: dto.keyword,
        location: dto.location,
        target_count: dto.targetCount,
      },
    });
    return { task_id: task.task_id, status: task.status };
  }
}
