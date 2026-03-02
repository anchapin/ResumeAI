import React from 'react';
import AccessibleDialog, { AccessibleDialogProps } from '../AccessibleDialog';

export type DialogProps = AccessibleDialogProps;

const Dialog: React.FC<DialogProps> = (props) => {
  return <AccessibleDialog {...props} />;
};

export default Dialog;
