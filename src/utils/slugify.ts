import kebabcase from "lodash.kebabcase";

export const slugifyStr = (str: string) => {
  str = str.replace("C++", "cpp");
  return kebabcase(str);
};

export const slugifyAll = (arr: string[]) => arr.map(str => slugifyStr(str));
