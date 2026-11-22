import { Router } from 'express';
import { tasteAnalyticsService } from '../services/taste-analytics.js';

export const analyticsRoutes: Router = Router();

// GET /api/analytics/overview
analyticsRoutes.get('/overview', (_req, res) => {
  try {
    const data = tasteAnalyticsService.getOverview();
    res.json({ data, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'ANALYTICS_ERROR', message: err.message } });
  }
});

// GET /api/analytics/taste-radar
analyticsRoutes.get('/taste-radar', (req, res) => {
  try {
    const countryCode = (req.query.countryCode as string) || 'ALL';
    const data = tasteAnalyticsService.getTasteRadar(countryCode);
    res.json({ data, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'ANALYTICS_ERROR', message: err.message } });
  }
});

// GET /api/analytics/ingredients
analyticsRoutes.get('/ingredients', (_req, res) => {
  try {
    const data = tasteAnalyticsService.getIngredientMetrics();
    res.json({ data, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'ANALYTICS_ERROR', message: err.message } });
  }
});

// GET /api/analytics/substitutions
analyticsRoutes.get('/substitutions', (_req, res) => {
  try {
    const data = tasteAnalyticsService.getSubstitutionMetrics();
    res.json({ data, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'ANALYTICS_ERROR', message: err.message } });
  }
});

// GET /api/analytics/export
analyticsRoutes.get('/export', (_req, res) => {
  try {
    const csv = tasteAnalyticsService.generateCsvExport();
    const filename = `taste-analytics-report-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'EXPORT_ERROR', message: err.message } });
  }
});
