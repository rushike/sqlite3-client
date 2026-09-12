/**
 * Generates SQL DDL based on pre and post schema versions.
 */
export function generateMigrationSql(tableName, pre = [], post = []) {
  if (!tableName) return "-- Please provide a table name";

  // Normalize JSON keys (column vs name)
  const normalize = (cols) => cols.map(c => ({ 
    ...c, 
    name: c.column || c.name 
  }));
  
  const preNorm = normalize(pre);
  const postNorm = normalize(post);

  // 1. Initial Creation Logic (Table doesn't exist)
  if (preNorm.length === 0 && postNorm.length > 0) {
    const cols = postNorm.map(c => formatColumnDefinition(c)).join(',\n    ');
    return `CREATE TABLE IF NOT EXISTS ${tableName} (\n    ${cols}\n);`;
  }

  const preMap = Object.fromEntries(preNorm.map(c => [c.name, c]));
  const postMap = Object.fromEntries(postNorm.map(c => [c.name, c]));
  const statements = [];

  // 2. Find Additions and Modifications
  postNorm.forEach(col => {
    const old = preMap[col.name];
    if (!old) {
      statements.push(`ALTER TABLE ${tableName} ADD COLUMN ${formatColumnDefinition(col)};`);
    } else if (hasColumnChanged(old, col)) {
      // Logic for modifying existing columns
      statements.push(`ALTER TABLE ${tableName} MODIFY COLUMN ${formatColumnDefinition(col)};`);
    }
  });

  // 3. Find Deletions
  preNorm.forEach(col => {
    if (!postMap[col.name]) {
      statements.push(`ALTER TABLE ${tableName} DROP COLUMN ${col.name};`);
    }
  });

  return statements.length > 0 ? statements.join('\n') : '-- No changes detected';
}

function formatColumnDefinition(col) {
  const colName = col.column || col.name;
  if (!colName || !col.type) return "/* Invalid Column Definition */";
  
  let parts = [`${colName} ${col.type.toUpperCase()}`];
  
  if (col.precision) parts[0] += `(${col.precision})`;

  // Handle Constraints
  if (col.constraints && Array.isArray(col.constraints)) {
    const constraints = col.constraints.map(c => c.toUpperCase());
    
    if (constraints.includes('PRIMARY KEY')) {
      parts.push('PRIMARY KEY');
    } 
    
    // Inline Foreign Key Reference
    if (constraints.includes('FOREIGN KEY') && col.references) {
      // In many SQL dialects, for inline definitions, we use REFERENCES table(col)
      // If col.references is "request.id", this formats to REFERENCES request(id)
      const ref = col.references.includes('.') 
        ? `${col.references.split('.')[0]}(${col.references.split('.')[1]})`
        : col.references;
      parts.push(`REFERENCES ${ref}`);
    }
  }

  if (col.nullable === false) parts.push('NOT NULL');
  
  if (col.default !== undefined && col.default !== null) {
    const val = typeof col.default === 'string' ? `'${col.default}'` : col.default;
    parts.push(`DEFAULT ${val}`);
  }

  return parts.join(' ');
}

function hasColumnChanged(a, b) {
  return (
    a.type !== b.type ||
    JSON.stringify(a.constraints) !== JSON.stringify(b.constraints) ||
    a.references !== b.references
  );
}