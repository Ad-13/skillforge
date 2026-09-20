import { BadRequestError } from "./errors.ts";

export const toSlug = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export const toSlugOrThrow = (value: string): string => {
  const slug = toSlug(value);

  if (slug.length === 0) {
    throw new BadRequestError(
      'A skill name must contain Latin letters or digits, for example "Angular" or "CI/CD"',
    );
  }

  return slug;
};
