/**
 * goal-templates.ts — starter goal sets offered during onboarding / "new
 * season" prompts. Pure data, no supabase/react imports. Each set covers all
 * five Life Areas (one goal each) so a user can one-tap-adopt a full spread.
 */

import type { Cadence, LifeArea, MetricType } from './goals-types';

export interface GoalTemplate {
  title: string;
  lifeArea: LifeArea;
  metricType: MetricType;
  targetValue: number;
  unit?: string;
  cadence: Cadence;
}

export interface TemplateSet {
  id: string;
  label: string;
  description: string;
  templates: readonly GoalTemplate[];
}

export const TEMPLATE_SETS: readonly TemplateSet[] = [
  {
    id: 'rm-adjusting',
    label: 'RM adjusting to home',
    description:
      'Just back from a mission and rebuilding routines — church, school or work, and everything in between.',
    templates: [
      {
        title: 'Build an emergency fund',
        lifeArea: 'finance',
        metricType: 'currency',
        targetValue: 1000,
        unit: '$',
        cadence: 'monthly',
      },
      {
        title: 'Come Follow Me study',
        lifeArea: 'spiritual',
        metricType: 'count',
        targetValue: 1,
        unit: 'sessions',
        cadence: 'weekly',
      },
      {
        title: 'Journal to process the transition home',
        lifeArea: 'mental',
        metricType: 'streak',
        targetValue: 1,
        unit: 'days',
        cadence: 'daily',
      },
      {
        title: 'Reconnect with an old friend or family member',
        lifeArea: 'social',
        metricType: 'count',
        targetValue: 1,
        unit: 'people',
        cadence: 'weekly',
      },
      {
        title: 'Get back into a regular workout rhythm',
        lifeArea: 'physical',
        metricType: 'count',
        targetValue: 3,
        unit: 'workouts',
        cadence: 'weekly',
      },
    ],
  },
  {
    id: 'new-semester',
    label: 'New semester',
    description: 'A fresh term is starting — set the pace before the syllabus does it for you.',
    templates: [
      {
        title: 'Stick to a semester budget',
        lifeArea: 'finance',
        metricType: 'numeric',
        targetValue: 1,
        unit: 'budget check-ins',
        cadence: 'weekly',
      },
      {
        title: 'Scripture study',
        lifeArea: 'spiritual',
        metricType: 'streak',
        targetValue: 1,
        unit: 'days',
        cadence: 'daily',
      },
      {
        title: 'Study without phone distractions',
        lifeArea: 'mental',
        metricType: 'numeric',
        targetValue: 5,
        unit: 'hours',
        cadence: 'weekly',
      },
      {
        title: 'Attend a club, ward, or study group activity',
        lifeArea: 'social',
        metricType: 'count',
        targetValue: 1,
        unit: 'activities',
        cadence: 'weekly',
      },
      {
        title: 'Walk to class instead of driving',
        lifeArea: 'physical',
        metricType: 'count',
        targetValue: 4,
        unit: 'walks',
        cadence: 'weekly',
      },
    ],
  },
  {
    id: 'new-year-reset',
    label: 'New year reset',
    description: 'A clean calendar page — pick one honest goal per life area and start small.',
    templates: [
      {
        title: 'Save toward a year-end goal',
        lifeArea: 'finance',
        metricType: 'currency',
        targetValue: 2000,
        unit: '$',
        cadence: 'monthly',
      },
      {
        title: 'Meditation',
        lifeArea: 'spiritual',
        metricType: 'streak',
        targetValue: 1,
        unit: 'days',
        cadence: 'daily',
      },
      {
        title: 'Declutter the mental to-do list with a weekly review',
        lifeArea: 'mental',
        metricType: 'count',
        targetValue: 1,
        unit: 'reviews',
        cadence: 'weekly',
      },
      {
        title: 'Host or attend a gathering with friends',
        lifeArea: 'social',
        metricType: 'count',
        targetValue: 1,
        unit: 'gatherings',
        cadence: 'monthly',
      },
      {
        title: 'Mindfulness minutes',
        lifeArea: 'physical',
        metricType: 'count',
        targetValue: 10,
        unit: 'minutes',
        cadence: 'daily',
      },
    ],
  },
] as const;
