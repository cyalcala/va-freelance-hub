# Query and Indexing Audit - 2026-06-13

This report audits the query performance of hot database paths for the homepage, opportunities directory, and company directory.

## Query Plans

### 1. Homepage Latest Opportunities

**Query**:
```sql
SELECT id, title, company, type, source_url, source_platform, tags, category, experience_level, posted_at 
FROM opportunities 
WHERE is_active = 1 
ORDER BY posted_at DESC 
LIMIT 60;
```

**Plan**:
`SEARCH opportunities USING INDEX active_posted_idx (is_active=?)`
*Note: Correctly utilizes the compound `active_posted_idx` to retrieve active jobs in chronological order without sorting overhead.*

### 2. Opportunities Directory (Default page)

**Query**:
```sql
SELECT * FROM opportunities WHERE is_active = 1 ORDER BY posted_at DESC LIMIT 30 OFFSET 0;
```

**Plan**:
`SEARCH opportunities USING INDEX active_posted_idx (is_active=?)`

### 3. Opportunities Category Filters (e.g. `/opportunities?category=tech`)

**Query**:
```sql
SELECT * FROM opportunities WHERE is_active = 1 AND category = 'tech' ORDER BY posted_at DESC LIMIT 30 OFFSET 0;
```

**Plan**:
`SEARCH opportunities USING INDEX category_active_posted_idx (category=? AND is_active=?)`
*Note: Correctly utilizes the custom compound `category_active_posted_idx` index.*

### 4. Company Directory Query

**Query**:
```sql
SELECT id, company_name, website, niche, is_dayshift, is_verified, is_remote, is_marketplace 
FROM va_directory 
ORDER BY company_name ASC;
```

#### Before Index Optimization
- **Plan**:
  - `SCAN va_directory`
  - `USE TEMP B-TREE FOR ORDER BY`
- **Issue**: SQLite had to scan the full table and allocate a temporary B-tree in memory to sort the results alphabetically by `company_name`.

#### After Index Optimization
- **Migration**: Added compound index `company_name_idx` on `va_directory(company_name)` in migration `0017_va_directory_company_name_idx.sql`.
- **Plan**:
  - `SCAN va_directory USING INDEX company_name_idx`
- **Result**: Sorting overhead is completely eliminated since the database reads index entries directly in order.
