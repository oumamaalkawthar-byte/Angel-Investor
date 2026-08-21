import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const portfolio = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/portfolio' }),
  schema: z.object({
    company: z.string(),
    logo: z.string().optional(),
    industry: z.string(),
    stage: z.string(),
    website: z.string().url().optional(),
    summary: z.string(),
    featured: z.boolean().default(false),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    author: z.string(),
    category: z.string().optional(),
    readTime: z.string().optional(),
    art: z.enum(['photo', 'valuation', 'traction', 'market', 'terms']).optional(),
    image: z.string().optional(),
  }),
});

export const collections = { portfolio, blog };
