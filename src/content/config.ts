import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()),
    readingTime: z.number(),
  }),
});

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    github: z.string().optional(),
    demo: z.string().optional(),
    status: z.enum(['Active', 'Beta', 'Stable']),
    featured: z.boolean().default(false),
    contributed: z.boolean().default(false),
  }),
});

export const collections = { blog, projects };
