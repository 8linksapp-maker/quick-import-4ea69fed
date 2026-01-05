CREATE OR REPLACE FUNCTION daily_user_signups(start_date timestamptz)
RETURNS TABLE (date text, count bigint) AS $$
BEGIN
    RETURN QUERY
    WITH days AS (
        SELECT generate_series(
            date_trunc('day', start_date),
            date_trunc('day', NOW()),
            '1 day'::interval
        ) AS day
    )
    SELECT
        to_char(d.day, 'YYYY-MM-DD') AS date,
        COUNT(u.id) AS count
    FROM days d
    LEFT JOIN auth.users u ON date_trunc('day', u.created_at) = d.day
    GROUP BY d.day
    ORDER BY d.day;
END;
$$ LANGUAGE plpgsql;
