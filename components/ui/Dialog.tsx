import React from 'react';
import AccessibleDialog, { DialogProps as BaseDialogProps } from '../AccessibleDialog';

export type DialogProps = BaseDialogProps;

const Dialog: React.FC<DialogProps> = (props) => {
  return <AccessibleDialog {...props} />;
};

export default Dialog;
