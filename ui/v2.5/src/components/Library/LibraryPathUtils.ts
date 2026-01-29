export interface PathSegment {
  label: string;
  path: string;
}

export const getPathDelimiter = (path: string) =>
  path.includes("\\") ? "\\" : "/";

export const splitPath = (path: string) => {
  const delimiter = getPathDelimiter(path);
  const isAbsolute = path.startsWith(delimiter);
  const segments = path.split(/[\\/]/).filter(Boolean);
  return { delimiter, isAbsolute, segments };
};

export const buildPath = (
  segments: string[],
  delimiter: string,
  isAbsolute: boolean
) => {
  const joined = segments.join(delimiter);
  if (isAbsolute) {
    return `${delimiter}${joined}`.replace(`${delimiter}${delimiter}`, delimiter);
  }
  return joined;
};

export const getParentPath = (path: string) => {
  const { delimiter, isAbsolute, segments } = splitPath(path);
  if (segments.length <= 1) {
    return undefined;
  }
  return buildPath(segments.slice(0, -1), delimiter, isAbsolute);
};

export const getAncestorPaths = (path: string) => {
  const { delimiter, isAbsolute, segments } = splitPath(path);
  const ancestors: string[] = [];
  for (let index = 1; index < segments.length; index += 1) {
    ancestors.push(buildPath(segments.slice(0, index), delimiter, isAbsolute));
  }
  return ancestors;
};

export const getPathLabel = (path: string) => {
  const { segments } = splitPath(path);
  return segments[segments.length - 1] ?? path;
};

export const getBreadcrumbs = (path: string): PathSegment[] => {
  const { delimiter, isAbsolute, segments } = splitPath(path);
  return segments.map((segment, index) => {
    const builtPath = buildPath(
      segments.slice(0, index + 1),
      delimiter,
      isAbsolute
    );
    return { label: segment, path: builtPath };
  });
};
