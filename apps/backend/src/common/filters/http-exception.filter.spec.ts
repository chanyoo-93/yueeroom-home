import {
  ArgumentsHost,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let response: { status: jest.Mock; json: jest.Mock };
  let host: ArgumentsHost;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    host = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(response),
        getRequest: jest.fn().mockReturnValue({ method: 'GET', url: '/api/test' }),
      }),
    } as unknown as ArgumentsHost;
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it('NotFoundException 404 응답에 statusCode, message, timestamp를 포함한다', () => {
    filter.catch(new NotFoundException('상품을 찾을 수 없습니다.'), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 404,
      message: '상품을 찾을 수 없습니다.',
      timestamp: expect.any(String),
    });
  });

  it('BadRequestException 배열 메시지를 그대로 응답한다', () => {
    const messages = ['name must be a string', 'price must be positive'];

    filter.catch(new BadRequestException(messages), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 400,
      message: messages,
      timestamp: expect.any(String),
    });
  });

  it('InternalServerErrorException 500은 logger.error로 기록한다', () => {
    filter.catch(new InternalServerErrorException('서버 오류'), host);

    expect(loggerErrorSpy).toHaveBeenCalledWith('[GET] /api/test 500', expect.any(String));
  });

  it('BadRequestException 400은 logger.error로 기록하지 않는다', () => {
    filter.catch(new BadRequestException('잘못된 요청입니다.'), host);

    expect(loggerErrorSpy).not.toHaveBeenCalled();
  });

  it('일반 Error는 500 표준 응답으로 변환하고 상세 메시지를 노출하지 않는다', () => {
    filter.catch(new Error('database connection failed'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: '요청을 처리할 수 없습니다.',
      timestamp: expect.any(String),
    });
    expect(response.json).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: 'database connection failed' }),
    );
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      '[GET] /api/test 500',
      expect.stringContaining('database connection failed'),
    );
  });

  it('unknown 예외도 500 표준 응답으로 변환한다', () => {
    filter.catch('unexpected failure', host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: '요청을 처리할 수 없습니다.',
      timestamp: expect.any(String),
    });
    expect(loggerErrorSpy).toHaveBeenCalledWith('[GET] /api/test 500', 'unexpected failure');
  });
});
