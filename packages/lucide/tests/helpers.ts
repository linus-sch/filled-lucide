import fs from 'fs';
import path from 'path';
import { parseSync, stringify } from 'svgson';

const ICONS_DIR = path.resolve(__dirname, '../../../icons');

export const getOriginalSvg = (iconName: string, aliasName?: string, setAttrs = true) => {
  const svgContent = fs.readFileSync(path.join(ICONS_DIR, `${iconName}.svg`), 'utf8');
  const svgParsed = parseSync(svgContent);

  // The filled sources carry no stroke attributes, but the rendered icon keeps
  // the (inert) stroke defaults so `strokeWidth` stays a valid option.
  svgParsed.attributes = {
    ...svgParsed.attributes,
    stroke: 'none',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  };

  if (setAttrs) {
    svgParsed.attributes['data-lucide'] = aliasName ?? iconName;
    svgParsed.attributes['aria-hidden'] = 'true';
    svgParsed.attributes['class'] = `lucide lucide-${aliasName ?? iconName}`;
  }

  return stringify(svgParsed, { selfClose: false });
};
