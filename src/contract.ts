// Browser-safe contract adapted from @speckub/schema 0.1.3 (Apache-2.0).
// Keep parity tests in discovery.test.ts when updating.
import { z } from 'zod';

export const SPEC_VERSION = 1 as const;

const httpMethodSchema = z.enum([
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS',
]);

const endpointIdSchema = z.string().regex(
  /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/,
  'Endpoint ID must use lowercase alphanumeric segments separated by dots or hyphens',
);

const sourcePathSchema = z.string().min(1).refine(
  (value) =>
    !value.startsWith('/') &&
    !value.includes('\\') &&
    !value.split('/').some((segment) => segment === '..' || segment === '.'),
  'Source paths must be repository-relative and must not traverse directories',
);

export const endpointSchema = z.object({
  speckub: z.literal(true).optional(),
  specVersion: z.literal(SPEC_VERSION),
  id: endpointIdSchema,
  kind: z.literal('http'),
  method: httpMethodSchema,
  path: z.string().startsWith('/').min(1),
  summary: z.string().trim().min(1),
  source: z.array(sourcePathSchema).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
}).superRefine((value, ctx) => {
  const pathParameters = [...value.path.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1]);
  if (pathParameters.some((name) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['path'], message: 'Invalid path parameter name' });
  }
  if (new Set(pathParameters).size !== pathParameters.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['path'], message: 'Duplicate path parameter' });
  }
});

export type EndpointSpec = z.infer<typeof endpointSchema>;
