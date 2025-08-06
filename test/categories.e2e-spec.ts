import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { PrismaErrorMapperService } from '../src/common/services/prisma-error-mapper.service';

describe('CategoriesController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let accessToken: string;

  const timestamp = Date.now();
  const testEmployee = {
    firstName: 'John',
    lastName: 'Doe',
    email: `john.doe.cat.${timestamp}@example.com`,
    password: 'password123',
    phone: '+1234567890',
    department: 'IT',
    position: 'Developer',
    salary: 50000,
    isActive: true,
  };

  const testCategory = {
    name: `Electronics-${timestamp}`,
    description: 'Electronic devices and accessories',
  };

  const mockCategory = {
    name: `Books-${timestamp}`,
    description: 'Books and literature',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global pipes and filters
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const errorMapper = new PrismaErrorMapperService();
    app.useGlobalFilters(new PrismaExceptionFilter(errorMapper));

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    // Clean up test data specific to this test suite
    await prismaService.category.deleteMany({
      where: {
        name: {
          contains: `-${timestamp}`,
        },
      },
    });

    await prismaService.employee.deleteMany({
      where: {
        email: {
          contains: `cat.${timestamp}@example.com`,
        },
      },
    });

    // Create a test employee and get access token
    const hashedPassword = await bcrypt.hash(testEmployee.password, 10);
    await prismaService.employee.create({
      data: {
        ...testEmployee,
        password: hashedPassword,
      },
    });

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testEmployee.email,
        password: testEmployee.password,
      });

    if (loginResponse.status !== 201) {
      console.error('Login failed:', loginResponse.body);
      throw new Error(`Login failed with status ${loginResponse.status}`);
    }

    accessToken = loginResponse.body.access_token;

    if (!accessToken) {
      console.error('No access token received:', loginResponse.body);
      throw new Error('No access token received from login');
    }
  });

  afterEach(async () => {
    // Clean up test data
    await prismaService.category.deleteMany({
      where: {
        name: {
          contains: `-${timestamp}`,
        },
      },
    });

    await prismaService.employee.deleteMany({
      where: {
        email: {
          contains: `cat.${timestamp}@example.com`,
        },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/categories (POST)', () => {
    it('should create a new category with authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testCategory)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(testCategory.name);
      expect(response.body.description).toBe(testCategory.description);
      expect(response.body).toHaveProperty('isActive', true);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should create a category without description', async () => {
      const categoryWithoutDescription = {
        name: `Minimal-${timestamp}`,
      };

      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(categoryWithoutDescription)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(categoryWithoutDescription.name);
      expect(response.body.description).toBeNull();
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/categories')
        .send(testCategory)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should fail with invalid data - missing name', async () => {
      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ description: 'Missing name' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should fail with invalid data - empty name', async () => {
      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '', description: 'Empty name' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should fail with duplicate category name', async () => {
      // Create first category
      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testCategory)
        .expect(HttpStatus.CREATED);

      // Try to create duplicate
      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testCategory)
        .expect(HttpStatus.CONFLICT);
    });
  });

  describe('/categories (GET)', () => {
    it('should return all categories', async () => {
      // Create test categories
      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testCategory);

      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(mockCategory);

      const response = await request(app.getHttpServer())
        .get('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      const testCat = response.body.find(
        (cat: any) => cat.name === testCategory.name,
      );
      const mockCat = response.body.find(
        (cat: any) => cat.name === mockCategory.name,
      );

      expect(testCat).toBeDefined();
      expect(mockCat).toBeDefined();
    });

    it('should return active categories when active=true', async () => {
      // Create an active category
      const activeCategory = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testCategory);

      // Create an inactive category by updating it
      const inactiveCategory = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(mockCategory);

      // Make one category inactive
      await prismaService.category.update({
        where: { id: inactiveCategory.body.id },
        data: { isActive: false },
      });

      const response = await request(app.getHttpServer())
        .get('/categories?active=true')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);

      // All returned categories should be active
      response.body.forEach((category: any) => {
        expect(category.isActive).toBe(true);
      });

      // Should include our active test category
      const foundActiveCategory = response.body.find(
        (cat: any) => cat.id === activeCategory.body.id,
      );
      expect(foundActiveCategory).toBeDefined();
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get('/categories')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('/categories/:id (GET)', () => {
    it('should return a category by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testCategory);

      const categoryId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(categoryId);
      expect(response.body.name).toBe(testCategory.name);
      expect(response.body.description).toBe(testCategory.description);
    });

    it('should return 404 for non-existent category', async () => {
      await request(app.getHttpServer())
        .get('/categories/999999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should fail with invalid id format', async () => {
      await request(app.getHttpServer())
        .get('/categories/invalid-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('/categories/:id (PATCH)', () => {
    it('should update a category', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testCategory);

      const categoryId = createResponse.body.id;
      const updateData = {
        name: `Updated-Electronics-${timestamp}`,
        description: 'Updated description',
      };

      const response = await request(app.getHttpServer())
        .patch(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(categoryId);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.description).toBe(updateData.description);
      expect(new Date(response.body.updatedAt)).toBeInstanceOf(Date);
    });

    it('should update only provided fields', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testCategory);

      const categoryId = createResponse.body.id;
      const updateData = {
        name: `Partial-Update-${timestamp}`,
      };

      const response = await request(app.getHttpServer())
        .patch(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(HttpStatus.OK);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.description).toBe(testCategory.description); // Should remain unchanged
    });

    it('should return 404 for non-existent category', async () => {
      await request(app.getHttpServer())
        .patch('/categories/999999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated name' })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('/categories/:id (DELETE)', () => {
    it('should delete a category', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testCategory);

      const categoryId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .delete(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.message).toBe('Category deleted successfully');

      // Verify category is deleted
      await request(app.getHttpServer())
        .get(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 404 for non-existent category', async () => {
      await request(app.getHttpServer())
        .delete('/categories/999999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      const endpoints = [
        { method: 'post', url: '/categories', data: testCategory },
        { method: 'get', url: '/categories' },
        { method: 'get', url: '/categories/1' },
        { method: 'patch', url: '/categories/1', data: { name: 'Updated' } },
        { method: 'delete', url: '/categories/1' },
      ];

      for (const endpoint of endpoints) {
        const req = request(app.getHttpServer())[endpoint.method](endpoint.url);
        if (endpoint.data) {
          req.send(endpoint.data);
        }
        await req.expect(HttpStatus.UNAUTHORIZED);
      }
    });

    it('should reject invalid JWT tokens', async () => {
      await request(app.getHttpServer())
        .get('/categories')
        .set('Authorization', 'Bearer invalid-token')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
