import { Tab as BaseTab } from './tab';
import { TabContent } from './tab-content';
import { TabList } from './tab-list';
import { TabTrigger } from './tab-trigger';

type TabCompositionModel = {
  List: typeof TabList;
  Trigger: typeof TabTrigger;
  Content: typeof TabContent;
};

const TabComposition = {
  List: TabList,
  Trigger: TabTrigger,
  Content: TabContent,
} satisfies TabCompositionModel;

export const Tab = Object.assign(BaseTab, TabComposition);

export type { TabProps } from './tab';
export type { TabListProps } from './tab-list';
export type { TabTriggerProps } from './tab-trigger';
export type { TabContentProps } from './tab-content';
