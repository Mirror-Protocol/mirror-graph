import { MigrationInterface, QueryRunner } from 'typeorm'

export class LatestOraclePrices1604643642672 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP FUNCTION IF EXISTS public.latestOraclePrices;')
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
  WHERE status='LISTED';

END;
$BODY$;
`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP FUNCTION public.latestOraclePrices;')
  }
}
