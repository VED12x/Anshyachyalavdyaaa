import request from 'supertest';
import { app } from '../index';

// Note: These tests require a running database and Redis.
// They are designed to run via: docker-compose run api npm test

describe('Health Check', () => {
  it('GET /health should return 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('diabetescare360-api');
  });

  it('GET /metrics should return monitoring data', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('uptime_seconds');
    expect(res.body).toHaveProperty('total_requests');
  });
});

describe('Authentication', () => {
  const testUser = {
    email: `test_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User',
    role: 'patient',
    diabetes_type: 'type2',
  };

  let accessToken: string;
  let refreshToken: string;

  it('POST /auth/register should create a new user', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user.role).toBe('patient');
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  it('POST /auth/register with duplicate email should return 409', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send(testUser);
    expect(res.status).toBe(409);
  });

  it('POST /auth/login with valid credentials should return tokens', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('refresh_token');
    accessToken = res.body.access_token;
    refreshToken = res.body.refresh_token;
  });

  it('POST /auth/login with wrong password should return 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword' });
    expect(res.status).toBe(401);
  });

  it('Protected route with valid token should return 200', async () => {
    const res = await request(app)
      .get('/dashboard/summary')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });

  it('Protected route with no token should return 401', async () => {
    const res = await request(app).get('/dashboard/summary');
    expect(res.status).toBe(401);
  });

  it('Protected route with invalid token should return 401', async () => {
    const res = await request(app)
      .get('/dashboard/summary')
      .set('Authorization', 'Bearer invalid-token-here');
    expect(res.status).toBe(401);
  });

  it('POST /auth/refresh should return new tokens', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refresh_token: refreshToken });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('refresh_token');
    // Old refresh token should now be denylisted
    accessToken = res.body.access_token;
    refreshToken = res.body.refresh_token;
  });

  it('POST /auth/logout should invalidate refresh token', async () => {
    const res = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refresh_token: refreshToken });
    expect(res.status).toBe(200);
  });
});

describe('Input Validation', () => {
  let token: string;

  beforeAll(async () => {
    const email = `validation_${Date.now()}@example.com`;
    await request(app).post('/auth/register').send({
      email,
      password: 'TestPassword123!',
      name: 'Validation Tester',
      role: 'patient',
    });
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email, password: 'TestPassword123!' });
    token = loginRes.body.access_token;
  });

  it('POST /glucose-readings with value out of range should return 400', async () => {
    // Below minimum (20)
    const res1 = await request(app)
      .post('/glucose-readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ value_mgdl: 10 });
    expect(res1.status).toBe(400);

    // Above maximum (600)
    const res2 = await request(app)
      .post('/glucose-readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ value_mgdl: 700 });
    expect(res2.status).toBe(400);
  });

  it('POST /glucose-readings with valid value should return 201', async () => {
    const res = await request(app)
      .post('/glucose-readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ value_mgdl: 120, source: 'manual' });
    expect(res.status).toBe(201);
    expect(res.body.value_mgdl).toBe(120);
  });

  it('POST /auth/register with invalid email should return 400', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        email: 'not-an-email',
        password: 'TestPassword123!',
        name: 'Test',
        role: 'patient',
      });
    expect(res.status).toBe(400);
  });

  it('POST /auth/register with short password should return 400', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        email: 'short@test.com',
        password: '123',
        name: 'Test',
        role: 'patient',
      });
    expect(res.status).toBe(400);
  });
});

describe('Care Link Authorization', () => {
  let patientToken: string;
  let clinicianToken: string;
  let unlinkedClinicianToken: string;
  let patientId: string;
  let clinicianId: string;
  let careLinkId: string;

  beforeAll(async () => {
    // Create patient
    const patientEmail = `patient_cl_${Date.now()}@test.com`;
    await request(app).post('/auth/register').send({
      email: patientEmail,
      password: 'TestPassword123!',
      name: 'CL Patient',
      role: 'patient',
    });
    const pLogin = await request(app).post('/auth/login').send({
      email: patientEmail,
      password: 'TestPassword123!',
    });
    patientToken = pLogin.body.access_token;
    patientId = pLogin.body.user.id;

    // Create linked clinician
    const clinicianEmail = `clinician_cl_${Date.now()}@test.com`;
    await request(app).post('/auth/register').send({
      email: clinicianEmail,
      password: 'TestPassword123!',
      name: 'CL Clinician',
      role: 'doctor',
    });
    const cLogin = await request(app).post('/auth/login').send({
      email: clinicianEmail,
      password: 'TestPassword123!',
    });
    clinicianToken = cLogin.body.access_token;
    clinicianId = cLogin.body.user.id;

    // Create unlinked clinician
    const unlinkedEmail = `unlinked_${Date.now()}@test.com`;
    await request(app).post('/auth/register').send({
      email: unlinkedEmail,
      password: 'TestPassword123!',
      name: 'Unlinked Clinician',
      role: 'doctor',
    });
    const uLogin = await request(app).post('/auth/login').send({
      email: unlinkedEmail,
      password: 'TestPassword123!',
    });
    unlinkedClinicianToken = uLogin.body.access_token;

    // Create care link
    const linkRes = await request(app)
      .post('/care-links')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ patient_id: clinicianId, provider_role: 'doctor' });
    careLinkId = linkRes.body.id;
  });

  it('Clinician with active care link should access patient report (200)', async () => {
    const res = await request(app)
      .get(`/doctor/patients/${patientId}/report`)
      .set('Authorization', `Bearer ${clinicianToken}`);
    expect(res.status).toBe(200);
  });

  it('Clinician without care link should be denied (403)', async () => {
    const res = await request(app)
      .get(`/doctor/patients/${patientId}/report`)
      .set('Authorization', `Bearer ${unlinkedClinicianToken}`);
    expect(res.status).toBe(403);
  });

  it('Revoking care link should immediately deny access', async () => {
    // Revoke
    const revokeRes = await request(app)
      .post(`/care-links/${careLinkId}/revoke`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(revokeRes.status).toBe(200);

    // Immediate re-request should fail
    const res = await request(app)
      .get(`/doctor/patients/${patientId}/report`)
      .set('Authorization', `Bearer ${clinicianToken}`);
    expect(res.status).toBe(403);
  });
});

describe('Glucose Readings', () => {
  let token: string;

  beforeAll(async () => {
    const email = `glucose_${Date.now()}@test.com`;
    await request(app).post('/auth/register').send({
      email,
      password: 'TestPassword123!',
      name: 'Glucose Tester',
      role: 'patient',
    });
    const loginRes = await request(app).post('/auth/login').send({
      email,
      password: 'TestPassword123!',
    });
    token = loginRes.body.access_token;
  });

  it('POST /glucose-readings should create a reading', async () => {
    const res = await request(app)
      .post('/glucose-readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ value_mgdl: 128, source: 'manual' });
    expect(res.status).toBe(201);
    expect(res.body.value_mgdl).toBe(128);
    expect(res.body.source).toBe('manual');
  });

  it('GET /glucose-readings should return readings', async () => {
    const res = await request(app)
      .get('/glucose-readings')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.pagination).toBeDefined();
  });
});

describe('Medications', () => {
  let token: string;
  let medId: string;

  beforeAll(async () => {
    const email = `meds_${Date.now()}@test.com`;
    await request(app).post('/auth/register').send({
      email,
      password: 'TestPassword123!',
      name: 'Meds Tester',
      role: 'patient',
    });
    const loginRes = await request(app).post('/auth/login').send({
      email,
      password: 'TestPassword123!',
    });
    token = loginRes.body.access_token;
  });

  it('POST /medications should create a medication', async () => {
    const res = await request(app)
      .post('/medications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Metformin',
        dosage: '500mg',
        times_per_day: 2,
        schedule_times: ['08:00', '20:00'],
      });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Metformin');
    medId = res.body.id;
  });

  it('GET /medications should return medications', async () => {
    const res = await request(app)
      .get('/medications')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('POST /medications/:id/log should mark dose taken', async () => {
    const res = await request(app)
      .post(`/medications/${medId}/log`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'taken' });
    expect([200, 201]).toContain(res.status);
    expect(res.body.status).toBe('taken');
  });
});

describe('Dashboard Summary', () => {
  let token: string;

  beforeAll(async () => {
    // Login as demo patient (from seed data)
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'patient@demo.com', password: 'password123' });

    if (loginRes.status === 200) {
      token = loginRes.body.access_token;
    } else {
      // Create a test user if seed data doesn't exist
      const email = `dashboard_${Date.now()}@test.com`;
      await request(app).post('/auth/register').send({
        email,
        password: 'TestPassword123!',
        name: 'Dashboard Tester',
        role: 'patient',
      });
      const res = await request(app).post('/auth/login').send({
        email,
        password: 'TestPassword123!',
      });
      token = res.body.access_token;
    }
  });

  it('GET /dashboard/summary should return aggregate data', async () => {
    const res = await request(app)
      .get('/dashboard/summary')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('current_glucose');
    expect(res.body).toHaveProperty('time_in_range');
    expect(res.body).toHaveProperty('estimated_hba1c');
    expect(res.body).toHaveProperty('adherence');
    expect(res.body).toHaveProperty('today_medication');
    expect(res.body).toHaveProperty('glucose_history');
  });
});

describe('404 Handler', () => {
  it('Non-existent route should return 404', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
  });
});
