import { Brand as BaseBrand } from './brand';
import { BrandIcon } from './components/brand-icon';
import { BrandText } from './components/brand-text';

type BrandCompositionModel = {
  Icon: typeof BrandIcon;
  Text: typeof BrandText;
};

const BrandComposition = {
  Icon: BrandIcon,
  Text: BrandText,
} satisfies BrandCompositionModel;

export const Brand = Object.assign(BaseBrand, BrandComposition);

// export only main component types from types.ts following standards
export type { BrandProps, BrandSize, BrandColor, BrandVariantProps, BrandPolymorphicProps } from './types';
