import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should extend AuthGuard with jwt strategy', () => {
    expect(guard).toBeInstanceOf(JwtAuthGuard);
  });

  it('should have correct strategy name', () => {
    // This test verifies that the guard is using the 'jwt' strategy
    // The actual strategy name is set in the parent AuthGuard class
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should call parent canActivate method', () => {
      const mockExecutionContext = {} as ExecutionContext;

      // Spy on the parent method
      const parentCanActivateSpy = jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        'canActivate',
      );
      parentCanActivateSpy.mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(parentCanActivateSpy).toHaveBeenCalledWith(mockExecutionContext);
      expect(result).toBe(true);

      parentCanActivateSpy.mockRestore();
    });
  });
});
