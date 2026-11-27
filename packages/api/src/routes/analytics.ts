import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { tasteAnalyticsService } from '../services/taste-analytics.js';

export const analyticsRoutes: Router = Router();
analyticsRoutes.use(requireRole('STAFF', 'ADMIN'));

// GET /api/analytics/overview
analyticsRoutes.get('/overview', async (_req, res) => {
  try {
    const data = await tasteAnalyticsService.getOverview();
    res.json({ data, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'ANALYTICS_ERROR', message: err.message } });
  }
});

// GET /api/analytics/taste-radar
analyticsRoutes.get('/taste-radar', async (req, res) => {
  try {
    const countryCode = (req.query.countryCode as string) || 'ALL';
    const data = await tasteAnalyticsService.getTasteRadar(countryCode);
    res.json({ data, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'ANALYTICS_ERROR', message: err.message } });
  }
});

// GET /api/analytics/ingredients
analyticsRoutes.get('/ingredients', async (_req, res) => {
  try {
    const data = await tasteAnalyticsService.getIngredientMetrics();
    res.json({ data, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'ANALYTICS_ERROR', message: err.message } });
  }
});

// GET /api/analytics/substitutions
analyticsRoutes.get('/substitutions', async (_req, res) => {
  try {
    const data = await tasteAnalyticsService.getSubstitutionMetrics();
    res.json({ data, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'ANALYTICS_ERROR', message: err.message } });
  }
});

// GET /api/analytics/export
analyticsRoutes.get('/export', async (_req, res) => {
  try {
    const csv = await tasteAnalyticsService.generateCsvExport();
    const filename = `taste-analytics-report-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'EXPORT_ERROR', message: err.message } });
  }
});
