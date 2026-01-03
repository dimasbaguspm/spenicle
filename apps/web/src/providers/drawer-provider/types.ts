export type DrawerParams = Record<string, string | number> | null;

export type DrawerState = Record<string, unknown> | null;

export type OpenDrawerOptions = {
  replace?: boolean;
  state?: DrawerState;
};

export type OpenDrawerFunc = <Params extends DrawerParams>(
  drawerId: string,
  params?: Params,
  opts?: OpenDrawerOptions
) => void;
export type CloseDrawerFunc = () => void;

export interface DrawerProviderModel<
  Params = DrawerParams,
  State = DrawerState
> {
  isOpen: boolean;
  drawerId: string | null;
  params: Params;
  state: State;
  openDrawer: OpenDrawerFunc;
  closeDrawer: CloseDrawerFunc;
}
