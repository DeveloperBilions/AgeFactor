import { Client } from 'pg';
import { biomarkerReferences } from './biomarker-references';

async function runSeeds() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Seed biomarker reference ranges
    console.log('Seeding biomarker reference ranges...');
    let upsertCount = 0;

    for (const biomarker of biomarkerReferences) {
      const query = `
        INSERT INTO biomarker_reference_ranges (
          name,
          display_name,
          unit,
          category,
          lab_range_low,
          lab_range_high,
          optimal_range_low,
          optimal_range_high,
          gender_specific,
          male_optimal_low,
          male_optimal_high,
          female_optimal_low,
          female_optimal_high,
          description
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        )
        ON CONFLICT (name, gender_specific, age_min, age_max)
        DO UPDATE SET
          display_name = EXCLUDED.display_name,
          unit = EXCLUDED.unit,
          category = EXCLUDED.category,
          lab_range_low = EXCLUDED.lab_range_low,
          lab_range_high = EXCLUDED.lab_range_high,
          optimal_range_low = EXCLUDED.optimal_range_low,
          optimal_range_high = EXCLUDED.optimal_range_high,
          male_optimal_low = EXCLUDED.male_optimal_low,
          male_optimal_high = EXCLUDED.male_optimal_high,
          female_optimal_low = EXCLUDED.female_optimal_low,
          female_optimal_high = EXCLUDED.female_optimal_high,
          description = EXCLUDED.description,
          updated_at = NOW()
      `;

      const values = [
        biomarker.name,
        biomarker.displayName,
        biomarker.unit,
        biomarker.category,
        biomarker.labRangeLow,
        biomarker.labRangeHigh,
        biomarker.optimalRangeLow,
        biomarker.optimalRangeHigh,
        biomarker.genderSpecific,
        biomarker.maleOptimalLow || null,
        biomarker.maleOptimalHigh || null,
        biomarker.femaleOptimalLow || null,
        biomarker.femaleOptimalHigh || null,
        biomarker.description,
      ];

      await client.query(query, values);
      upsertCount++;

      if (upsertCount % 10 === 0) {
        console.log(`  Upserted ${upsertCount}/${biomarkerReferences.length} biomarkers...`);
      }
    }

    console.log(`Successfully upserted ${upsertCount} biomarker reference ranges`);

    // Verify count
    const countResult = await client.query(
      'SELECT COUNT(*) as count FROM biomarker_reference_ranges'
    );
    const finalCount = countResult.rows[0].count;
    console.log(`Total biomarker reference ranges in database: ${finalCount}`);
  } catch (error) {
    console.error('Error running seeds:', error);
    throw error;
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

// Run the seeds
runSeeds()
  .then(() => {
    console.log('Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
