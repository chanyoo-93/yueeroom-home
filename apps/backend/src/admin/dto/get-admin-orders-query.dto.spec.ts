import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GetAdminOrdersQueryDto } from './get-admin-orders-query.dto';

describe('GetAdminOrdersQueryDto', () => {
  it('limit이 100을 초과하면 유효성 검사 실패', async () => {
    const dto = plainToInstance(GetAdminOrdersQueryDto, { limit: 101 });

    const errors = await validate(dto);

    expect(errors.some((error) => error.constraints?.max)).toBe(true);
  });

  it('limit이 100이면 유효성 검사 통과', async () => {
    const dto = plainToInstance(GetAdminOrdersQueryDto, { limit: 100 });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
