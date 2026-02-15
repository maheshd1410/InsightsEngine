import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns ok status payload', () => {
    const controller = new HealthController();
    const payload = controller.getHealth();

    expect(payload.status).toBe('ok');
    expect(payload.service).toBe('insights-engine-backend');
    expect(typeof payload.timestamp).toBe('string');
  });
});
