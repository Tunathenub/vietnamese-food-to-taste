import { Router } from 'express';
import {
  generateTasteConcierge,
  generateCulturalDishStory,
  generateKitchenBriefing,
} from '../services/ai-service.js';

export const aiRoutes: Router = Router();

// POST /api/ai/concierge
aiRoutes.post('/concierge', async (req, res) => {
  try {
    const { prompt, language } = req.body || {};
    const result = await generateTasteConcierge({
      prompt: typeof prompt === 'string' ? prompt : '',
      language: typeof language === 'string' ? language : 'vi',
    });

    res.json({
      data: result,
      error: null,
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({
      data: null,
      error: { code: 'AI_CONCIERGE_ERROR', message: err?.message || 'Error generating taste recommendation' },
    });
  }
});

// POST /api/ai/dish-story
aiRoutes.post('/dish-story', async (req, res) => {
  try {
    const { dishSlug, language } = req.body || {};
    const result = await generateCulturalDishStory({
      dishSlug: typeof dishSlug === 'string' ? dishSlug : 'pho-bo',
      language: typeof language === 'string' ? language : 'vi',
    });

    res.json({
      data: result,
      error: null,
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({
      data: null,
      error: { code: 'AI_DISH_STORY_ERROR', message: err?.message || 'Error generating cultural dish story' },
    });
  }
});

// POST /api/ai/kitchen-briefing
aiRoutes.post('/kitchen-briefing', async (req, res) => {
  try {
    const { timeframe } = req.body || {};
    const result = await generateKitchenBriefing({
      timeframe: typeof timeframe === 'string' ? timeframe : 'today',
    });

    res.json({
      data: result,
      error: null,
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({
      data: null,
      error: { code: 'AI_KITCHEN_BRIEFING_ERROR', message: err?.message || 'Error generating kitchen briefing' },
    });
  }
});
