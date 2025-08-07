# Security

## Authentication & Authorization

### JWT Implementation

The system uses a dual-token JWT strategy for secure authentication:

```typescript
// Token Structure
{
  "access_token": {
    "exp": 900,      // 15 minutes
    "type": "access",
    "userId": 1,
    "email": "user@example.com"
  },
  "refresh_token": {
    "exp": 604800,   // 7 days
    "type": "refresh",
    "userId": 1,
    "tokenId": "uuid-v4"
  }
}
```

### Password Security

#### Hashing Strategy

```typescript
// bcrypt implementation with salt rounds
const SALT_ROUNDS = 10;

async hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async validatePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

#### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Token Security

```typescript
// Secure token generation
@Injectable()
export class AuthService {
  generateTokens(user: Employee) {
    const payload = { sub: user.id, email: user.email };
    
    return {
      access_token: this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '15m',
        algorithm: 'HS256'
      }),
      refresh_token: this.jwtService.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
        algorithm: 'HS256'
      })
    };
  }
}
```

## Rate Limiting

### Multi-Tier Protection

The system implements sophisticated rate limiting to prevent abuse:

```typescript
// Custom throttler guard with intelligent tracking
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): string {
    // Authenticated requests: Track by user ID
    if (req.user?.id) {
      return `user_${req.user.id}`;
    }
    
    // Public requests: Track by IP address
    return req.ip || req.connection.remoteAddress;
  }
}
```

### Rate Limit Configuration

| Protection Level | Limit | Window | Purpose |
|-----------------|-------|--------|---------|
| **DDoS Protection** | 10 req/sec | Per IP | Nginx level |
| **Public Endpoints** | 100 req/min | Per IP | Authentication |
| **Search Endpoints** | 30 req/min | Per IP | Resource intensive |
| **Authenticated** | 1000 req/min | Per User | Normal operations |
| **Admin Operations** | 100 req/min | Per User | Sensitive actions |

### Implementation

```typescript
// Decorators for different rate limits
@Controller('auth')
@PublicRateLimit() // 100 req/min per IP
export class AuthController {
  @Post('login')
  async login(@Body() dto: LoginDto) { }
}

@Controller('discovery')
@SearchRateLimit() // 30 req/min per IP
export class DiscoveryController {
  @Get('search')
  async search(@Query() dto: SearchDto) { }
}

@Controller('programs')
@UseGuards(JwtAuthGuard)
@AuthenticatedRateLimit() // 1000 req/min per user
export class ProgramsController {
  @Post()
  async create(@Body() dto: CreateProgramDto) { }
}
```

## Input Validation & Sanitization

### DTO Validation

```typescript
export class CreateProgramDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  @Transform(({ value }) => sanitizeHtml(value))
  description?: string;

  @IsUrl({
    protocols: ['https'],
    require_protocol: true
  })
  mediaUrl: string;

  @IsEnum(MediaType)
  mediaType: MediaType;
}
```

### SQL Injection Prevention

```typescript
// Parameterized queries via Prisma
const programs = await this.prisma.program.findMany({
  where: {
    name: {
      contains: userInput, // Automatically escaped
    }
  }
});

// Raw queries with parameter binding
const result = await this.prisma.$queryRaw`
  SELECT * FROM programs 
  WHERE name = ${userInput}  -- Safe parameter binding
`;
```

### XSS Protection

```typescript
// HTML sanitization
import * as sanitizeHtml from 'sanitize-html';

const cleanHtml = sanitizeHtml(userInput, {
  allowedTags: ['b', 'i', 'em', 'strong', 'p'],
  allowedAttributes: {},
  allowedIframeHostnames: []
});
```

## CORS Configuration

```typescript
// Restrictive CORS policy
app.enableCors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://app.thmanyah.com', 'https://admin.thmanyah.com']
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400 // 24 hours
});
```

## Security Headers

```typescript
// Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "same-origin" },
  xssFilter: true,
}));
```

## Database Security

### Connection Security

```typescript
// SSL/TLS enforcement
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?sslmode=require'
    }
  }
});
```

### Access Control

```sql
-- Role-based database access
CREATE ROLE api_user WITH LOGIN PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO api_user;
REVOKE CREATE ON SCHEMA public FROM api_user;

-- Read-only user for analytics
CREATE ROLE readonly_user WITH LOGIN PASSWORD 'secure_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
```

### Data Encryption

```typescript
// Sensitive data encryption
import * as crypto from 'crypto';

class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  
  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }
  
  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

## Audit Logging

```typescript
@Injectable()
export class AuditService {
  async logAction(action: AuditAction) {
    await this.prisma.auditLog.create({
      data: {
        userId: action.userId,
        action: action.type,
        entityType: action.entityType,
        entityId: action.entityId,
        oldValue: action.oldValue,
        newValue: action.newValue,
        ipAddress: action.ipAddress,
        userAgent: action.userAgent,
        timestamp: new Date()
      }
    });
  }
}

// Usage in controllers
@Post()
async createProgram(@Body() dto: CreateProgramDto, @Req() req) {
  const program = await this.service.create(dto);
  
  await this.auditService.logAction({
    userId: req.user.id,
    type: 'CREATE',
    entityType: 'PROGRAM',
    entityId: program.id,
    newValue: JSON.stringify(program),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  return program;
}
```

## API Key Management

```typescript
// API key generation and validation
@Injectable()
export class ApiKeyService {
  generateApiKey(): string {
    return `tk_${crypto.randomBytes(32).toString('hex')}`;
  }
  
  async validateApiKey(apiKey: string): Promise<boolean> {
    const hashedKey = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');
    
    const key = await this.prisma.apiKey.findFirst({
      where: { 
        hashedKey,
        isActive: true,
        expiresAt: { gt: new Date() }
      }
    });
    
    if (key) {
      // Update last used timestamp
      await this.prisma.apiKey.update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() }
      });
      
      return true;
    }
    
    return false;
  }
}
```

## Session Management

```typescript
// Secure session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: 'strict'
  },
  store: new RedisStore({
    client: redis,
    prefix: 'session:',
    ttl: 86400 // 24 hours
  })
}));
```

## File Upload Security

```typescript
// Secure file upload configuration
@Post('upload')
@UseInterceptors(FileInterceptor('file', {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    // Allow only specific file types
    const allowedMimes = ['image/jpeg', 'image/png', 'video/mp4'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Invalid file type'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
}))
async uploadFile(@UploadedFile() file: Express.Multer.File) {
  // Scan file for viruses
  const isClean = await this.antivirusService.scanFile(file.path);
  if (!isClean) {
    await fs.unlink(file.path);
    throw new BadRequestException('File contains malware');
  }
  
  return { filename: file.filename };
}
```

## Container Security

### Dockerfile Security

```dockerfile
# Run as non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Set proper file permissions
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD node healthcheck.js
```

### Secrets Management

```yaml
# Kubernetes secrets
apiVersion: v1
kind: Secret
metadata:
  name: thmanyah-secrets
type: Opaque
data:
  database-url: <base64-encoded>
  jwt-secret: <base64-encoded>
  redis-password: <base64-encoded>
```

## Security Monitoring

### Intrusion Detection

```typescript
@Injectable()
export class SecurityMonitorService {
  async detectSuspiciousActivity(req: Request) {
    const checks = [
      this.checkRapidRequests(req),
      this.checkSQLInjectionPatterns(req),
      this.checkXSSPatterns(req),
      this.checkPathTraversal(req),
      this.checkBruteForce(req)
    ];
    
    const threats = await Promise.all(checks);
    const detected = threats.filter(t => t !== null);
    
    if (detected.length > 0) {
      await this.alertSecurityTeam(detected);
      return true;
    }
    
    return false;
  }
}
```

### Security Headers Monitoring

```typescript
// Regular security header validation
@Cron('0 */6 * * *') // Every 6 hours
async validateSecurityHeaders() {
  const response = await fetch(process.env.APP_URL);
  
  const requiredHeaders = [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Strict-Transport-Security',
    'Content-Security-Policy'
  ];
  
  for (const header of requiredHeaders) {
    if (!response.headers.get(header)) {
      this.logger.error(`Missing security header: ${header}`);
    }
  }
}
```

## Production Security Checklist

### Application Security
✅ JWT authentication with refresh tokens
✅ bcrypt password hashing with salt rounds
✅ Input validation on all endpoints
✅ SQL injection prevention via Prisma ORM
✅ XSS protection with content sanitization
✅ CORS properly configured
✅ Security headers via Helmet
✅ Rate limiting on all endpoints

### Infrastructure Security
✅ HTTPS/TLS encryption
✅ Non-root Docker containers
✅ Environment-based secrets management
✅ Database connection encryption
✅ Audit logging for sensitive operations
✅ Regular security updates

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Configuration](./CONFIGURATION.md)
- [Database Design](./DATABASE.md)