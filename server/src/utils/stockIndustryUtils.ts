import pool from '../config/db';

export const getIndustryAnalysisFromDB = async (
    company_name: string,
    start_date: string,
    end_date: string
) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `
            WITH base_company AS (
                SELECT ticker, name, industry, sector, revenue, eps
                FROM company 
                WHERE name ILIKE '%' || $1 || '%'
                OR name ILIKE '%' || REPLACE($1, 'Inc.', '') || '%'
                ORDER BY 
                    CASE 
                        WHEN name ILIKE $1 THEN 0
                        WHEN name ILIKE '%' || $1 || '%' THEN 1
                        ELSE 2
                    END
                LIMIT 1
            ),
            peer_companies AS (
                SELECT c.ticker, c.name, c.industry, c.sector, c.revenue, c.eps
                FROM company c
                JOIN base_company b ON 
                    (c.industry = b.industry OR c.sector = b.sector)
                    AND c.ticker != b.ticker
            ),
            company_metrics AS (
                SELECT 
                    c.ticker,
                    c.name,
                    c.industry,
                    c.sector,
                    AVG(s.close) as avg_price,
                    MAX(s.high) as period_high,
                    MIN(s.low) as period_low,
                    STDDEV(s.close) as price_volatility,
                    AVG(s.volume) as avg_volume,
                    CASE 
                        WHEN MIN(s.close) = 0 OR MIN(s.close) IS NULL THEN 0
                        ELSE (MAX(s.close) - MIN(s.close)) / MIN(s.close) * 100 
                    END as price_range_percent,
                    c.revenue as company_revenue,
                    c.eps as earnings_per_share
                FROM stocks s
                JOIN (
                    SELECT * FROM base_company
                    UNION
                    SELECT * FROM peer_companies
                ) c ON s.ticker = c.ticker
                WHERE s.date BETWEEN $2::date AND $3::date
                GROUP BY c.ticker, c.name, c.industry, c.sector, c.revenue, c.eps
            ),
            industry_counts AS (
                SELECT 
                    industry,
                    COUNT(*) as company_count
                FROM company_metrics
                GROUP BY industry
            )
            SELECT 
                (SELECT industry FROM base_company) as primary_industry,
                (SELECT sector FROM base_company) as sector,
                COUNT(*) as total_peer_companies,
                
                AVG(cm.avg_price) as group_avg_price,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cm.avg_price) as group_median_price,
                AVG(cm.price_volatility) as avg_volatility,
                AVG(cm.price_range_percent) as avg_price_range_percent,
                
                AVG(cm.avg_volume) as group_avg_volume,
                
                AVG(cm.company_revenue) as avg_revenue,
                PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cm.company_revenue) - 
                PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY cm.company_revenue) as revenue_iqr,
                AVG(cm.earnings_per_share) as avg_eps,
                
                (SELECT name FROM company_metrics ORDER BY company_revenue DESC LIMIT 1) as revenue_leader,
                (SELECT name FROM company_metrics ORDER BY avg_price DESC LIMIT 1) as price_leader,
                (SELECT name FROM company_metrics ORDER BY price_volatility DESC LIMIT 1) as most_volatile_company,
                
                (SELECT json_agg(json_build_object(
                    'industry', industry,
                    'company_count', company_count
                ))
                FROM industry_counts) as industry_distribution
                
            FROM company_metrics cm
            GROUP BY cm.sector;
            `,
            [company_name, start_date, end_date]
        );
        return result.rows[0];
    } finally {
        client.release();
    }
};
