# Database Design

## Overview

The Thmanyah CMS uses PostgreSQL as its primary database, managed through Prisma ORM. The database design emphasizes performance, scalability, and data integrity.

## Entity Relationship Diagram

```
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│   Employee   │          │   Category   │          │   Program    │
├──────────────┤          ├──────────────┤          ├──────────────┤
│ id (PK)      │          │ id (PK)      │◀─────────│ id (PK)      │
│ firstName    │          │ name (UQ)    │     1:N  │ name (UQ)    │
│ lastName     │          │ description  │          │ description  │
│ email (UQ)   │          │ isActive     │          │ language     │
│ password     │          │ createdAt    │          │ durationSec  │
│ department   │          │ updatedAt    │          │ releaseDate  │
│ position     │          └──────────────┘          │ mediaUrl     │
│ salary       │                                    │ mediaType    │
│ hireDate     │                                    │ status       │
│ isActive     │                                    │ categoryId(FK)│
│ createdAt    │                                    │ sourceType   │
│ updatedAt    │                                    │ sourceUrl    │
└──────────────┘                                    │ externalId   │
                                                    │ createdAt    │
                                                    │ updatedAt    │
                                                    └──────────────┘

Legend:
PK = Primary Key
FK = Foreign Key
UQ = Unique Constraint
1:N = One-to-Many Relationship
```

## Tables

### employees

Stores user accounts for system authentication and management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Unique identifier |
| first_name | VARCHAR | NOT NULL | User's first name |
| last_name | VARCHAR | NOT NULL | User's last name |
| email | VARCHAR | UNIQUE, NOT NULL | Login email |
| password | VARCHAR | NOT NULL | bcrypt hashed password |
| phone | VARCHAR | NULLABLE | Contact number |
| department | VARCHAR | NULLABLE | Organizational unit |
| position | VARCHAR | NULLABLE | Job title |
| salary | DECIMAL | NULLABLE | Compensation (encrypted in prod) |
| hire_date | TIMESTAMP | DEFAULT NOW | Employment start date |
| is_active | BOOLEAN | DEFAULT TRUE | Account status |
| created_at | TIMESTAMP | DEFAULT NOW | Record creation |
| updated_at | TIMESTAMP | AUTO UPDATE | Last modification |

### categories

Content categorization system.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Unique identifier |
| name | VARCHAR | UNIQUE, NOT NULL | Category name |
| description | TEXT | NULLABLE | Category details |
| is_active | BOOLEAN | DEFAULT TRUE | Category status |
| created_at | TIMESTAMP | DEFAULT NOW | Record creation |
| updated_at | TIMESTAMP | AUTO UPDATE | Last modification |

### programs

Core content entities with rich metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Unique identifier |
| name | VARCHAR | UNIQUE, NOT NULL | Program title |
| description | TEXT | NULLABLE | Program details |
| language | ENUM | DEFAULT 'ENGLISH' | Content language |
| duration_sec | INTEGER | NOT NULL | Duration in seconds |
| release_date | TIMESTAMP | NOT NULL | Publication date |
| media_url | VARCHAR | NOT NULL | Media file location |
| media_type | ENUM | DEFAULT 'VIDEO' | Media format |
| status | ENUM | DEFAULT 'DRAFT' | Publication status |
| category_id | INTEGER | FK → categories.id | Category reference |
| source_type | ENUM | DEFAULT 'MANUAL' | Content source |
| source_url | VARCHAR | NULLABLE | Original source URL |
| external_id | VARCHAR | NULLABLE | External system ID |
| created_at | TIMESTAMP | DEFAULT NOW | Record creation |
| updated_at | TIMESTAMP | AUTO UPDATE | Last modification |

**Unique Constraints:**
- `(external_id, source_type)` - Prevents duplicate imports

## Enumerations

### MediaType
```sql
ENUM ('VIDEO', 'AUDIO')
```

### Language
```sql
ENUM ('ENGLISH', 'ARABIC')
```

### Status
```sql
ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED')
```

### SourceType
```sql
ENUM ('MANUAL', 'YOUTUBE', 'VIMEO', 'RSS', 'API')
```

## Indexes

### Primary Indexes

All primary keys have automatic B-tree indexes:
- `employees_pkey`
- `categories_pkey`
- `programs_pkey`

### Unique Indexes

Enforce data integrity:
- `employees_email_key` - Unique email addresses
- `categories_name_key` - Unique category names
- `programs_name_key` - Unique program names
- `external_source_unique` - Composite (external_id, source_type)

### Performance Indexes

Optimized for common query patterns:

#### Full-Text Search (GIN Indexes)
```sql
-- Individual field search
CREATE INDEX programs_name_fulltext_idx 
  ON programs USING gin(to_tsvector('english', name));

CREATE INDEX programs_description_fulltext_idx 
  ON programs USING gin(to_tsvector('english', description));

-- Combined search for better relevance
CREATE INDEX programs_name_description_fulltext_idx 
  ON programs USING gin(
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
  );
```

#### Filter Indexes
```sql
-- Single column filters
CREATE INDEX programs_status_idx ON programs(status);
CREATE INDEX programs_language_idx ON programs(language);
CREATE INDEX programs_media_type_idx ON programs(media_type);
CREATE INDEX programs_category_id_idx ON programs(category_id);
CREATE INDEX programs_source_type_idx ON programs(source_type);

-- Sorting indexes
CREATE INDEX programs_release_date_desc_idx 
  ON programs(release_date DESC);
CREATE INDEX programs_created_at_desc_idx 
  ON programs(created_at DESC);
```

#### Composite Indexes
```sql
-- Common query: Published programs by date
CREATE INDEX programs_status_release_date_idx 
  ON programs(status, release_date DESC);

-- Browse by category
CREATE INDEX programs_status_category_release_date_idx 
  ON programs(status, category_id, release_date DESC);

-- Complex filtering
CREATE INDEX programs_status_category_language_media_idx 
  ON programs(status, category_id, language, media_type, release_date DESC);
```

## Migrations

### Migration Strategy

1. **Development**: Auto-generate migrations
```bash
npx prisma migrate dev --name descriptive_name
```

2. **Production**: Deploy reviewed migrations
```bash
npx prisma migrate deploy
```

### Migration History

| Date | Migration | Description |
|------|-----------|-------------|
| 2025-08-05 | add_employees_model | Initial employee table |
| 2025-08-05 | add_password_to_employees | Authentication support |
| 2025-08-05 | add_categories_table | Content categorization |
| 2025-08-05 | add_programs_table | Core content entities |
| 2025-08-06 | add_status_and_category_relation | Publishing workflow |
| 2025-08-06 | add_import_tracking_fields | External source tracking |
| 2025-08-07 | add_search_optimization_indexes | Performance indexes |

## Query Optimization

### Common Query Patterns

1. **Published Programs with Pagination**
```sql
SELECT * FROM programs 
WHERE status = 'PUBLISHED' 
ORDER BY release_date DESC 
LIMIT 20 OFFSET 40;
-- Uses: programs_status_release_date_idx
```

2. **Full-Text Search**
```sql
SELECT * FROM programs 
WHERE status = 'PUBLISHED'
  AND to_tsvector('english', name || ' ' || description) 
      @@ plainto_tsquery('english', 'search term')
ORDER BY ts_rank(...) DESC;
-- Uses: programs_name_description_fulltext_idx
```

3. **Category Browsing**
```sql
SELECT * FROM programs 
WHERE status = 'PUBLISHED' 
  AND category_id = 1 
  AND language = 'ENGLISH'
ORDER BY release_date DESC;
-- Uses: programs_status_category_language_media_idx
```

### Query Performance Tips

1. **Use EXPLAIN ANALYZE** to verify index usage
2. **Avoid SELECT *** when possible
3. **Use pagination** for large result sets
4. **Leverage prepared statements** via Prisma
5. **Monitor slow query log** in production

## Database Configuration

### Connection Pooling

```env
DATABASE_POOL_MIN=2      # Minimum connections
DATABASE_POOL_MAX=10     # Maximum connections
DATABASE_POOL_TIMEOUT=10 # Connection timeout (seconds)
```

### Performance Tuning

PostgreSQL configuration for high traffic:

```sql
-- postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
work_mem = 4MB
max_connections = 200
```

## Data Integrity

### Constraints

- **Foreign Keys**: Maintain referential integrity
- **Unique Constraints**: Prevent duplicates
- **Check Constraints**: Validate data ranges
- **NOT NULL**: Enforce required fields

### Transactions

All write operations use transactions:

```typescript
await prisma.$transaction([
  prisma.program.create({ data: programData }),
  prisma.category.update({ where: { id }, data: { programCount: { increment: 1 } } })
]);
```

## Security Considerations

1. **Encryption**: Sensitive data encrypted at rest
2. **Access Control**: Role-based permissions
3. **SQL Injection**: Prevented via parameterized queries
4. **Audit Logging**: Track all data modifications
5. **Connection Security**: SSL/TLS for all connections

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Search & Indexing](./SEARCH.md)
- [Configuration](./CONFIGURATION.md)
- [Scalability](./SCALABILITY.md)