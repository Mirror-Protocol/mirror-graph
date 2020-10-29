drop function public.balanceHistory;

CREATE OR REPLACE FUNCTION public.balanceHistory(_address varchar, _from timestamp, _to timestamp, _interval integer)
  RETURNS TABLE ("timestamp" timestamp, "assetValue" numeric, "investedValue" numeric)
  LANGUAGE 'plpgsql'
  VOLATILE 
AS $BODY$
DECLARE
  timeIterator timestamp := _from;
  timeIteratorNext timestamp;
BEGIN
  LOOP
    timeIteratorNext := timeIterator + (_interval * interval '1 minute');

    RETURN QUERY
    SELECT
      timeIterator as "timestamp",
      sum(pb.assetValue) as "assetValue",
      sum(pb.investedValue) as "investedValue"
    FROM (
      SELECT
        DISTINCT ON (token) token,
        coalesce((SELECT p.close FROM price p
          WHERE p.token = b.token AND p.datetime <= timeIteratorNext
          ORDER BY p.datetime DESC LIMIT 1), 0)*b.balance as assetValue,
        b.average_price*b.balance as investedValue
      FROM balance b
      WHERE b.address=_address AND b.datetime <= timeIteratorNext
      ORDER BY token, id DESC
    ) as pb;

    EXIT WHEN timeIterator >= _to;

    timeIterator := timeIteratorNext;
  END LOOP;

END;
$BODY$;
