import { Drawer } from '../../../../components/drawer';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router';

export const TransactionFilterDrawer = () => {
  const { closeDrawer } = useDrawerRouterProvider();

  return (
    <Drawer onClose={closeDrawer} position="right" size="md">
      <div className="p-4">
        {/* TODO: Add filter form fields here */}
        <p className="text-slate-500 text-sm">Filter options coming soon.</p>
      </div>
    </Drawer>
  );
};
