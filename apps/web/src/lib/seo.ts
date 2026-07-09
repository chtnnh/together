export const siteUrl = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://together.chtnnhfoundation.org"
).replace(/\/$/, "");

export const foundationUrl = "https://chtnnhfoundation.org";
export const personalSiteUrl = "https://me.chtnnhfoundation.org";
export const githubUrl = "https://github.com/chtnnh/together";

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${normalizedPath}`;
}
