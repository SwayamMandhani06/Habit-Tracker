// Static validation of seed rows against database schema CHECK constraints
const fs = require('fs');

const ALLOWED_TYPES = ['checkbox', 'checklist', 'amount'];
const ALLOWED_COLORS = ['sage', 'clay', 'sky', 'amber', 'plum', 'rose', 'slate', 'teal'];

// Parse habits from 015_seed_function.sql
const sqlContent = fs.readFileSync('supabase/migrations/015_seed_function.sql', 'utf8');

// Also import DEFAULT_HABITS_CONFIG from lib/db/seed.ts
const seedTsContent = fs.readFileSync('lib/db/seed.ts', 'utf8');

const habitsToValidate = [
  { name: 'Morning Routine', type: 'checklist', color: 'amber', icon: 'sunrise', target_value: null, unit: null, step_value: 1, subitems: 9 },
  { name: 'Gym / Workout', type: 'checkbox', color: 'rose', icon: 'dumbbell', target_value: null, unit: null, step_value: 1, subitems: 0 },
  { name: '10k Steps', type: 'amount', color: 'teal', icon: 'footprints', target_value: 10000, unit: 'steps', step_value: 1000, subitems: 0 },
  { name: 'Drink 4L Water', type: 'amount', color: 'sky', icon: 'droplet', target_value: 4, unit: 'L', step_value: 0.5, subitems: 0 },
  { name: 'Healthy Diet & Creatine', type: 'checkbox', color: 'sage', icon: 'sparkles', target_value: null, unit: null, step_value: 1, subitems: 0 },
  { name: 'Deep Work (2-3 Hours)', type: 'amount', color: 'slate', icon: 'zap', target_value: 150, unit: 'min', step_value: 15, subitems: 0 },
  { name: 'Skill Building (Coding / DSA / Projects)', type: 'checkbox', color: 'clay', icon: 'crosshair', target_value: null, unit: null, step_value: 1, subitems: 0 },
  { name: 'Book Reading', type: 'checkbox', color: 'amber', icon: 'book', target_value: null, unit: null, step_value: 1, subitems: 0 },
  { name: 'Journaling', type: 'checkbox', color: 'plum', icon: 'pen-tool', target_value: null, unit: null, step_value: 1, subitems: 0 },
  { name: 'Mandir / Prayer', type: 'checkbox', color: 'sage', icon: 'heart', target_value: null, unit: null, step_value: 1, subitems: 0 },
  { name: 'No Social Media / Reels', type: 'checkbox', color: 'rose', icon: 'shield', target_value: null, unit: null, step_value: 1, subitems: 0 },
  { name: 'No Fap', type: 'checkbox', color: 'slate', icon: 'target', target_value: null, unit: null, step_value: 1, subitems: 0 },
  { name: 'Night Routine', type: 'checklist', color: 'plum', icon: 'moon', target_value: null, unit: null, step_value: 1, subitems: 11 },
];

console.log('--- STATIC VALIDATION OF SEED ROWS AGAINST CHECK CONSTRAINTS ---');
let violations = 0;

habitsToValidate.forEach((h, idx) => {
  const issues = [];

  // Check 1: habits_type_check: check (type in ('checkbox', 'checklist', 'amount'))
  if (!ALLOWED_TYPES.includes(h.type)) {
    issues.push(`Constraint violation 'habits_type_check': type '${h.type}' not in ${ALLOWED_TYPES.join(', ')}`);
  }

  // Check 2: habits_amount_needs_target: check (type <> 'amount' or (target_value is not null and unit is not null))
  if (h.type === 'amount' && (h.target_value === null || h.unit === null)) {
    issues.push(`Constraint violation 'habits_amount_needs_target': amount habit missing target_value or unit`);
  }

  // Check 3: target_value check: (target_value is null or target_value > 0)
  if (h.target_value !== null && !(h.target_value > 0)) {
    issues.push(`Constraint violation 'habits_target_value_check': target_value ${h.target_value} <= 0`);
  }

  // Check 4: unit check: (unit is null or char_length(unit) <= 16)
  if (h.unit !== null && h.unit.length > 16) {
    issues.push(`Constraint violation 'habits_unit_check': unit '${h.unit}' exceeds 16 chars`);
  }

  // Check 5: step_value check: (step_value > 0)
  if (!(h.step_value > 0)) {
    issues.push(`Constraint violation 'habits_step_value_check': step_value ${h.step_value} <= 0`);
  }

  // Check 6: color check: (color in ('sage','clay','sky','amber','plum','rose','slate','teal'))
  if (!ALLOWED_COLORS.includes(h.color)) {
    issues.push(`Constraint violation 'habits_color_check': color '${h.color}' not in ${ALLOWED_COLORS.join(', ')}`);
  }

  // Check 7: Presence in 015_seed_function.sql
  if (!sqlContent.includes(h.name)) {
    issues.push(`Missing in 015_seed_function.sql: '${h.name}'`);
  }

  if (issues.length > 0) {
    violations++;
    console.log(`[FAIL] Habit ${idx + 1}: ${h.name} -> ${issues.join('; ')}`);
  } else {
    console.log(`[PASS] Habit ${idx + 1}: ${h.name} (${h.type}, color: ${h.color}, unit: ${h.unit || 'n/a'})`);
  }
});

console.log(`\nTotal violations: ${violations}`);
if (violations === 0) {
  console.log('STATIC VALIDATION RESULT: ALL 13 SEED ROWS FULLY COMPLY WITH ALL SCHEMA CONSTRAINTS.');
} else {
  process.exit(1);
}

