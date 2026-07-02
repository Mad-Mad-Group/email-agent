import { BadRequestException } from '@nestjs/common';
import { canTransition, LeadStatus } from './dto/lead-status.enum';

/**
 * 純狀態機測試（唔需要 Mongo）。
 * 跑：npm run test -- leads.service.spec
 * 待 B 嘅測試基建好咗，再補 LeadsService 連 mongodb-memory-server 嘅整合測試。
 */
describe('Lead status machine', () => {
  it('new → pending 合法', () => {
    expect(canTransition(LeadStatus.NEW, LeadStatus.PENDING)).toBe(true);
  });

  it('pending → contacted 合法', () => {
    expect(canTransition(LeadStatus.PENDING, LeadStatus.CONTACTED)).toBe(true);
  });

  it('contacted 係終態，唔可以走返轉頭', () => {
    expect(canTransition(LeadStatus.CONTACTED, LeadStatus.NEW)).toBe(false);
    expect(canTransition(LeadStatus.CONTACTED, LeadStatus.PENDING)).toBe(false);
  });

  it('set 返同一個狀態 = 冪等, 唔報錯', () => {
    expect(canTransition(LeadStatus.PENDING, LeadStatus.PENDING)).toBe(true);
  });
});

// 提醒：service 收到非法轉移時掉 BadRequestException
const _typecheck: typeof BadRequestException = BadRequestException;
void _typecheck;
