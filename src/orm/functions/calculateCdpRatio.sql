DROP FUNCTION public.calculateCdpRatio;

CREATE OR REPLACE FUNCTION public.calculateCdpRatio()
  RETURNS void
  LANGUAGE 'plpgsql'
  VOLATILE 
AS $BODY$
BEGIN
  UPDATE cdp
    SET collateral_ratio = CASE
      WHEN collateral_token = 'uusd' THEN collateral_amount / ((SELECT close FROM oracle_price WHERE token = cdp.token ORDER BY id DESC LIMIT 1) * mint_amount)
      ELSE ((SELECT close FROM oracle_price WHERE token = cdp.collateral_token ORDER BY id DESC LIMIT 1) * collateral_amount) / ((SELECT close FROM oracle_price WHERE token = cdp.token ORDER BY id DESC LIMIT 1) * mint_amount)
    END
    WHERE collateral_amount > 0 AND mint_amount > 0;
END;
$BODY$;
