import base64SVG from '@filled-lucide/build-icons/utils/base64SVG';
import defineExportTemplate from '@filled-lucide/build-icons/utils/defineExportTemplate';
import { toCamelCase } from '@filled-lucide/helpers';

export default defineExportTemplate(
  async ({ componentName, iconName, children, getSvg, deprecated, deprecationReason }) => {
    const svgContents = await getSvg();
    const svgBase64 = base64SVG(svgContents);

    return `
import type { IconNode } from '../types';

/**
 * @name ${iconName}
 * @description Lucide Lab SVG icon node.
 *
 * @preview ![img](data:image/svg+xml;base64,${svgBase64}) - https://lucide.dev/icons/${iconName}
 * @see https://lucide.dev/guide/packages/lucide - Documentation
 *
 * @returns {Array}
 * ${deprecated ? `@deprecated ${deprecationReason}` : ''}
 */
const ${toCamelCase(componentName)}: IconNode = ${JSON.stringify(children)};

export default ${toCamelCase(componentName)};
`;
  },
);
