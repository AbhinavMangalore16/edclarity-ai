import { DialogCustom } from "@/components/custom/dialog-custom";
import { Button } from "@/components/ui/button";
import { JSX, useState, useCallback } from "react";

export const useConfirm = (
  title: string,
  description: string
): [() => JSX.Element, () => Promise<boolean>] => {
  const [promise, setPromise] = useState<{
    resolve: (value: boolean) => void;
  } | null>(null);

  // 🟢 Properly memoized confirm function
  const confirm = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      setPromise({ resolve });
    });
  }, []);

  const handleClose = useCallback(() => {
    setPromise(null);
  }, []);

  const handleConfirm = useCallback(() => {
    promise?.resolve(true);
    handleClose();
  }, [promise, handleClose]);

  const handleCancel = useCallback(() => {
    promise?.resolve(false);
    handleClose();
  }, [promise, handleClose]);

  const ConfirmDialog = useCallback(() => {
    return (
      <DialogCustom
        open={promise !== null}
        onOpenChange={handleClose}
        title={title}
        description={description}
      >
        <div className="pt-4 w-full flex flex-col-reverse gap-y-2 lg:flex-row gap-x-2 items-center justify-end">
          <Button onClick={handleCancel} variant="outline" className="w-full lg:w-auto">
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="w-full lg:w-auto">
            Confirm
          </Button>
        </div>
      </DialogCustom>
    );
  }, [promise, title, description, handleCancel, handleConfirm, handleClose]);

  return [ConfirmDialog, confirm];
};
