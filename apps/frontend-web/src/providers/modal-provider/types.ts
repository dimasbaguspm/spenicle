export type ModalParams = Record<string, string | number> | null;

export type ModalState = Record<string, unknown> | null;

export type OpenModalOptions = {
  replace?: boolean;
  state?: ModalState;
};

export type OpenModalFunc = <Params extends ModalParams>(
  modalId: string,
  params?: Params,
  opts?: OpenModalOptions
) => void;
export type CloseModalFunc = () => void;

export interface ModalProviderModel<Params = ModalParams, State = ModalState> {
  isOpen: boolean;
  modalId: string | null;
  params: Params;
  state: State;
  openModal: OpenModalFunc;
  closeModal: CloseModalFunc;
}
