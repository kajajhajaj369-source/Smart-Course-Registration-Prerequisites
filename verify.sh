#!/bin/bash
# Project Verification Script
# Run this to check if everything is properly set up

echo "=========================================="
echo "Project Structure Verification"
echo "=========================================="

# Check backend files
echo ""
echo "Checking backend files..."
[ -f "backend/server.js" ] && echo "✓ backend/server.js" || echo "✗ backend/server.js MISSING"
[ -f "backend/package.json" ] && echo "✓ backend/package.json" || echo "✗ backend/package.json MISSING"
[ -f "backend/db/database.js" ] && echo "✓ backend/db/database.js" || echo "✗ backend/db/database.js MISSING"
[ -f "backend/routes/students.js" ] && echo "✓ backend/routes/students.js" || echo "✗ backend/routes/students.js MISSING"
[ -f "backend/routes/courses.js" ] && echo "✓ backend/routes/courses.js" || echo "✗ backend/routes/courses.js MISSING"
[ -f "backend/routes/enrollments.js" ] && echo "✓ backend/routes/enrollments.js" || echo "✗ backend/routes/enrollments.js MISSING"
[ -f "backend/routes/demos.js" ] && echo "✓ backend/routes/demos.js" || echo "✗ backend/routes/demos.js MISSING"

# Check frontend files
echo ""
echo "Checking frontend files..."
[ -f "frontend/index.html" ] && echo "✓ frontend/index.html" || echo "✗ frontend/index.html MISSING"
[ -f "frontend/css/style.css" ] && echo "✓ frontend/css/style.css" || echo "✗ frontend/css/style.css MISSING"
[ -f "frontend/js/api.js" ] && echo "✓ frontend/js/api.js" || echo "✗ frontend/js/api.js MISSING"
[ -f "frontend/js/app.js" ] && echo "✓ frontend/js/app.js" || echo "✗ frontend/js/app.js MISSING"

# Check database files
echo ""
echo "Checking database files..."
[ -f "database/schema.sql" ] && echo "✓ database/schema.sql" || echo "✗ database/schema.sql MISSING"
[ -f "database/sample_data.sql" ] && echo "✓ database/sample_data.sql" || echo "✗ database/sample_data.sql MISSING"
[ -f "database/views.sql" ] && echo "✓ database/views.sql" || echo "✗ database/views.sql MISSING"
[ -f "database/procedures.sql" ] && echo "✓ database/procedures.sql" || echo "✗ database/procedures.sql MISSING"
[ -f "database/functions.sql" ] && echo "✓ database/functions.sql" || echo "✗ database/functions.sql MISSING"
[ -f "database/advanced_queries.sql" ] && echo "✓ database/advanced_queries.sql" || echo "✗ database/advanced_queries.sql MISSING"

# Check documentation
echo ""
echo "Checking documentation..."
[ -f "docs/PHASE_1_DATABASE_REQUIREMENTS.md" ] && echo "✓ Phase 1 Documentation" || echo "✗ Phase 1 MISSING"
[ -f "docs/PHASE_2_NORMALIZATION.md" ] && echo "✓ Phase 2 Documentation" || echo "✗ Phase 2 MISSING"
[ -f "docs/PHASE_3_SQL_IMPLEMENTATION.md" ] && echo "✓ Phase 3 Documentation" || echo "✗ Phase 3 MISSING"
[ -f "README.md" ] && echo "✓ README.md" || echo "✗ README.md MISSING"

# Check configuration
echo ""
echo "Checking configuration..."
[ -f ".env" ] && echo "✓ .env file exists" || echo "✗ .env MISSING - copy from .env.example"
[ -f ".env.example" ] && echo "✓ .env.example" || echo "✗ .env.example MISSING"

echo ""
echo "=========================================="
echo "Verification Complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Make sure MySQL is running"
echo "2. Update .env with your MySQL password"
echo "3. Run database setup scripts"
echo "4. Install Node.js dependencies: cd backend && npm install"
echo "5. Start the server: npm start"
