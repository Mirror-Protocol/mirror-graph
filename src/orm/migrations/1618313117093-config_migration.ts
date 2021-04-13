import {MigrationInterface, QueryRunner} from "typeorm";

export class configMigration1618313117093 implements MigrationInterface {
    name = 'configMigration1618313117093'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "balance"."datetime" IS NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "balance"."datetime" IS NULL`);
    }

}
