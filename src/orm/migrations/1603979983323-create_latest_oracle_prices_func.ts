import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateLatestOraclePrices1603979983323 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
CREATE OR REPLACE FUNCTION public.latestOraclePrices("timestamp" timestamp)
  RETURNS TABLE ("token" varchar, "price" numeric)
  LANGUAGE 'plpgsql'
  VOLATILE 
AS $BODY$
BEGIN

  RETURN QUERY
  SELECT
    a.token,
    (SELECT p.close FROM oracle_price p
      WHERE p.token = a.token AND p.datetime <= "timestamp"
      ORDER BY p.datetime DESC LIMIT 1) as price
  FROM asset as a
  WHERE is_listed=true;

END;
$BODY$;
`)
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP FUNCTION public.latestOraclePrices;')
  }
}
