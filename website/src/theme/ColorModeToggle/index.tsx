import type { WrapperProps } from "@docusaurus/types";
import type ColorModeToggleType from "@theme/ColorModeToggle";
import ColorModeToggle from "@theme-original/ColorModeToggle";
import clsx from "clsx";
import React from "react";

type Props = WrapperProps<typeof ColorModeToggleType>;

export default function ColorModeToggleWrapper(
  props: Props,
): React.JSX.Element {
  return (
    <ColorModeToggle
      {...props}
      className={clsx(props.className, "color-mode-toggle")}
    />
  );
}
